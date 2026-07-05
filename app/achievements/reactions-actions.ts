"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation";
import type { ReactionKind } from "@/types";

const KINDS: ReactionKind[] = ["heart", "clap"];

export type ToggleReactionResult =
    | { success: true; active: boolean }
    | { success: false; error: string };

/**
 * Toggles the caller's reaction of the given kind. Any authenticated user —
 * RLS enforces self-only rows and verified-only targets, so this action adds
 * no privilege of its own (no MFA step-up needed).
 */
export async function toggleReaction(
    achievementId: string,
    kind: ReactionKind,
): Promise<ToggleReactionResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    if (!isUuid(achievementId)) return { success: false, error: "Invalid achievement id." };
    if (!KINDS.includes(kind)) return { success: false, error: "Invalid reaction kind." };

    // Try to remove first: if a row went away, this was an un-toggle.
    const { data: deleted, error: deleteError } = await supabase
        .from("achievement_reactions")
        .delete()
        .eq("achievement_id", achievementId)
        .eq("user_id", user.id)
        .eq("kind", kind)
        .select("achievement_id");
    if (deleteError) {
        console.error("toggleReaction delete error:", deleteError);
        return { success: false, error: "Failed to update the reaction." };
    }
    if (deleted && deleted.length > 0) {
        revalidatePath("/home");
        return { success: true, active: false };
    }

    const { error: insertError } = await supabase
        .from("achievement_reactions")
        .insert({ achievement_id: achievementId, user_id: user.id, kind });
    if (insertError) {
        // 23505: double-click race — the reaction already exists, treat as on.
        if (insertError.code === "23505") return { success: true, active: true };
        // RLS rejects pending/foreign targets with a permission error.
        console.error("toggleReaction insert error:", insertError);
        return { success: false, error: "Failed to update the reaction." };
    }

    revalidatePath("/home");
    return { success: true, active: true };
}
