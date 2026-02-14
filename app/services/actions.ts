"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createService(formData: FormData) {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Basic validation
    // In real app, use Zod
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;

    if (!title || !description || !category) {
        throw new Error("Missing fields");
    }

    // Insert service with 'pending' status (waiting for payment)
    const { data, error } = await supabase.from("services").insert({
        owner_id: user.id,
        title,
        description,
        price,
        category,
        status: 'pending', // Pending payment
        image_url: "" // TODO: Handle image upload
    }).select().single();

    if (error) {
        console.error("Error creating service:", error);
        throw new Error("Failed to create service");
    }

    // Redirect to Payment (Stripe Checkout)
    // For MVP/Demo, we might skip to active or a dummy payment page
    // Let's redirect to a payment confirmation page
    redirect(`/services/${data.id}/pay`);
}
