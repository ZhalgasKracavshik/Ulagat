"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addStudyMaterial(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        throw new Error("Unauthorized: Only admins and moderators can add materials.");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const url = formData.get("url") as string;
    const category = formData.get("category") as string;
    const difficulty = formData.get("difficulty") as string;

    if (!title || !category) {
        throw new Error("Title and category are required");
    }

    const { error } = await supabase.from("study_materials").insert({
        title,
        description: description || null,
        url: url || null,
        category,
        difficulty: difficulty || 'medium',
        uploaded_by: user.id,
    });

    if (error) {
        console.error("Error adding study material:", error);
        throw new Error("Failed to add material. Please check if the study_materials table exists.");
    }

    revalidatePath("/olympiad");
    redirect("/olympiad");
}
