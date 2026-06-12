"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifyAnnouncement } from "@/lib/notifications/announcement";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import type { AnnouncementCategory } from "@/types";

export type CreateAnnouncementInput = {
    title: string;
    body: string;
    category: AnnouncementCategory;
    /** null = all grades */
    target_grades: number[] | null;
    pinned: boolean;
    /** yyyy-MM-dd (last day the announcement is visible, Almaty time) or null = never expires */
    expires_at: string | null;
};

export type CreateAnnouncementResult = {
    success: boolean;
    error?: string;
    emailsSent?: number;
    emailsSkipped?: boolean;
    /** True when the announcement was saved but email notification (partially) failed. */
    emailsFailed?: boolean;
};

export type DeleteAnnouncementResult = { error: string } | { success: true };

const CATEGORIES: AnnouncementCategory[] = ['medical', 'assembly', 'important', 'general'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Defensive trim: returns '' for anything that is not a string. */
function safeTrim(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

async function requireStaff(): Promise<
    | { ok: true; userId: string }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        return { ok: false, error: "Unauthorized: only moderators and admins can manage announcements." };
    }
    return { ok: true, userId: user.id };
}

/**
 * Creates an official announcement, emails every targeted student + their
 * parents, and stamps notified_at. Moderator/admin only — verified server-side.
 */
export async function createAnnouncement(input: CreateAnnouncementInput): Promise<CreateAnnouncementResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    // ---- Validation (defensive: malformed input returns an error, never throws) ----
    const title = safeTrim(input.title);
    if (!title || title.length > 200) {
        return { success: false, error: "Title is required (max 200 characters)." };
    }
    const body = safeTrim(input.body);
    if (!body || body.length > 5000) {
        return { success: false, error: "Body is required (max 5000 characters)." };
    }
    if (!CATEGORIES.includes(input.category)) {
        return { success: false, error: "Invalid category." };
    }

    let targetGrades: number[] | null = null;
    if (input.target_grades !== null && input.target_grades !== undefined) {
        if (!Array.isArray(input.target_grades) || input.target_grades.length === 0) {
            return { success: false, error: "Select at least one grade or choose 'All grades'." };
        }
        const unique = Array.from(new Set(input.target_grades)).sort((a, b) => a - b);
        if (unique.some((g) => !Number.isInteger(g) || g < 1 || g > 11)) {
            return { success: false, error: "Grades must be between 1 and 11." };
        }
        targetGrades = unique;
    }

    // expires_at: stored as the absolute instant when the announcement stops being
    // visible — end of the chosen day in school wall-clock time (Asia/Almaty, UTC+5).
    let expiresAt: string | null = null;
    if (input.expires_at !== null && input.expires_at !== undefined && safeTrim(input.expires_at) !== '') {
        const dateStr = safeTrim(input.expires_at);
        if (!ISO_DATE.test(dateStr)) {
            return { success: false, error: "Expiry date must be a valid date (yyyy-mm-dd)." };
        }
        if (dateStr < almatyTodayIso()) {
            return { success: false, error: "Expiry date cannot be in the past." };
        }
        expiresAt = new Date(`${dateStr}T23:59:59+05:00`).toISOString();
    }

    const supabase = await createClient();

    // ---- Insert the announcement ----
    const { data: inserted, error: insertError } = await supabase
        .from('announcements')
        .insert({
            title,
            body,
            category: input.category,
            target_grades: targetGrades,
            pinned: input.pinned === true,
            expires_at: expiresAt,
            created_by: auth.userId,
        })
        .select('id')
        .single();

    if (insertError || !inserted) {
        console.error("createAnnouncement insert error:", insertError);
        return { success: false, error: "Failed to save the announcement." };
    }

    // ---- Notify students + parents, stamp notified_at ----
    let emailsSent = 0;
    let emailsSkipped = false;
    let emailsFailed = false;
    try {
        const result = await notifyAnnouncement(inserted.id as string);
        emailsSent = result.sent;
        emailsSkipped = result.skipped;
        emailsFailed = result.failed;

        if (result.sent > 0) {
            const { error: notifiedAtError } = await supabase
                .from('announcements')
                .update({ notified_at: new Date().toISOString() })
                .eq('id', inserted.id as string);
            if (notifiedAtError) {
                // Non-fatal: emails went out, only the timestamp is missing.
                console.error("createAnnouncement notified_at update error:", notifiedAtError);
            }
        }
    } catch (error) {
        // The announcement is saved even if email delivery fails — the feed still shows it.
        console.error("createAnnouncement notification error:", error);
        emailsFailed = true;
    }

    revalidatePath('/announcements');
    revalidatePath('/home');
    return { success: true, emailsSent, emailsSkipped, emailsFailed };
}

/** Deletes an announcement (e.g. posted by mistake). Moderator/admin only. */
export async function deleteAnnouncement(id: string): Promise<DeleteAnnouncementResult> {
    const auth = await requireStaff();
    if (!auth.ok) {
        return { error: auth.error };
    }

    if (typeof id !== 'string' || !id.trim()) {
        return { error: "Announcement id is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
        console.error("deleteAnnouncement error:", error);
        return { error: "Failed to delete the announcement." };
    }

    revalidatePath('/announcements');
    revalidatePath('/home');
    return { success: true };
}
