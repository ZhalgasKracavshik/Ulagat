# Achievement Feed + Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** School-wide feed block on /home showing recent verified achievements with heart/clap SVG reactions, plus the same reactions on profile achievement cards.

**Architecture:** One new table `achievement_reactions` (PK achievement_id+user_id+kind, FORCE RLS), one server action `toggleReaction`, one shared client component `ReactionButtons`, a feed block in `FullDashboard`, data fetched server-side in `app/home/page.tsx` and `app/profile/[id]/page.tsx`.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS), TypeScript, Tailwind, lucide-react.

**Security requirement from user:** run TWO audits — Audit A (adversarial RLS, Task 1) and Audit B (full feature review vs July-2026 vulnerability classes, Task 7). No task is complete until its audit steps pass.

**Verification style:** this repo has no unit-test framework; verification = `npx tsc --noEmit`, `npm run build`, adversarial SQL DO-blocks (rolled back), manual e2e. Follow that convention.

---

### Task 1: DB migration + Security Audit A (adversarial RLS)

**Files:**
- Create: `db/phase-15-achievement-reactions.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 15: achievement reactions (heart / clap) for the /home feed.
-- One row per (achievement, user, kind). Toggle = insert/delete.

create table public.achievement_reactions (
    achievement_id uuid not null references public.achievements(id) on delete cascade,
    user_id        uuid not null references public.profiles(id) on delete cascade,
    kind           text not null check (kind in ('heart', 'clap')),
    created_at     timestamptz not null default now(),
    primary key (achievement_id, user_id, kind)
);

create index achievement_reactions_achievement_idx
    on public.achievement_reactions (achievement_id);

alter table public.achievement_reactions enable row level security;
alter table public.achievement_reactions force row level security;

-- Anyone signed in can see who reacted (counts are public inside the school).
create policy "reactions_select_authenticated"
    on public.achievement_reactions for select
    to authenticated
    using (true);

-- You may only react as yourself, and only to VERIFIED achievements.
create policy "reactions_insert_own_verified"
    on public.achievement_reactions for insert
    to authenticated
    with check (
        user_id = auth.uid()
        and exists (
            select 1 from public.achievements a
            where a.id = achievement_id and a.status = 'verified'
        )
    );

-- You may only remove your own reaction. No UPDATE policy at all.
create policy "reactions_delete_own"
    on public.achievement_reactions for delete
    to authenticated
    using (user_id = auth.uid());
```

- [ ] **Step 2: Apply via Supabase MCP** (`apply_migration`, name `phase15_achievement_reactions`) and run `get_advisors` — expect **0 errors** (warns triaged).

- [ ] **Step 3: Security Audit A — adversarial RLS test** (run via `execute_sql`; the final RAISE rolls everything back):

```sql
DO $$
DECLARE
    v_student uuid;
    v_other   uuid;
    v_verified uuid;
    v_pending  uuid;
    n int;
BEGIN
    select id into v_student from public.profiles where role = 'student' limit 1;
    select id into v_other   from public.profiles where id <> v_student limit 1;
    select id into v_verified from public.achievements where status = 'verified' limit 1;
    select id into v_pending  from public.achievements where status = 'pending'  limit 1;

    perform set_config('request.jwt.claims',
        json_build_object('sub', v_student, 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- Attack 1: react as someone else -> must be blocked
    begin
        insert into public.achievement_reactions (achievement_id, user_id, kind)
        values (v_verified, v_other, 'heart');
        raise exception 'FAIL: reacted as another user';
    exception when insufficient_privilege or check_violation then
        raise notice 'OK: impersonated reaction blocked';
    end;

    -- Attack 2: react to a PENDING achievement -> must be blocked
    if v_pending is not null then
        begin
            insert into public.achievement_reactions (achievement_id, user_id, kind)
            values (v_pending, v_student, 'heart');
            raise exception 'FAIL: reacted to pending achievement';
        exception when insufficient_privilege or check_violation then
            raise notice 'OK: pending-achievement reaction blocked';
        end;
    end if;

    -- Attack 3: invalid kind -> must be blocked by CHECK
    begin
        insert into public.achievement_reactions (achievement_id, user_id, kind)
        values (v_verified, v_student, 'dislike');
        raise exception 'FAIL: invalid kind accepted';
    exception when check_violation then
        raise notice 'OK: invalid kind blocked';
    end;

    -- Attack 4: delete another user's reaction -> 0 rows
    insert into public.achievement_reactions (achievement_id, user_id, kind)
    values (v_verified, v_student, 'clap');
    perform set_config('request.jwt.claims',
        json_build_object('sub', v_other, 'role', 'authenticated')::text, true);
    delete from public.achievement_reactions
        where achievement_id = v_verified and user_id = v_student;
    get diagnostics n = row_count;
    if n > 0 then raise exception 'FAIL: deleted foreign reaction'; end if;
    raise notice 'OK: foreign delete affected 0 rows';

    raise exception 'ROLLBACK (audit passed, nothing persisted)';
END $$;
```

