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

-- Hardening: signed-in users only; remove anon discoverability from the
-- GraphQL/PostgREST schema entirely (RLS already returns zero rows to anon —
-- this is defense in depth per advisor lint).
revoke all on public.achievement_reactions from anon;
