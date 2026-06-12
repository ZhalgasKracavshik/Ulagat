"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MATERIAL_UPLOADER_ROLES, MAX_PDF_BYTES, isMaterialDifficulty } from "@/lib/olympiad";

export async function addStudyMaterial(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // Phase 4: admins, moderators and parliament can upload materials.
    // New rows keep the DB default 'pending' status for the moderation flow.
    const allowedRoles: readonly string[] = MATERIAL_UPLOADER_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        throw new Error("Unauthorized: Only admins, moderators and parliament members can add materials.");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const url = formData.get("url") as string;
    const category = formData.get("category") as string;
    const difficultyRaw = (formData.get("difficulty") as string) || 'medium';
    const difficulty = isMaterialDifficulty(difficultyRaw) ? difficultyRaw : 'medium';

    if (!title || !category) {
        throw new Error("Title and category are required");
    }

    // Phase 4: olympiad year (optional)
    const yearRaw = (formData.get("year") as string | null)?.trim() || "";
    let year: number | null = null;
    if (yearRaw) {
        const parsed = Number(yearRaw);
        if (!Number.isInteger(parsed) || parsed < 1990 || parsed > 2100) {
            throw new Error("Year must be a valid year (e.g. 2024)");
        }
        year = parsed;
    }

    // Phase 4: optional PDF attachment (max 10MB, .pdf only) → 'study-materials' bucket
    let file_url: string | null = null;
    const pdf = formData.get("pdf") as File | null;
    if (pdf && pdf.size > 0) {
        if (pdf.size > MAX_PDF_BYTES) {
            throw new Error("PDF file must be 10 MB or smaller");
        }
        const isPdf = pdf.type === 'application/pdf' || pdf.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            throw new Error("Only .pdf files are allowed");
        }

        const path = `${user.id}/${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
            .from('study-materials')
            .upload(path, pdf, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error("Error uploading study material PDF:", uploadError);
            throw new Error("Failed to upload the PDF. Please try again.");
        }

        file_url = supabase.storage.from('study-materials').getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from("study_materials").insert({
        title,
        description: description || null,
        url: url || null,
        category,
        difficulty,
        year,
        file_url,
        uploaded_by: user.id,
    });

    if (error) {
        console.error("Error adding study material:", error);
        throw new Error("Failed to add material. Please check if the study_materials table exists.");
    }

    revalidatePath("/olympiad");
    redirect("/olympiad");
}
