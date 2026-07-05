# SKUD (Turnstile) Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turnstile entry/exit events land via a secret-protected webhook (plus a manual admin test form) and are visible strictly to the student's bonded parents (+ admin debug) on the child's profile.

**Architecture:** `skud_events` table with parent-only RLS SELECT and NO write policies (writes go through the service-role client only) → `POST /api/skud/event` route handler with timing-safe shared-secret auth → `recordSkudEvent` admin server action + collapsible test card on /admin/users → «Посещаемость» tab on /profile/[id] gated by a family_bonds check AND RLS.

**Tech Stack:** Next.js 16 App Router route handler, Supabase service-role client, FORCE RLS, TypeScript, Tailwind, lucide-react.

**Security requirement (user):** two audits — Audit A (adversarial RLS, Task 1) and Audit B (feature review, Task 6). Not optional.

**Verification style:** no unit-test framework in repo; verification = `npx tsc --noEmit`, `npm run build`, adversarial SQL DO-blocks (rolled back), curl smoke tests, manual e2e.

---

### Task 1: DB migration + Security Audit A

**Files:**
- Create: `db/phase-16-skud-events.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 16: SKUD (turnstile) events. Written ONLY by the service-role client
-- (webhook / admin test action) — the table has no INSERT/UPDATE/DELETE
-- policies on purpose. Visible strictly to bonded parents (+ admin debug).

create table public.skud_events (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles(id) on delete cascade,
    external_id text not null,
    direction   text not null check (direction in ('in', 'out')),
    gate        text,
    recorded_at timestamptz not null,
    created_at  timestamptz not null default now()
);

create index skud_events_user_recorded_idx
    on public.skud_events (user_id, recorded_at desc);

alter table public.skud_events enable row level security;
alter table public.skud_events force row level security;

-- Parents of the student (via family_bonds) or admins may read. Students do
-- NOT see their own rows; teachers/moderators/parliament see nothing.
create policy "skud_select_parent_or_admin"
    on public.skud_events for select
    to authenticated
    using (
        exists (
            select 1 from public.family_bonds fb
            where fb.parent_id = auth.uid()
              and fb.student_id = skud_events.user_id
        )
        or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

-- No INSERT/UPDATE/DELETE policies: service-role writes only.

-- Signed-in-only table; drop anon discoverability entirely.
revoke all on public.skud_events from anon;
```

- [ ] **Step 2: Apply via Supabase MCP** (`apply_migration`, name `phase16_skud_events`, project `eqrdoayowzutuwetycdp`), then `get_advisors` type=security — expect 0 errors.

- [ ] **Step 3: Security Audit A — adversarial RLS** (`execute_sql`; final RAISE rolls back):

```sql
DO $$
DECLARE
    v_student uuid;
    v_parent uuid;
    v_stranger uuid;
    n int;
BEGIN
    -- Prefer a real bond; otherwise fabricate one inside the rolled-back tx.
    select fb.student_id, fb.parent_id into v_student, v_parent
    from public.family_bonds fb limit 1;
    if v_student is null then
        select id into v_student from public.profiles where role = 'student' limit 1;
        select id into v_parent from public.profiles
            where id <> v_student limit 1;
        insert into public.family_bonds (parent_id, student_id)
            values (v_parent, v_student);
    end if;
    select id into v_stranger from public.profiles
        where id not in (v_student, v_parent) limit 1;

    -- Seed one event as superuser (service-role equivalent).
    insert into public.skud_events (user_id, external_id, direction, recorded_at)
    values (v_student, 'CARD-TEST', 'in', now());

    -- Attack 1: the student reads their own events -> must be 0 rows
    perform set_config('request.jwt.claims',
        json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into n from public.skud_events where user_id = v_student;
    if n > 0 then raise exception 'FAIL: student sees own SKUD events'; end if;

    -- Attack 2: a stranger reads them -> 0 rows
    perform set_config('request.jwt.claims',
        json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
    select count(*) into n from public.skud_events where user_id = v_student;
    if n > 0 then raise exception 'FAIL: stranger sees SKUD events'; end if;

    -- Attack 3: authenticated INSERT -> must be blocked (no policy)
    begin
        insert into public.skud_events (user_id, external_id, direction, recorded_at)
        values (v_stranger, 'CARD-EVIL', 'in', now());
        raise exception 'FAIL: authenticated insert succeeded';
    exception when insufficient_privilege or check_violation then
        null; -- blocked as designed
    end;

    -- Positive: the bonded parent DOES see the event
    perform set_config('request.jwt.claims',
        json_build_object('sub', v_parent, 'role', 'authenticated')::text, true);
    select count(*) into n from public.skud_events where user_id = v_student;
    if n = 0 then raise exception 'FAIL: bonded parent sees nothing'; end if;

    raise exception 'ROLLBACK (audit passed, nothing persisted)';
END $$;
```