Expected output: four `OK:` notices, then the rollback exception.

- [ ] **Step 4: Commit**

```bash
git add db/phase-15-achievement-reactions.sql
git commit -m "feat(db): achievement_reactions table with force RLS"
```

---

### Task 2: Types + server action `toggleReaction`

**Files:**
- Modify: `types/index.ts` (append)
- Create: `app/achievements/reactions-actions.ts`

- [ ] **Step 1: Add types** (append to `types/index.ts`):

```ts
export type ReactionKind = 'heart' | 'clap';

/** Aggregated reaction state for one achievement, shaped for the UI. */
export type AchievementReactions = {
    hearts: number;
    claps: number;
    myHeart: boolean;
    myClap: boolean;
};
```

- [ ] **Step 2: Write the action** (`app/achievements/reactions-actions.ts`):

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation";
import type { ReactionKind } from "@/types";

const KINDS: ReactionKind[] = ["heart", "clap"];

export type ToggleReactionResult =
    | { success: true; active: boolean }
    | { success: false; error: string };

/**
 * Toggles the caller's reaction of the given kind. Any authenticated user —
 * RLS enforces self-only rows and verified-only targets, so this action adds
 * no privilege of its own (no MFA step-up needed).
 */
export async function toggleReaction(
    achievementId: string,
    kind: ReactionKind,
): Promise<ToggleReactionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    if (!isUuid(achievementId)) return { success: false, error: "Invalid achievement id." };
    if (!KINDS.includes(kind)) return { success: false, error: "Invalid reaction kind." };

    // Try to remove first: if a row went away, this was an un-toggle.
    const { data: deleted, error: deleteError } = await supabase
        .from("achievement_reactions")
        .delete()
        .eq("achievement_id", achievementId)
        .eq("user_id", user.id)
        .eq("kind", kind)
        .select("achievement_id");
    if (deleteError) {
        console.error("toggleReaction delete error:", deleteError);
        return { success: false, error: "Failed to update the reaction." };
    }
    if (deleted && deleted.length > 0) {
        revalidatePath("/home");
        return { success: true, active: false };
    }

    const { error: insertError } = await supabase
        .from("achievement_reactions")
        .insert({ achievement_id: achievementId, user_id: user.id, kind });
    if (insertError) {
        // 23505: double-click race — the reaction already exists, treat as on.
        if (insertError.code === "23505") return { success: true, active: true };
        // RLS rejects pending/foreign targets with a permission error.
        console.error("toggleReaction insert error:", insertError);
        return { success: false, error: "Failed to update the reaction." };
    }

    revalidatePath("/home");
    return { success: true, active: true };
}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit` → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts app/achievements/reactions-actions.ts
git commit -m "feat(achievements): toggleReaction server action"
```

---

### Task 3: `ReactionButtons` client component (heart + custom clap SVG)

