"use server";

import { createClient } from "@/lib/supabase/server";
import { getVisibleAnnouncementIds } from "@/lib/announcements/reads";

/**
 * Marks every announcement currently visible to the caller as read. Called
 * when the user opens /announcements. RLS pins each read receipt to
 * auth.uid(); the upsert ignores duplicates, so re-opening the page is cheap
 * and idempotent.
 */
export async function markAllAnnouncementsRead(): Promise<{ success: boolean }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const ids = await getVisibleAnnouncementIds(supabase, user.id);
    if (ids.length === 0) return { success: true };

    const { error } = await supabase
        .from("announcement_reads")
        .upsert(
            ids.map((id) => ({ user_id: user.id, announcement_id: id })),
            { onConflict: "user_id,announcement_id", ignoreDuplicates: true },
        );
    if (error) {
        console.error("markAllAnnouncementsRead error:", error);
        return { success: false };
    }
    return { success: true };
}
