"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SERVICE_CREATOR_ROLES } from "@/lib/services";

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

    // Phase 5: Teachers, Admins, Moderators and Parliament can post.
    // Students CANNOT create listings.
    const allowedRoles: readonly string[] = SERVICE_CREATOR_ROLES;

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

    // Phase 5: posting is FREE — the listing goes straight to 'pending'
    // moderation without a payment step. The Stripe pay flow
    // (app/services/[id]/pay, app/api/checkout) is kept intact for the
    // Phase 14 subscriptions work; we simply no longer redirect to it.
    const { error } = await supabase.from("services").insert({
        owner_id: user.id,
        title,
        description,
        price,
        category,
        status: 'pending', // Awaiting moderation
        image_url: image_url || null,
        expires_at: expirationDate.toISOString()
    });

    if (error) {
        console.error("Error creating service:", error);
        throw new Error("Failed to create service");
    }

    redirect('/services?submitted=true');
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
