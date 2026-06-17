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

    const rating = parseInt(formData.get("rating") as string, 10);
    const comment = formData.get("comment") as string;

    if (!comment || !comment.trim()) {
        throw new Error("Rating and comment are required");
    }

    // Clamp/validate rating to an integer in 1..5; reject anything else.
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("Rating must be a whole number between 1 and 5");
    }

    // Look up the service owner — a user may not review their own service.
    const { data: service } = await supabase
        .from("services")
        .select("owner_id")
        .eq("id", serviceId)
        .single();

    if (!service) {
        throw new Error("Service not found");
    }

    if (service.owner_id === user.id) {
        throw new Error("You cannot review your own service");
    }

    // Prevent duplicate reviews by the same reviewer for the same service.
    const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("service_id", serviceId)
        .eq("reviewer_id", user.id)
        .maybeSingle();

    if (existingReview) {
        throw new Error("You have already reviewed this service");
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
