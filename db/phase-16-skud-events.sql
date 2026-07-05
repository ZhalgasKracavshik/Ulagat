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
