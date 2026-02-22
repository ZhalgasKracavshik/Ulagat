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
    const social_links_raw = formData.get("social_links") as string;

    // Parse social links JSON
    let social_links = [];
    try {
        social_links = JSON.parse(social_links_raw || "[]");
        // Filter out empty URLs
        social_links = social_links.filter((link: any) => link.url && link.url.trim() !== "");
    } catch {
        social_links = [];
    }

    try {
        const { error } = await supabase.from("profiles").update({
            full_name,
            bio,
            avatar_url,
            social_links,
        }).eq("id", user.id);

        if (error) throw error;

        revalidatePath(`/profile/${user.id}`);
    } catch (error) {
        console.error("Profile update error:", error);
    }

    redirect(`/profile/${user.id}`);
}
