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

    try {
        const { error } = await supabase.from("profiles").update({
            full_name,
            bio,
            avatar_url
        }).eq("id", user.id);

        if (error) throw error;

        revalidatePath(`/profile/${user.id}`);
    } catch (error) {
        console.error("Profile update error:", error);
        // In a real app, we'd return { error: "..." } to display on the client
        // But for now, let's just log it and redirect
    }

    // Redirect needs to be outside try/catch if it throws NEXT_REDIRECT
    redirect(`/profile/${user.id}`);
}
