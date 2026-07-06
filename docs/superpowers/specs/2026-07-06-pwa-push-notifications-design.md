# PWA Push Notifications — Design

**Date:** 2026-07-06
**Status:** Approved

## Purpose

Deliver web-push notifications for three events so users learn about them even
though phones are confiscated during the day (they check morning/evening):
**official announcements**, **certificate ready**, and **event reminders**.
Push is **additive to email**, env-gated (no VAPID keys → silently off) and
fail-safe (a push failure never breaks the underlying mutation).

## Hard platform constraint

iOS Safari only delivers Web Push to a PWA that the user **installed to the home
screen** (iOS 16.4+). So the app must be an installable PWA (manifest + service
worker), and the subscribe UI on iOS shows "Add to Home Screen" instructions
instead of a permission button when not running standalone. Android/desktop
subscribe directly in-browser.

## Components

### 1. Installable PWA shell
- `public/manifest.webmanifest`: name "Ulagat", short_name "Ulagat", `start_url "/home"`,
  `display "standalone"`, `theme_color`/`background_color`, icons 192 + 512
  (one `purpose "maskable"`).
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`.
- Wire `manifest`, `themeColor`, `appleWebApp` into `app/layout.tsx` metadata.

### 2. Service worker — `public/sw.js`
- `push` event → `showNotification(title, { body, data.url, icon, badge })`.
- `notificationclick` → focus an existing client on that URL or `openWindow(url)`.
- Registered client-side after load by a small `PushManager` component.

### 3. VAPID keys (env)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (client subscribe), `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT` (`mailto:`). Dependency: `web-push`.

### 4. Data model — `push_subscriptions` (migration)
```sql
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
```
FORCE RLS: a user may `select`/`insert`/`delete` **only their own** rows
(`user_id = auth.uid()`); no `update`. Server send path uses the service-role
client. `revoke all ... from anon`.

### 5. Subscribe/unsubscribe
- Client component `components/settings/PushToggle.tsx` in `/settings`:
  detects support + iOS-standalone; requests `Notification.permission`;
  `registration.pushManager.subscribe({ userVisibleOnly: true,
  applicationServerKey: <VAPID public> })`; POSTs the subscription JSON to a
  server action.
- Server actions `app/settings/push-actions.ts`:
  `savePushSubscription(sub)` (auth → validate shape → upsert own row keyed by
  endpoint) and `removePushSubscription(endpoint)` (delete own row).

### 6. Sending — `lib/push/send.ts`
- `sendPushToUsers(userIds: string[], payload: PushPayload)`: service-role fetch
  of those users' subscriptions, `web-push.sendNotification` each, and **prune**
  subscriptions that return 404/410 (expired). Never throws to the caller;
  no-op when VAPID env is missing.
- Wire into:
  - `lib/notifications/announcement.ts` (targeted grades) → push on publish.
  - `app/certificates/actions.ts` `approveCertificate` → push the requester.
  - `app/api/cron/event-reminders/route.ts` → push each registrant.
- Payloads carry only a title, body, and a same-origin deep link (`/announcements`,
  `/certificates`, `/events/<id>`), never secrets.

### 7. i18n
`push.*` keys (settings toggle label/hint, enabled/blocked/ios-install states)
in ru/kk/en.

## Security

- Subscriptions are per-user RLS; only the owner can read/write theirs.
- Send path is service-role, server-only; VAPID private key server-only.
- Deep links are same-origin app paths; payload contains no PII beyond a short
  human title already visible to the recipient.
- Two audits: adversarial RLS on `push_subscriptions` + feature review
  (env-gating, fail-safe, no secret in client bundle beyond the public VAPID key,
  service-worker scope).

## Non-goals (v1)

- One global on/off, not per-event toggles.
- No substitutions push yet (same plumbing; add later).
- No notification history/inbox, no marketing pushes.

## Operational prerequisites (user)

- Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to
  Vercel env (values generated locally, already in `.env.local`).