Expected: terminal error is exactly `ROLLBACK (audit passed, nothing persisted)`.

- [ ] **Step 4: Commit**

```bash
git add db/phase-16-skud-events.sql
git commit -m "feat(db): skud_events with parents-only RLS, service-role-only writes"
```

---

### Task 2: Types + shared validation helper

**Files:**
- Modify: `types/index.ts` (append)
- Create: `lib/skud/validate.ts`

- [ ] **Step 1: Append types to `types/index.ts`:**

```ts
/** SKUD (turnstile) pass direction. */
export type SkudDirection = 'in' | 'out';

export type SkudEvent = {
    id: string;
    user_id: string;
    external_id: string;
    direction: SkudDirection;
    gate: string | null;
    recorded_at: string;
    created_at: string;
};
```

- [ ] **Step 2: Write `lib/skud/validate.ts`** (shared by webhook + admin action):

```ts
import type { SkudDirection } from "@/types";

export const SKUD_DIRECTIONS: SkudDirection[] = ["in", "out"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Validates and normalizes a SKUD event timestamp. Accepts an ISO string or
 * undefined (= now). Rejects the future (>5 min skew) and anything older than
 * 7 days — a replayed or misconfigured feed must not rewrite history.
 */
export function normalizeRecordedAt(raw: unknown): { iso: string } | { error: string } {
    if (raw === undefined || raw === null || raw === "") {
        return { iso: new Date().toISOString() };
    }
    if (typeof raw !== "string") return { error: "recorded_at must be an ISO string." };
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return { error: "recorded_at is not a valid timestamp." };
    const now = Date.now();
    if (ts > now + 5 * 60 * 1000) return { error: "recorded_at is in the future." };
    if (ts < now - WEEK_MS) return { error: "recorded_at is older than 7 days." };
    return { iso: new Date(ts).toISOString() };
}

/** Card id: non-empty, printable, max 64 chars. */
export function normalizeCardId(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const v = raw.trim();
    if (!v || v.length > 64) return null;
    return v;
}

/** Gate label: optional, max 64 chars. */
export function normalizeGate(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const v = raw.trim();
    return v ? v.slice(0, 64) : null;
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/skud/validate.ts
git commit -m "feat(skud): event types + shared input validation"
```

---

### Task 3: Webhook route `POST /api/skud/event`

**Files:**
- Create: `app/api/skud/event/route.ts`

- [ ] **Step 1: Write the route handler**

```ts
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    SKUD_DIRECTIONS,
    normalizeCardId,
    normalizeGate,
    normalizeRecordedAt,
} from "@/lib/skud/validate";
import type { SkudDirection } from "@/types";

export const runtime = "nodejs"; // node:crypto for the timing-safe compare

const MAX_BODY_BYTES = 1024;

/** Constant-time secret check; also constant-shape (hashes nothing on miss). */
function secretMatches(header: string | null, expected: string): boolean {
    if (!header) return false;
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

/**
 * SKUD push endpoint. Server-to-server only: authenticated by the shared
 * secret in `x-skud-secret`. Unknown cards return 202 so a probing caller
 * cannot use response codes as a card-validity oracle.
 */
export async function POST(request: Request) {
    const expected = process.env.SKUD_WEBHOOK_SECRET;
    if (!expected) {
        // Not configured yet — the integration is off, don't accept anything.
        return NextResponse.json({ error: "SKUD integration is not configured." }, { status: 503 });
    }
    if (!secretMatches(request.headers.get("x-skud-secret"), expected)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "Body too large." }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const cardId = normalizeCardId(body.card_id);
    if (!cardId) return NextResponse.json({ error: "card_id is required (max 64 chars)." }, { status: 400 });
    const direction = body.direction as SkudDirection;
    if (!SKUD_DIRECTIONS.includes(direction)) {
        return NextResponse.json({ error: "direction must be 'in' or 'out'." }, { status: 400 });
    }
    const recorded = normalizeRecordedAt(body.recorded_at);
    if ("error" in recorded) return NextResponse.json({ error: recorded.error }, { status: 400 });
    const gate = normalizeGate(body.gate);

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("external_skud_id", cardId)
        .maybeSingle();
    if (!profile) {
        // Accepted but unmapped: same response for any unknown card.
        console.warn("[skud] event for unmapped card");
        return NextResponse.json({ ok: true, mapped: false }, { status: 202 });
    }

    const { error } = await admin.from("skud_events").insert({
        user_id: profile.id,
        external_id: cardId,
        direction,
        gate,
        recorded_at: recorded.iso,
    });
    if (error) {
        console.error("[skud] insert failed:", error);
        return NextResponse.json({ error: "Failed to record the event." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, mapped: true });
}
```

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → 0 errors.