**Files:**
- Create: `components/achievements/ReactionButtons.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleReaction } from "@/app/achievements/reactions-actions";
import { useT } from "@/lib/i18n";
import type { AchievementReactions, ReactionKind } from "@/types";

/** Clapping-hands outline icon — lucide has no clap glyph, so we ship our own
 *  in the same 24px / stroke-2 style (user explicitly wants SVG, not emoji). */
function ClapIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M11 21c-2.5 0-4.6-1-6-2.6L2.6 15c-.8-1-.7-2.4.2-3.2.9-.8 2.2-.7 3 .2" />
            <path d="M5.8 12 3.3 8.9c-.8-1-.6-2.4.4-3.1 1-.8 2.3-.6 3.1.4l4.5 5.6" />
            <path d="M7.1 6.9 6.2 5.7c-.8-1-.6-2.4.4-3.1 1-.8 2.3-.6 3.1.4l4.8 6" />
            <path d="M13.4 6.9c-.4-1.2 0-2.5 1.1-3.1 1.1-.6 2.5-.2 3.1.9l3 5.5c1.7 3.1.9 7-1.9 9.2-2 1.6-4.7 1.9-7 .9" />
        </svg>
    );
}

type Props = {
    achievementId: string;
    initial: AchievementReactions;
    /** Compact = smaller paddings for dense feed rows. */
    compact?: boolean;
};

export default function ReactionButtons({ achievementId, initial, compact }: Props) {
    const { t } = useT();
    const [state, setState] = useState(initial);
    const [, startTransition] = useTransition();

    function toggle(kind: ReactionKind) {
        // Optimistic flip; reconciled (or rolled back) with the action result.
        setState((s) => flip(s, kind));
        startTransition(async () => {
            const result = await toggleReaction(achievementId, kind);
            if (!result.success) setState((s) => flip(s, kind)); // roll back
        });
    }

    const base = `inline-flex items-center gap-1 rounded-full border transition-colors ${
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    }`;

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => toggle("heart")}
                aria-label={t("feed.heartAria")}
                aria-pressed={state.myHeart}
                className={`${base} ${
                    state.myHeart
                        ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                        : "border-border text-muted-foreground hover:text-rose-600 hover:border-rose-300"
                }`}
            >
                <Heart className={compact ? "w-3.5 h-3.5" : "w-4 h-4"}
                    fill={state.myHeart ? "currentColor" : "none"} />
                {state.hearts > 0 && <span>{state.hearts}</span>}
            </button>
            <button
                type="button"
                onClick={() => toggle("clap")}
                aria-label={t("feed.clapAria")}
                aria-pressed={state.myClap}
                className={`${base} ${
                    state.myClap
                        ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                        : "border-border text-muted-foreground hover:text-amber-600 hover:border-amber-300"
                }`}
            >
                <ClapIcon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                {state.claps > 0 && <span>{state.claps}</span>}
            </button>
        </div>
    );
}

function flip(s: AchievementReactions, kind: ReactionKind): AchievementReactions {
    if (kind === "heart") {
        return { ...s, myHeart: !s.myHeart, hearts: s.hearts + (s.myHeart ? -1 : 1) };
    }
    return { ...s, myClap: !s.myClap, claps: s.claps + (s.myClap ? -1 : 1) };
}
```

Note: check how other client components import `useT` (`from "@/lib/i18n"` vs a context path) and match the repo pattern exactly.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/achievements/ReactionButtons.tsx
git commit -m "feat(achievements): heart/clap reaction buttons (custom SVG)"
```

---

### Task 4: Feed data + reactions aggregation helper

**Files:**
- Create: `lib/achievements/feed.ts`

- [ ] **Step 1: Write the shared fetch/aggregate helper** (used by /home and profile):

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementReactions } from "@/types";

export type FeedAchievement = {
    id: string;
    title: string;
    tier: "school" | "city" | "national";
    achievement_date: string | null;
    created_at: string;
    user_id: string;
    author_name: string;
    author_avatar: string | null;
    author_anonymous: boolean;
    reactions: AchievementReactions;
};

/** Aggregates reaction rows into per-achievement UI state for `viewerId`. */
export function aggregateReactions(
    rows: { achievement_id: string; user_id: string; kind: string }[],
    achievementIds: string[],
    viewerId: string,
): Map<string, AchievementReactions> {
    const map = new Map<string, AchievementReactions>();
    for (const id of achievementIds) {
        map.set(id, { hearts: 0, claps: 0, myHeart: false, myClap: false });
    }
    for (const r of rows) {
        const agg = map.get(r.achievement_id);
        if (!agg) continue;
        if (r.kind === "heart") {
            agg.hearts += 1;
            if (r.user_id === viewerId) agg.myHeart = true;
        } else if (r.kind === "clap") {
            agg.claps += 1;
            if (r.user_id === viewerId) agg.myClap = true;
        }
    }
    return map;
}

/** Last N verified achievements school-wide, with author + reactions. */
export async function fetchAchievementFeed(
    supabase: SupabaseClient,
    viewerId: string,
    limit = 5,
): Promise<FeedAchievement[]> {
    const { data: achievements } = await supabase
        .from("achievements")
        .select("id, title, tier, achievement_date, created_at, user_id, profiles(full_name, avatar_url, leaderboard_anonymous)")
        .eq("status", "verified")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (!achievements || achievements.length === 0) return [];

    const ids = achievements.map((a) => a.id as string);
    const { data: reactionRows } = await supabase
        .from("achievement_reactions")
        .select("achievement_id, user_id, kind")
        .in("achievement_id", ids);
    const reactions = aggregateReactions(reactionRows ?? [], ids, viewerId);

    return achievements.map((a) => {
        // Supabase typing returns the joined row as unknown-ish; narrow it.
        const p = (Array.isArray(a.profiles) ? a.profiles[0] : a.profiles) as
            | { full_name: string | null; avatar_url: string | null; leaderboard_anonymous: boolean | null }
            | null;
        return {
            id: a.id as string,
            title: (a.title as string) ?? "",
            tier: (a.tier as FeedAchievement["tier"]) ?? "school",
            achievement_date: (a.achievement_date as string | null) ?? null,
            created_at: a.created_at as string,
            user_id: a.user_id as string,
            author_name: p?.full_name ?? "",
            author_avatar: p?.avatar_url ?? null,
            author_anonymous: p?.leaderboard_anonymous === true,
            reactions: reactions.get(a.id as string)!,
        };
    });
}
```

