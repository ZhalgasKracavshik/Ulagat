# SKUD (Turnstile) Integration — Design

**Date:** 2026-07-05
**Status:** Approved (option A — shared-secret webhook)

## Purpose

Record school entry/exit events from the turnstile (СКУД) and show them to
**parents only**. Decisions confirmed with the user:

- **Source unknown yet** → build a universal `POST /api/skud/event` webhook with a
  shared secret, plus a manual admin entry form for testing/demo until the real
  SKUD system (or a bridge script on a school PC) is wired up.
- **Visibility: strictly parents** of the student (via `family_bonds`), plus
  `admin` for debugging. The student does NOT see their own events; teachers,
  moderators, parliament see nothing.
- **No email notifications** — UI only (volume would blow the free Resend tier;
  can be revisited later as a premium option).

## Existing foundation (do not rebuild)

- `profiles.external_skud_id TEXT` exists (phase-0); admins assign it in
  `/admin/users`; audit3 RLS pins it against self-tampering.
- `family_bonds (parent_id, student_id)` exists with RLS.

## Data model (1 migration: `skud_events`)

```sql
create table public.skud_events (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.profiles(id) on delete cascade,
    external_id text not null,               -- raw card id as sent by the SKUD
    direction   text not null check (direction in ('in','out')),
    gate        text,                        -- turnstile name, optional
    recorded_at timestamptz not null,        -- when the pass happened
    created_at  timestamptz not null default now()
);
create index skud_events_user_recorded_idx
    on public.skud_events (user_id, recorded_at desc);
```

### RLS (FORCE)

- `SELECT`: caller is a **parent bonded to the student** —
  `exists (select 1 from family_bonds fb where fb.parent_id = auth.uid()
  and fb.student_id = skud_events.user_id)` — **or** caller's profile role is
  `admin` (debug access).
- **No INSERT / UPDATE / DELETE policies at all.** Rows are written exclusively
  by the webhook and the admin server action through the service-role client
  (bypasses RLS). `revoke all ... from anon` as usual hardening.

## Webhook — `POST /api/skud/event`

- Auth: header `x-skud-secret` compared to env `SKUD_WEBHOOK_SECRET` with a
  **timing-safe comparison**. Missing env → endpoint returns 503 (disabled).
  Wrong/missing secret → 401.
- Body (JSON, size-capped ~1 KB):
  `{ card_id: string (1..64), direction: 'in'|'out', gate?: string (<=64), recorded_at?: ISO }`
  `recorded_at` defaults to now; reject timestamps in the future or older than 7 days.
- Lookup `profiles.external_skud_id = card_id` via service-role client.
  - Match → insert `skud_events` row, return 200 `{ok: true}`.
  - **No match → log + return 202** (accepted-but-unmapped): a probing attacker
    cannot distinguish valid card ids from invalid ones.
- No Upstash rate limit (secret-gated, server-to-server), but body size is capped
  and malformed JSON returns 400.

## Manual admin entry (test/demo path)

Server action `recordSkudEvent(studentId, direction, recordedAt?)` in
`app/admin/skud/actions.ts`:
- `requireAdmin()` + MFA step-up (same guard pattern as `app/admin/users/actions.ts`).
- Validates `isUuid(studentId)`, direction enum, timestamp bounds (same as webhook).
- Writes via service-role client (table has no INSERT policy by design).
- Small UI section on `/admin/users` (or its own card): student picker, in/out,
  optional time; default "now".

## Parent-facing UI

New tab «Посещаемость» on the child's profile page (`/profile/[id]`):
- Rendered **only** when the server page confirms the viewer is a bonded parent
  of that profile (query `family_bonds`) or an admin. Others never see the tab.
- Content: last 14 days of events grouped by day (Almaty time): date, entry
  time(s) with «вход» arrow-in icon, exit time(s) with «выход» arrow-out icon, gate.
- Data fetched server-side with the viewer's RLS-scoped client — even if the
  page guard had a bug, RLS returns zero rows to non-parents.
- Empty state: «Пока нет данных с турникета».

## i18n

`skud.*` keys in ru/kk/en: tab title, in/out labels, gate label, empty state,
admin form labels.

## Security verification (both audits required)

1. **Audit A (adversarial RLS, rolled-back DO block):**
   - student reads own events → 0 rows;
   - unrelated parent reads them → 0 rows;
   - bonded parent reads them → rows visible;
   - `insert` under `authenticated` role → blocked (no policy).
2. **Audit B (feature review):** timing-safe secret compare; 202-on-unknown-card
   (no card-validity oracle); body size cap; timestamp bounds; no
   `dangerouslySetInnerHTML`; service-role used only in route handler + admin
   action; advisors 0 errors; `tsc` + `npm run build` clean.

## Explicit non-goals

- Email/push notifications on entry/exit.
- Staff-wide attendance dashboards or lateness detection.
- HMAC-signed webhooks (upgrade path if the school's SKUD supports it).

## Operational prerequisites (user)

- Set `SKUD_WEBHOOK_SECRET` in Vercel env (long random string) when connecting
  the real SKUD; share it with whoever configures the school-side push.
- Assign `external_skud_id` to students in `/admin/users`.