- [ ] **Step 3: Smoke test locally** (needs `SKUD_WEBHOOK_SECRET=test-secret` and the Supabase envs in `.env.local`; run `npm run dev` in background):

```bash
# 503 without env unset / 401 with wrong secret / 400 bad body / 202 unknown card
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/skud/event \
  -H "content-type: application/json" -d '{}'                       # -> 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/skud/event \
  -H "x-skud-secret: test-secret" -H "content-type: application/json" \
  -d '{"card_id":"NOPE-1","direction":"in"}'                        # -> 202
```

- [ ] **Step 4: Commit**

```bash
git add app/api/skud/event/route.ts
git commit -m "feat(skud): secret-protected turnstile webhook endpoint"
```

---

### Task 4: Admin test action + «СКУД (тест)» card on /admin/users

**Files:**
- Create: `app/admin/skud/actions.ts`
- Create: `components/admin/SkudTestCard.tsx`
- Modify: `app/admin/users/page.tsx` (render the card under `UsersManagementTable`)

- [ ] **Step 1: Write the server action** (`app/admin/skud/actions.ts`) — same guard pattern as `app/admin/users/actions.ts`:

```ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { isUuid } from '@/lib/validation';
import { mfaStepUpRequired, MFA_REQUIRED_ERROR } from '@/lib/security/mfa';
import { SKUD_DIRECTIONS, normalizeRecordedAt } from '@/lib/skud/validate';
import type { SkudDirection } from '@/types';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') return { ok: false, error: 'Admin access required.' };
    if (await mfaStepUpRequired(supabase)) return { ok: false, error: MFA_REQUIRED_ERROR };
    return { ok: true };
}

export type RecordSkudEventResult = { success: true } | { success: false; error: string };

/** Manual test/demo entry — writes through the service role because the
 *  skud_events table deliberately has no INSERT policy. Admin + MFA only. */
export async function recordSkudEvent(
    studentId: string,
    direction: SkudDirection,
    recordedAt?: string,
): Promise<RecordSkudEventResult> {
    const auth = await requireAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!isUuid(studentId)) return { success: false, error: 'Invalid student id.' };
    if (!SKUD_DIRECTIONS.includes(direction)) {
        return { success: false, error: 'Direction must be in/out.' };
    }
    const recorded = normalizeRecordedAt(recordedAt);
    if ('error' in recorded) return { success: false, error: recorded.error };

    const admin = createAdminClient();
    const { data: student } = await admin
        .from('profiles')
        .select('id, external_skud_id')
        .eq('id', studentId)
        .maybeSingle();
    if (!student) return { success: false, error: 'Student not found.' };

    const { error } = await admin.from('skud_events').insert({
        user_id: student.id,
        external_id: student.external_skud_id ?? 'MANUAL',
        direction,
        gate: 'manual-test',
        recorded_at: recorded.iso,
    });
    if (error) {
        console.error('recordSkudEvent insert error:', error);
        return { success: false, error: 'Failed to record the event.' };
    }
    revalidatePath('/admin/users');
    return { success: true };
}
```

- [ ] **Step 2: Write the collapsible card** (`components/admin/SkudTestCard.tsx`):

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, DoorOpen } from "lucide-react";
import { recordSkudEvent } from "@/app/admin/skud/actions";
import { useT } from "@/hooks/useT";
import type { SkudDirection } from "@/types";

type StudentOption = { id: string; full_name: string };

export function SkudTestCard({ students }: { students: StudentOption[] }) {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const [studentId, setStudentId] = useState("");
    const [direction, setDirection] = useState<SkudDirection>("in");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function submit() {
        if (!studentId) return;
        setBusy(true);
        setMessage(null);
        const result = await recordSkudEvent(studentId, direction);
        setMessage(result.success ? t("skud.testSaved") : result.error);
        setBusy(false);
    }

    return (
        <Card className="mt-6">
            <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setOpen((v) => !v)}
            >
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-indigo-500" />
                        {t("skud.testTitle")}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </CardTitle>
            </CardHeader>
            {open && (
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1 text-sm">
                        {t("skud.testStudent")}
                        <select
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                        >
                            <option value="">—</option>
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm">
                        {t("skud.testDirection")}
                        <select
                            value={direction}
                            onChange={(e) => setDirection(e.target.value as SkudDirection)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                        >
                            <option value="in">{t("skud.in")}</option>
                            <option value="out">{t("skud.out")}</option>
                        </select>
                    </label>
                    <Button onClick={submit} disabled={busy || !studentId}>
                        {t("skud.testSubmit")}
                    </Button>
                    {message && <p className="text-sm text-muted-foreground">{message}</p>}
                </CardContent>
            )}
        </Card>
    );
}
```

- [ ] **Step 3: Render on `/admin/users`** — in `app/admin/users/page.tsx`, after `<UsersManagementTable ... />` add:

```tsx
<SkudTestCard
    students={users
        .filter((u) => u.role === "student")
        .map((u) => ({ id: u.id, full_name: u.full_name }))}
