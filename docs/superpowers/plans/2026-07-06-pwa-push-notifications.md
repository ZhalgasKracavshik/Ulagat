# PWA Push Notifications Implementation Plan

> **For agentic workers:** implement task-by-task; steps use `- [ ]`.

**Goal:** Installable PWA with web-push for announcements, certificate-ready, and event reminders — additive to email, env-gated, fail-safe.

**Architecture:** manifest + service worker make the app installable; a `push_subscriptions` table (own-rows RLS) stores browser subscriptions; `lib/push/send.ts` sends via `web-push` (service role) and prunes dead endpoints; three existing notification paths gain a push call.

**Tech:** Next.js 16, Supabase (force RLS), `web-push`, Web Push API + Service Worker.

**Security:** two audits — Audit A (adversarial RLS on push_subscriptions), Audit B (feature review). Verification = `tsc --noEmit`, `npm run build`, rolled-back SQL DO-block, manual e2e.

---

### Task 1: DB migration + Audit A
- Create `db/phase-17-push-subscriptions.sql` — table above, FORCE RLS, own-rows select/insert/delete, no update, `revoke all from anon`, unique(endpoint).
- Apply via MCP `apply_migration` (`phase17_push_subscriptions`), `get_advisors` 0 errors.
- Audit A DO-block: as user A, insert own sub OK; select/delete another user's sub → 0 rows; insert with `user_id != auth.uid()` → blocked. Roll back.
- Commit.

### Task 2: types + web-push server helper
- `types/index.ts`: `PushSubscriptionRow`, `PushPayload {title, body, url}`.
- `lib/push/send.ts`: configure VAPID from env (guard missing → `pushEnabled()=false`); `sendPushToUsers(userIds, payload)` service-role fetch + `sendNotification`; prune 404/410; never throws.
- `tsc`; commit.

### Task 3: subscribe server actions
- `app/settings/push-actions.ts`: `savePushSubscription(subJson)` (auth, validate {endpoint, keys.p256dh, keys.auth} shape+lengths, upsert own row by endpoint), `removePushSubscription(endpoint)` (delete own).
- `tsc`; commit.

### Task 4: service worker + manifest + icons + layout
- `public/sw.js`: `push` → showNotification; `notificationclick` → focus/open url.
- `public/manifest.webmanifest` + `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (generated).
- `app/layout.tsx`: add `manifest`, `themeColor`, `appleWebApp`, icons to metadata.
- Commit.

### Task 5: PushToggle UI in settings + registration
- `components/settings/PushToggle.tsx`: feature-detect; iOS-not-standalone → show install hint; else permission + `pushManager.subscribe(applicationServerKey)` → `savePushSubscription`; toggle off → unsubscribe + `removePushSubscription`.
- Register the SW (in PushToggle mount or a tiny `components/pwa/RegisterSW.tsx` in layout).
- `push.*` i18n in ru/kk/en.
- `tsc` + `build`; commit.

### Task 6: wire sends into the three events
- `lib/notifications/announcement.ts`: after email, `sendPushToUsers(targetUserIds, {title, body, url:'/announcements'})`.
- `app/certificates/actions.ts` `approveCertificate`: push requester `{title, body, url:'/certificates'}`.
- `app/api/cron/event-reminders/route.ts`: push each registrant `{..., url:'/events/<id>'}`.
- Each wrapped so push failure is non-fatal.
- `tsc` + `build`; commit.

### Task 7: Audit B + ship
- Checklist: RLS own-rows (Audit A); VAPID private never in client bundle (`grep NEXT_PUBLIC` only public key); send path service-role + fail-safe + env-gated; SW scope `/`; payloads same-origin, no secrets; no `dangerouslySetInnerHTML`; advisors 0.
- Manual e2e (Android/desktop): enable in settings → trigger an announcement → notification arrives → click opens /announcements; disable → no more.
- `tsc && build && git push`.
- Remind user to set the 3 VAPID envs in Vercel.
