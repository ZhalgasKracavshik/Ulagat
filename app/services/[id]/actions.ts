"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function addReview(serviceId: string, formData: FormData) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const rating = parseInt(formData.get("rating") as string);
    const comment = formData.get("comment") as string;

    if (!rating || !comment) {
        throw new Error("Rating and comment are required");
    }

    const { error } = await supabase.from("reviews").insert({
        service_id: serviceId,
        reviewer_id: user.id,
        rating,
        comment
    });

    if (error) {
        console.error("Error adding review:", error);
        throw new Error("Failed to add review");
    }

    // Also update Service owner's reputation! (Simple +5 points for getting a review)
    // In a real app, maybe only if rating > 3
    if (rating >= 4) {
        // We'd call mining logic here. For now, simple insert to prove point.
        // We need previous hash... simplified for now.
    }

    revalidatePath(`/services/${serviceId}`);
}
