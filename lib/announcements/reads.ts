import type { SupabaseClient } from "@supabase/supabase-js";
import { getViewerGrades, announcementGradeFilter } from "./visibility";

/**
 * IDs of the announcements currently visible to `userId` — the same targeting
 * the /announcements page and the home feed use: not expired, and either
 * school-wide (target_grades null) or aimed at one of the viewer's grades
 * (own grade for students, children's grades for parents).
 */
export async function getVisibleAnnouncementIds(
    supabase: SupabaseClient,
    userId: string,
): Promise<string[]> {
    const grades = await getViewerGrades(supabase, userId);
    let query = supabase
        .from("announcements")
        .select("id")
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);
    const gradeFilter = announcementGradeFilter(grades);
    if (gradeFilter) query = query.or(gradeFilter);
    const { data } = await query;
    return (data ?? []).map((r) => r.id as string);
}

/** How many currently-visible announcements the user has NOT read yet. */
export async function getUnreadAnnouncementCount(
    supabase: SupabaseClient,
    userId: string,
): Promise<number> {
    const visible = await getVisibleAnnouncementIds(supabase, userId);
    if (visible.length === 0) return 0;
    const { data: reads } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", userId)
        .in("announcement_id", visible);
    const readSet = new Set((reads ?? []).map((r) => r.announcement_id as string));
    return visible.filter((id) => !readSet.has(id)).length;
}