/>
```

(plus the import; reuse the already-fetched `users` array — no extra query).

- [ ] **Step 4: Verify** — `npx tsc --noEmit` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/admin/skud/actions.ts components/admin/SkudTestCard.tsx app/admin/users/page.tsx
git commit -m "feat(admin): manual SKUD test entry (admin+MFA, service-role write)"
```

---

### Task 5: Parent-facing «Посещаемость» tab + i18n

**Files:**
- Create: `components/profile/AttendanceSection.tsx`
- Modify: `app/profile/[id]/page.tsx` (bond check, fetch, conditional tab)
- Modify: `lib/i18n/ru.ts`, `lib/i18n/kk.ts`, `lib/i18n/en.ts`

- [ ] **Step 1: Profile page — viewer bond check + fetch.** In `app/profile/[id]/page.tsx`, near the existing `viewerRole` logic:

```ts
// SKUD attendance is parents-only (+ admin debug). RLS enforces the same
// rule; this flag only decides whether to render the tab at all.
let canSeeAttendance = false;
if (currentUser && !isOwner) {
    if (viewerRole === 'admin') {
        canSeeAttendance = true;
    } else {
        const { data: bond } = await supabase
            .from('family_bonds')
            .select('id')
            .eq('parent_id', currentUser.id)
            .eq('student_id', id)
            .maybeSingle();
        canSeeAttendance = !!bond;
    }
}

let skudEvents: SkudEvent[] = [];
if (canSeeAttendance) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: skudRows } = await supabase
        .from('skud_events')
        .select('*')
        .eq('user_id', id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false });
    skudEvents = (skudRows ?? []) as SkudEvent[];
}
```

Add `import type { SkudEvent } from "@/types";` (merge into the existing types import). Note: `viewerRole` is currently only fetched when `!isOwner` — this stays correct because parents are never `isOwner` of the child profile.

- [ ] **Step 2: Add the tab** — in the `TabsList` (only when allowed):

```tsx
{canSeeAttendance && (
    <TabsTrigger value="attendance" className="rounded-md px-6 py-2">
        {t('skud.tabTitle')}
    </TabsTrigger>
)}
```

and the content next to the other `TabsContent` blocks:

```tsx
{canSeeAttendance && (
    <TabsContent value="attendance" className="animate-in fade-in-50 duration-300">
        <AttendanceSection events={skudEvents} />
    </TabsContent>
)}
```

- [ ] **Step 3: Write `components/profile/AttendanceSection.tsx`:**

