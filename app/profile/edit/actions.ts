"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizeClassLetter } from "@/lib/schedule/class-letter";

function failWith(message: string): never {
    redirect(`/profile/edit?error=${encodeURIComponent(message)}`);
}

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const full_name = formData.get("full_name") as string;
    const bio = formData.get("bio") as string;
    const avatar_url = formData.get("avatar_url") as string;
    const social_links_raw = formData.get("social_links") as string;

    // Grade / class letter (used by the schedule page)
    const gradeRaw = (formData.get("grade") as string | null)?.trim() ?? "";
    let grade: number | null = null;
    if (gradeRaw) {
        const gradeNumber = Number(gradeRaw);
        if (!Number.isInteger(gradeNumber) || gradeNumber < 1 || gradeNumber > 11) {
            failWith("Grade must be between 1 and 11");
        }
        grade = gradeNumber;
    }
    // Normalize so the schedule/substitution class match is reliable (see
    // lib/schedule/class-letter.ts). Empty stays null.
    const class_letter = normalizeClassLetter(formData.get("class_letter") as string | null) || null;

    // Leaderboard privacy now lives on the /settings page (updatePrivacy server
    // action). This form intentionally no longer touches leaderboard_anonymous
    // so saving the profile never clobbers that preference.

    // Parse social links JSON
    let social_links: { network?: string; url?: string }[] = [];
    try {
        social_links = JSON.parse(social_links_raw || "[]");
        // Keep only links with a safe http(s) URL. Blocks stored XSS via a
        // javascript:/data: scheme in the rendered link href.
        social_links = social_links
            .map((link) => ({ ...link, url: (link.url ?? "").trim() }))
            .filter((link) => /^https?:\/\//i.test(link.url));
    } catch {
        social_links = [];
    }

    const { error } = await supabase.from("profiles").update({
        full_name,
        bio,
        avatar_url,
        social_links,
        grade,
        class_letter,
    }).eq("id", user.id);

    if (error) {
        console.error("Profile update error:", error);
        failWith("Failed to save your profile. Please try again.");
    }

    revalidatePath(`/profile/${user.id}`);
    redirect(`/profile/${user.id}`);
}
