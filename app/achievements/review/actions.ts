"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ACHIEVEMENT_REVIEWER_ROLES } from "@/lib/leaderboard";

/** Server-side role check: only parliament, moderator and admin can review. */
async function checkReviewer() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !(ACHIEVEMENT_REVIEWER_ROLES as readonly string[]).includes(profile.role)) {
        throw new Error("Unauthorized: only parliament, moderators and admins can review achievements.");
    }
    return { supabase, user };
}

function revalidateReviewPaths() {
    revalidatePath('/achievements/review');
    revalidatePath('/leaderboard');
}

/**
 * Defense in depth (the DB guard trigger also enforces this): reviewers
 * cannot verify or reject their own achievements.
 */
async function assertNotSelfReview(supabase: Awaited<ReturnType<typeof createClient>>, reviewerId: string, achievementId: string) {
    const { data: achievement, error } = await supabase
        .from('achievements')
        .select('user_id')
        .eq('id', achievementId)
        .single();

    if (error || !achievement) {
        throw new Error("Achievement not found.");
    }
    if (achievement.user_id === reviewerId) {
        throw new Error("You cannot review your own achievement — ask another reviewer.");
    }
}

/**
 * Approves a pending achievement. The pending → verified transition fires the
 * DB trigger that awards tier-based reputation points (school 10 / city 50 /
 * national 150).
 */
export async function verifyAchievement(formData: FormData) {
    const { supabase, user } = await checkReviewer();
    const id = formData.get('id') as string;
    if (!id) throw new Error("Achievement id is required");
    await assertNotSelfReview(supabase, user.id, id);

    const { error } = await supabase
        .from('achievements')
        .update({ status: 'verified', verified_by: user.id, rejection_reason: null })
        .eq('id', id)
        .eq('status', 'pending'); // only pending submissions can be verified

    if (error) {
        console.error("Error verifying achievement:", error);
        throw new Error("Failed to verify the achievement.");
    }
    revalidateReviewPaths();
}

/** Rejects a pending achievement with an optional reason (no points awarded). */
export async function rejectAchievement(formData: FormData) {
    const { supabase, user } = await checkReviewer();
    const id = formData.get('id') as string;
    if (!id) throw new Error("Achievement id is required");
    await assertNotSelfReview(supabase, user.id, id);
    const reason = ((formData.get('reason') as string) || '').trim();

    const { error } = await supabase
        .from('achievements')
        .update({ status: 'rejected', verified_by: user.id, rejection_reason: reason || null })
        .eq('id', id)
        .eq('status', 'pending');

    if (error) {
        console.error("Error rejecting achievement:", error);
        throw new Error("Failed to reject the achievement.");
    }
    revalidateReviewPaths();
}
