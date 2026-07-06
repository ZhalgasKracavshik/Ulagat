"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushActionResult = { success: true } | { success: false; error: string };

/** Shape a browser PushSubscription.toJSON() gives us. */
type IncomingSubscription = {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
};

function str(value: unknown, max: number): string | null {
    if (typeof value !== "string") return null;
    const v = value.trim();
    if (!v || v.length > max) return null;
    return v;
}

/**
 * Stores the caller's browser push subscription. RLS pins the row to
 * auth.uid(); we upsert on the unique endpoint so re-subscribing (or another
 * device) is idempotent. Only ever writes the current user's own row.
 */
export async function savePushSubscription(sub: IncomingSubscription): Promise<PushActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const endpoint = str(sub?.endpoint, 1024);
    const p256dh = str(sub?.keys?.p256dh, 256);
    const auth = str(sub?.keys?.auth, 256);
    if (!endpoint || !p256dh || !auth) {
        return { success: false, error: "Invalid subscription." };
    }
    // Only accept real Web Push endpoints (https), never arbitrary URLs.
    if (!endpoint.startsWith("https://")) {
        return { success: false, error: "Invalid subscription endpoint." };
    }

    // Upsert on the unique endpoint via the service role. The table has no
    // UPDATE policy (so an RLS-scoped upsert's ON CONFLICT DO UPDATE would be
    // denied), and reassigning a shared-browser endpoint to the currently
    // authenticated user is the correct behaviour. user_id is pinned to the
    // authenticated caller here — never taken from the client.
    const admin = createAdminClient();
    const { error } = await admin
        .from("push_subscriptions")
        .upsert(
            { user_id: user.id, endpoint, p256dh, auth },
            { onConflict: "endpoint" },
        );
    if (error) {
        console.error("savePushSubscription error:", error);
        return { success: false, error: "Failed to save the subscription." };
    }
    return { success: true };
}

/** Removes the caller's subscription for a given endpoint (unsubscribe). */
export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    if (typeof endpoint !== "string" || !endpoint.trim()) {
        return { success: false, error: "Endpoint is required." };
    }

    // RLS already scopes deletes to the caller's own rows; the user_id filter
    // is belt-and-suspenders.
    const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);
    if (error) {
        console.error("removePushSubscription error:", error);
        return { success: false, error: "Failed to remove the subscription." };
    }
    return { success: true };
}
