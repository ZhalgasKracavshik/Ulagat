"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type UpdatePrivacyResult = { ok: true } | { ok: false; error: string };

/**
 * Toggle the caller's leaderboard pseudonym preference.
 *
 * Ownership is enforced server-side: we resolve the user from the auth session
 * and only ever update that user's own `profiles` row (`.eq("id", user.id)`).
 * The `anonymous` flag is the only field touched, so this cannot be used to
 * write any other column. This is the new home for the privacy toggle that
 * previously lived on the profile-edit form.
 */
export async function updatePrivacy(
    anonymous: boolean,
): Promise<UpdatePrivacyResult> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Not signed in." };
    }

    const { error } = await supabase
        .from("profiles")
        .update({ leaderboard_anonymous: anonymous })
        .eq("id", user.id);

    if (error) {
        console.error("updatePrivacy error:", error);
        return { ok: false, error: "Could not save your privacy setting." };
    }

    // The leaderboard reads this flag server-side; refresh it so the change is
    // reflected on next view.
    revalidatePath("/leaderboard");

    return { ok: true };
}
