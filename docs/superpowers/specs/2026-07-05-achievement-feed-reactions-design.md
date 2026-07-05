# Achievement Feed + Reactions — Design

**Date:** 2026-07-05
**Status:** Approved (option A)

## Purpose

Let students see each other's verified achievements ("portfolio" visibility, Instagram-style)
and congratulate each other — without building a full social network. Scope was deliberately
narrowed with the user:

- Feed = compact block on `/home` (evening/full mode only). No separate `/feed` page, no
  people-discovery catalog.
- Content = existing **verified** achievements only. No free-form posts, no comments.
- Reactions = two positive kinds, **heart** and **clap**, rendered as SVG icons
  (lucide `Heart`, `HandMetal`/clap-style), NOT emoji. No negative reactions by design
  (school environment, anti-bullying).
- Privacy = existing `profiles.leaderboard_anonymous` flag is widened to mean
  "anonymous everywhere": leaderboard **and** feed show pseudonym + mask avatar,
  no profile link. Settings copy updated accordingly.

## Data model (1 migration: `achievement_reactions`)

```sql
create table public.achievement_reactions (
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('heart','clap')),
  created_at     timestamptz not null default now(),
  primary key (achievement_id, user_id, kind)
);
create index on public.achievement_reactions (achievement_id);
```

- One user may set both heart AND clap on the same achievement, but never the same kind twice
  (PK enforces).
- Reacting to your own achievement is allowed (Instagram semantics).

### RLS (FORCE)

- `SELECT`: any authenticated user.
- `INSERT`: `user_id = auth.uid()` AND target achievement is `status = 'verified'`
  (`EXISTS` subquery).
- `DELETE`: `user_id = auth.uid()` (un-toggle own reaction only).
- No `UPDATE` policy (rows are toggle-only).

## Server actions — `app/achievements/reactions-actions.ts`

- `toggleReaction(achievementId: string, kind: 'heart' | 'clap')`
  - auth check → `isUuid(achievementId)` → kind enum check.
  - If row exists → delete (untoggle); else insert. Errors surface as `{ error }`,
    RLS is the real enforcement layer.
  - `revalidatePath('/home')` and `revalidatePath('/profile/[id]', 'page')` as needed.

No MFA step-up (not a privileged/staff action).

## UI

### `/home` block — «Достижения школы» (evening mode only)

- Last ~5 verified achievements school-wide, newest first.
- Card: avatar (mask icon + pseudonym via existing `anonymousPseudonym(user.id)` when
  `leaderboard_anonymous`), full name (link to `/profile/[id]`; anonymous = plain text,
  no link, no grade), achievement title, tier badge (reuse leaderboard tier styling), date.
- Two reaction buttons with counts; active state when current user has reacted.
  Optimistic toggle on click.

### Profile achievements tab

- Same reaction buttons added to existing verified-achievement cards on `/profile/[id]`.

## i18n

New `feed.*` keys in `ru.ts`, `kk.ts`, `en.ts` (block title, empty state, reaction
aria-labels). Update settings privacy toggle copy to «Анонимность в рейтинге и ленте»
(+ kk/en equivalents).

## Explicit non-goals

- No separate feed page, no discovery catalog, no comments, no follower graph.
- No email/push notifications for reactions.
- No changes to achievement upload/verification flow.

## Verification

1. `tsc --noEmit` + `npm run build`.
2. Migration applied; Supabase advisors: 0 errors.
3. Adversarial RLS test (rolled-back DO block, student JWT):
   - insert reaction with `user_id != auth.uid()` → blocked;
   - insert reaction on a `pending` achievement → blocked;
   - delete someone else's reaction → 0 rows.
4. Manual e2e: toggle both kinds on/off from /home and profile; anonymous user shows
   pseudonym + no link in the feed.
