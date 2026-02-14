"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const full_name = formData.get("full_name") as string;
    const bio = formData.get("bio") as string;
    const avatar_url = formData.get("avatar_url") as string;

    const { error } = await supabase.from("profiles").update({
        full_name,
        bio, // Ensure 'bio' column exists in profiles table!
        avatar_url
    }).eq("id", user.id);

    if (error) {
        console.error("Error updating profile:", error);
        // If error is code 42703 (undefined column 'bio'), we might need to add it to schema.
        // Assuming schema is up to date or I should update it.
        throw new Error("Failed to update profile");
    }

    revalidatePath(`/profile/${user.id}`);
    redirect("/profile/me");
}
