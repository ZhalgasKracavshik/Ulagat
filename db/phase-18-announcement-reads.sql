-- Phase 18: per-user read receipts for official announcements. One row per
-- (user, announcement) once the user has seen it. Drives the unread badge.

create table public.announcement_reads (
    user_id         uuid not null references public.profiles(id) on delete cascade,
    announcement_id uuid not null references public.announcements(id) on delete cascade,
    read_at         timestamptz not null default now(),
    primary key (user_id, announcement_id)
);

create index announcement_reads_user_idx on public.announcement_reads (user_id);

alter table public.announcement_reads enable row level security;
alter table public.announcement_reads force row level security;

-- Owner-only: a user can only see/create/clear their own read receipts.
create policy "areads_select_own"
    on public.announcement_reads for select
    to authenticated
    using (user_id = auth.uid());

create policy "areads_insert_own"
    on public.announcement_reads for insert
    to authenticated
    with check (user_id = auth.uid());

create policy "areads_delete_own"
    on public.announcement_reads for delete
    to authenticated
    using (user_id = auth.uid());

-- No UPDATE policy (rows are insert/delete only).

revoke all on public.announcement_reads from anon;