Note: if the `achievements → profiles` FK join errors at runtime (no FK alias), replace the embedded select with a second `.in('id', userIds)` query on `profiles` and stitch in JS — keep the return shape identical.

- [ ] **Step 2: Verify** — `npx tsc --noEmit` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/achievements/feed.ts
git commit -m "feat(achievements): shared feed fetch + reaction aggregation"
```

---

### Task 5: /home feed block («Достижения школы», evening mode)

**Files:**
- Create: `components/home/AchievementFeed.tsx`
- Modify: `app/home/page.tsx` (fetch + pass `feed` into full-mode data)
- Modify: `components/home/HomeView.tsx` and `components/home/FullDashboard.tsx` (thread the prop, render after the events/services grid, ~line 479)

- [ ] **Step 1: Write the feed block component**

```tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VenetianMask, Trophy } from "lucide-react";
import ReactionButtons from "@/components/achievements/ReactionButtons";
import { anonymousPseudonym } from "@/lib/leaderboard";
import { useT } from "@/lib/i18n";
import type { FeedAchievement } from "@/lib/achievements/feed";

const TIER_STYLES: Record<string, string> = {
    school: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    city: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    national: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export default function AchievementFeed({ items }: { items: FeedAchievement[] }) {
    const { t } = useT();
    if (items.length === 0) return null; // empty pilot DB: hide the block entirely

    return (
        <section>
            <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <Trophy className="w-5 h-5 text-amber-500" />
                {t("feed.title")}
            </h2>
            <div className="space-y-2">
                {items.map((a) => {
                    const anon = a.author_anonymous;
                    const name = anon ? anonymousPseudonym(a.user_id) : a.author_name;
                    return (
                        <div key={a.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-3">
                            <Avatar className="w-9 h-9 shrink-0">
                                {!anon && a.author_avatar && <AvatarImage src={a.author_avatar} />}
                                <AvatarFallback>
                                    {anon
                                        ? <VenetianMask className="w-4 h-4 text-muted-foreground" />
                                        : name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                {anon ? (
                                    <span className="text-sm font-medium">{name}</span>
                                ) : (
                                    <Link href={`/profile/${a.user_id}`}
                                        className="text-sm font-medium hover:underline">
                                        {name}
                                    </Link>
                                )}
                                <p className="text-sm text-muted-foreground truncate">
                                    {a.title}
                                    <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_STYLES[a.tier]}`}>
                                        {t(`feed.tier.${a.tier}`)}
                                    </span>
                                </p>
                            </div>
                            <ReactionButtons achievementId={a.id} initial={a.reactions} compact />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
```

- [ ] **Step 2: Fetch in `app/home/page.tsx`** — alongside the existing parallel fetches:

```ts
import { fetchAchievementFeed } from "@/lib/achievements/feed";
// inside the page, after `user` is known:
const feed = await fetchAchievementFeed(supabase, user.id, 5);
// add `feed` to the object passed into <HomeView> full-mode data
```

- [ ] **Step 3: Thread the prop and render** — add `feed: FeedAchievement[]` to the FullDashboard data type; in `FullDashboard.tsx` render `<AchievementFeed items={data.feed} />` as a new `<section>` after the events/services grid (after ~line 479), matching sibling section markup.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` && `npm run build` → success.

- [ ] **Step 5: Commit**

```bash
git add components/home/AchievementFeed.tsx components/home/FullDashboard.tsx components/home/HomeView.tsx app/home/page.tsx
git commit -m "feat(home): school achievement feed with reactions"
```

---

### Task 6: Profile cards + i18n + settings copy

**Files:**
- Modify: `app/profile/[id]/page.tsx` (fetch reactions for the visible achievements)
- Modify: `components/profile/AchievementsSection.tsx` (render `ReactionButtons` on verified cards)
- Modify: `lib/i18n/ru.ts`, `lib/i18n/kk.ts`, `lib/i18n/en.ts`

- [ ] **Step 1: Profile page** — after achievements are fetched, aggregate reactions with the Task 4 helper and pass a `reactionsById` map (plain object — props must be serializable) into `AchievementsSection`:

```ts
import { aggregateReactions } from "@/lib/achievements/feed";
// ids of achievements being passed to the section:
const achievementIds = achievements.map((a) => a.id);
const { data: reactionRows } = await supabase
    .from("achievement_reactions")
    .select("achievement_id, user_id, kind")
    .in("achievement_id", achievementIds);
const reactionsById = Object.fromEntries(
    aggregateReactions(reactionRows ?? [], achievementIds, viewer.id),
);
```

- [ ] **Step 2: AchievementsSection** — add prop `reactionsById?: Record<string, AchievementReactions>`; inside the card `CardContent`, for `a.status === 'verified'` render:

```tsx
{a.status === "verified" && reactionsById?.[a.id] && (
    <div className="mt-3">
        <ReactionButtons achievementId={a.id} initial={reactionsById[a.id]} />
    </div>
)}
```

- [ ] **Step 3: i18n** — add to all three dictionaries (values below are ru; translate for kk/en):

```ts
feed: {
    title: "Достижения школы",
    heartAria: "Поставить сердечко",
    clapAria: "Поаплодировать",
    tier: { school: "Школьный", city: "Городской", national: "Республиканский" },
},
```

Also grep the settings dictionaries for the leaderboard-anonymity label (`leaderboard_anonymous` toggle copy) and widen it to «Анонимность в рейтинге и ленте» (kk/en equivalents), because the flag now also masks the feed.

- [ ] **Step 4: Verify** — `npx tsc --noEmit` && `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add app/profile/[id]/page.tsx components/profile/AchievementsSection.tsx lib/i18n/ru.ts lib/i18n/kk.ts lib/i18n/en.ts
git commit -m "feat(profile): reactions on achievement cards + feed i18n"
```

---

### Task 7: Security Audit B (full feature review, July-2026 classes) + ship

**Files:** review-only; fixes as needed.

- [ ] **Step 1: Run the checklist against the diff (`git diff main...HEAD` if branched, else the last 6 commits):**

| # | Vulnerability class (2026) | What to verify in THIS feature |
|---|---|---|
| 1 | IDOR/BOLA via direct PostgREST | Reactions RLS: Audit A passed; achievement ids are UUIDv4 (non-enumerable) |
| 2 | Server Action CSRF / origin bypass | Next 16 enforces same-origin on actions; confirm no custom `allowedOrigins` weakening in `next.config.ts` |
| 3 | Stored XSS via user content | Feed renders `title`/`full_name` as JSX text (auto-escaped); confirm NO `dangerouslySetInnerHTML` in new files |
| 4 | Race conditions | Double-toggle → PK 23505 handled as success; verify no counter columns exist to desync |
| 5 | Enum/type injection | `kind` checked in action AND by DB CHECK; `isUuid` before queries |
| 6 | Privilege escalation | Action adds no privilege (no admin client used); verify no service-role import in new files: `grep -r "supabase/admin" app/achievements/reactions-actions.ts lib/achievements components/achievements` → empty |
| 7 | Anonymity leak | Feed: anonymous → pseudonym, mask, NO link, no grade. Note: `achievements.user_id` is already readable by any authenticated user today (existing, accepted — UI-level anonymity, same as leaderboard) |
| 8 | Abuse/spam (reaction flapping) | Bounded: one row per (user, achievement, kind); worst case is toggle churn — acceptable, no email/push fan-out exists |
| 9 | Supabase advisors | `get_advisors` after migration: 0 errors |
| 10 | Dependency surface | No new npm packages added — nothing to audit |

Fix anything found; re-run the relevant audit step after each fix.

- [ ] **Step 2: Manual e2e** — as a student: toggle heart+clap on /home and on a profile, refresh (state persists), un-toggle; as an anonymous-flagged user: verify pseudonym + mask + no link in the feed.

- [ ] **Step 3: Final verify + push**

```bash
npx tsc --noEmit && npm run build
git push
```

---

## Self-review notes

- Spec coverage: feed block (T5), reactions both surfaces (T3/T5/T6), privacy widening (T5 anon rendering + T6 settings copy), RLS + audits (T1/T7), i18n (T6). No separate feed page / discovery / comments — correctly absent.
- `AchievementReactions` shape is defined once (T2) and used in T3/T4/T6 consistently; `aggregateReactions` returns `Map`, converted to plain object at the profile server/client boundary (T6) — serialization handled.
- Two audits explicitly required by the user are Tasks 1.3 and 7.1 — execution must not skip them.