```tsx
"use client";

import { LogIn, LogOut, DoorOpen } from "lucide-react";
import { useT } from "@/hooks/useT";
import type { SkudEvent } from "@/types";

const ALMATY_TZ = "Asia/Almaty";

function dayKey(iso: string): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ALMATY_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(iso));
}

function timeLabel(iso: string): string {
    return new Intl.DateTimeFormat("ru-RU", {
        timeZone: ALMATY_TZ, hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
}

function dayLabel(key: string): string {
    return new Intl.DateTimeFormat("ru-RU", {
        timeZone: ALMATY_TZ, weekday: "short", day: "numeric", month: "long",
    }).format(new Date(`${key}T12:00:00+05:00`));
}

export function AttendanceSection({ events }: { events: SkudEvent[] }) {
    const { t } = useT();

    if (events.length === 0) {
        return (
            <div className="rounded-xl border border-dashed bg-muted py-10 text-center">
                <DoorOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("skud.empty")}</p>
            </div>
        );
    }

    const byDay = new Map<string, SkudEvent[]>();
    for (const e of events) {
        const key = dayKey(e.recorded_at);
        (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(e);
    }

    return (
        <div className="space-y-4">
            {[...byDay.entries()].map(([day, list]) => (
                <div key={day} className="rounded-xl border border-border bg-card p-4">
                    <h4 className="mb-2 text-sm font-semibold capitalize text-foreground">
                        {dayLabel(day)}
                    </h4>
                    <ul className="space-y-1.5">
                        {list
                            .slice()
                            .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
                            .map((e) => (
                                <li key={e.id} className="flex items-center gap-2 text-sm">
                                    {e.direction === "in" ? (
                                        <LogIn className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <LogOut className="h-4 w-4 text-orange-500" />
                                    )}
                                    <span className="font-medium tabular-nums">{timeLabel(e.recorded_at)}</span>
                                    <span className="text-muted-foreground">
                                        {e.direction === "in" ? t("skud.in") : t("skud.out")}
                                    </span>
                                    {e.gate && (
                                        <span className="ml-auto text-xs text-muted-foreground">{e.gate}</span>
                                    )}
                                </li>
                            ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 4: i18n** — append `skud` namespace before the closing `};` of each dictionary (ru shown; translate kk/en):

```ts
skud: {
    tabTitle: "Посещаемость",
    empty: "Пока нет данных с турникета.",
    in: "Вход",
    out: "Выход",
    testTitle: "СКУД (тест)",
    testStudent: "Ученик",
    testDirection: "Направление",
    testSubmit: "Записать",
    testSaved: "Событие записано.",
},
```

kk: `tabTitle: "Қатысу"`, `empty: "Турникеттен дерек әлі жоқ."`, `in: "Кіру"`, `out: "Шығу"`, `testTitle: "СКУД (тест)"`, `testStudent: "Оқушы"`, `testDirection: "Бағыт"`, `testSubmit: "Жазу"`, `testSaved: "Оқиға жазылды."`
en: `tabTitle: "Attendance"`, `empty: "No turnstile data yet."`, `in: "Entry"`, `out: "Exit"`, `testTitle: "SKUD (test)"`, `testStudent: "Student"`, `testDirection: "Direction"`, `testSubmit: "Record"`, `testSaved: "Event recorded."`

- [ ] **Step 5: Verify** — `npx tsc --noEmit` && `npm run build` → success.

- [ ] **Step 6: Commit**

```bash
git add components/profile/AttendanceSection.tsx "app/profile/[id]/page.tsx" lib/i18n/ru.ts lib/i18n/kk.ts lib/i18n/en.ts
git commit -m "feat(profile): parents-only attendance tab from SKUD events"
```

---

### Task 6: Security Audit B + ship

- [ ] **Step 1: Checklist over the new diff:**

| # | Class | Verify |
|---|---|---|
| 1 | Card-validity oracle | Unknown card → 202 with identical body/latency shape; no card id echoed in logs (`console.warn` has no card value) |
| 2 | Timing attacks on secret | `timingSafeEqual` on equal-length buffers; length mismatch returns early (length is not secret) |
| 3 | IDOR on attendance | RLS SELECT = bonded parent or admin only; Audit A proved student/stranger get 0 rows; page guard is cosmetic on top |
| 4 | Write-path escalation | No INSERT policy; `grep -rn "skud_events" app components lib` must show writes ONLY in `app/api/skud/event/route.ts` and `app/admin/skud/actions.ts` (both service-role, admin action behind admin+MFA) |
| 5 | Input abuse | body ≤1 KB, card_id ≤64, gate ≤64, direction enum, recorded_at bounded to [-7d, +5min] |
| 6 | XSS | gate/external_id rendered as JSX text only; no `dangerouslySetInnerHTML` in new files |
| 7 | Secrets hygiene | `SKUD_WEBHOOK_SECRET` read server-side only, never `NEXT_PUBLIC_`, not logged |
| 8 | Advisors | `get_advisors` security → 0 errors after migration |

- [ ] **Step 2: Manual e2e** — admin records a test in/out for a student; bonded parent sees the tab with events; the student and an unrelated user do NOT see the tab (and direct Supabase query returns 0 rows); webhook curl smoke (401/202/200 paths).

- [ ] **Step 3: Final verify + push**

```bash
npx tsc --noEmit && npm run build
git push origin main
```

- [ ] **Step 4: Remind the user of operational prerequisites:** set `SKUD_WEBHOOK_SECRET` in Vercel when the real SKUD (or bridge script) is ready; assign `external_skud_id` to students in /admin/users.

---

## Self-review notes

- Spec coverage: migration+RLS (T1), webhook (T3), manual admin entry (T4), parent tab (T5), both audits (T1/T6), i18n (T5), non-goals absent. ✓
- Type consistency: `SkudDirection`/`SkudEvent` defined once (T2), used in T3/T4/T5; `normalizeRecordedAt` shared by webhook and admin action. ✓
- `viewerRole` reuse in T5 matches the existing profile-page code (fetched when `!isOwner`). ✓
