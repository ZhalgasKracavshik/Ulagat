-- Phase 17: Web Push subscriptions (PWA notifications). One row per browser
-- push endpoint. Read/written by its owner only; the server send path uses the
-- service-role client to read across users when delivering a notification.

create table public.push_subscriptions (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.profiles(id) on delete cascade,
    endpoint   text not null unique,
    p256dh     text not null,
    auth       text not null,
    user_agent text,
    created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;

-- Owner-only read.
create policy "push_select_own"
    on public.push_subscriptions for select
    to authenticated
    using (user_id = auth.uid());

-- Owner-only insert (a client can only register a subscription for itself).
create policy "push_insert_own"
    on public.push_subscriptions for insert
    to authenticated
    with check (user_id = auth.uid());

-- Owner-only delete (unsubscribe / prune from the client).
create policy "push_delete_own"
    on public.push_subscriptions for delete
    to authenticated
    using (user_id = auth.uid());

-- No UPDATE policy: rows are insert/delete only (re-subscribe replaces).

-- Signed-in-only table; drop anon discoverability entirely.
revoke all on public.push_subscriptions from anon;
