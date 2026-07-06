import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushPayload } from "@/types";

/**
 * Web Push sender. Env-gated: without VAPID keys the whole thing is a no-op, so
 * the app never breaks when push isn't configured yet. Fail-safe: sending never
 * throws to the caller — a dead subscription or provider hiccup must not break
 * the announcement/certificate/reminder flow that triggered it.
 */

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@ulagat.app";

let configured = false;
if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
}

/** True when VAPID keys are present and sending will actually happen. */
export function pushEnabled(): boolean {
    return configured;
}

/**
 * Sends `payload` to every push subscription of the given users. Prunes any
 * subscription the push service reports as gone (404/410). Returns the number
 * of notifications successfully accepted. Never throws.
 */
export async function sendPushToUsers(
    userIds: string[],
    payload: PushPayload,
): Promise<number> {
    if (!configured || userIds.length === 0) return 0;

    const admin = createAdminClient();
    const { data: subs, error } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .in("user_id", Array.from(new Set(userIds)));
    if (error || !subs || subs.length === 0) {
        if (error) console.error("[push] load subscriptions failed:", error);
        return 0;
    }

    const body = JSON.stringify(payload);
    const deadIds: string[] = [];
    let sent = 0;

    await Promise.all(
        subs.map(async (s) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: s.endpoint as string,
                        keys: { p256dh: s.p256dh as string, auth: s.auth as string },
                    },
                    body,
                );
                sent += 1;
            } catch (err: unknown) {
                const status = (err as { statusCode?: number })?.statusCode;
                if (status === 404 || status === 410) {
                    // Subscription expired/unsubscribed — prune it.
                    deadIds.push(s.id as string);
                } else {
                    console.error("[push] send failed:", status ?? err);
                }
            }
        }),
    );

    if (deadIds.length > 0) {
        const { error: pruneError } = await admin
            .from("push_subscriptions")
            .delete()
            .in("id", deadIds);
        if (pruneError) console.error("[push] prune failed:", pruneError);
    }

    return sent;
}
