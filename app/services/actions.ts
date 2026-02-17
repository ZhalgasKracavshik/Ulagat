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

    // Check permissions
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (profileError) {
        console.error("Error fetching profile for permission check:", profileError);
        throw new Error("Failed to verify user role.");
    }

    console.log(`[createService] User: ${user.id}, Role: ${profile?.role}`);

    // Allow Teachers, Admins, Moderators
    // Students CANNOT create services
    const allowedRoles = ['teacher', 'admin', 'moderator'];

    if (!profile || !allowedRoles.includes(profile.role)) {
        console.error(`[createService] Unauthorized access attempt by role: ${profile?.role}`);
        throw new Error(`Unauthorized: Role '${profile?.role}' cannot post services.`);
    }

    // Basic validation
    // In real app, use Zod
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;
    const image_url = formData.get("image_url") as string;
    const durationDays = parseInt(formData.get("duration") as string) || 7; // Default 7 days

    if (!title || !description || !category) {
        throw new Error("Missing fields");
    }

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);

    // Insert service with 'pending' status (waiting for payment)
    const { data, error } = await supabase.from("services").insert({
        owner_id: user.id,
        title,
        description,
        price,
        category,
        status: 'pending', // Pending payment
        image_url: image_url || null,
        expires_at: expirationDate.toISOString()
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

export async function deleteService(serviceId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Check permissions (Owner, Admin, or Moderator)
    const { data: service } = await supabase.from('services').select('owner_id').eq('id', serviceId).single();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!service) throw new Error("Service not found");

    const isOwner = service.owner_id === user.id;
    const isAdminOrMod = profile && ['admin', 'moderator'].includes(profile.role);

    if (!isOwner && !isAdminOrMod) {
        throw new Error("Unauthorized to delete this service");
    }

    const { error } = await supabase.from('services').delete().eq('id', serviceId);

    if (error) {
        throw new Error("Failed to delete service");
    }

    redirect('/services');
}
