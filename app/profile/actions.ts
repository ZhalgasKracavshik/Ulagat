"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { safeHttpUrl } from "@/lib/validation";

export async function addAchievement(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const achievement_date = formData.get("achievement_date") as string;
    const rawImageUrl = formData.get("image_url");

    if (!title) throw new Error("Title is required");

    // Only accept http(s) image links. A javascript:/data: value here would be
    // rendered into an anchor href on the reviewer queue and run script in a
    // moderator's session (stored XSS) — reject it at the source.
    let image_url: string | null = null;
    if (typeof rawImageUrl === "string" && rawImageUrl.trim()) {
        image_url = safeHttpUrl(rawImageUrl);
        if (!image_url) throw new Error("Image URL must start with http:// or https://");
    }

    const { error } = await supabase.from("achievements").insert({
        user_id: user.id,
        title,
        description: description || null,
        achievement_date: achievement_date || null,
        image_url,
    });

    if (error) {
        console.error("Error adding achievement:", error);
        throw new Error("Failed to add achievement");
    }

    revalidatePath(`/profile/${user.id}`);
    revalidatePath("/profile/me");
}

export async function deleteAchievement(achievementId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("achievements")
        .delete()
        .eq("id", achievementId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Error deleting achievement:", error);
        throw new Error("Failed to delete achievement");
    }

    revalidatePath(`/profile/${user.id}`);
    revalidatePath("/profile/me");
}
