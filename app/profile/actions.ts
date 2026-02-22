"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addAchievement(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const achievement_date = formData.get("achievement_date") as string;
    const image_url = formData.get("image_url") as string;

    if (!title) throw new Error("Title is required");

    const { error } = await supabase.from("achievements").insert({
        user_id: user.id,
        title,
        description: description || null,
        achievement_date: achievement_date || null,
        image_url: image_url || null,
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
