"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createEvent(formData: FormData) {
    const supabase = await createClient();

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

    console.log(`[createEvent] User: ${user.id}, Role: ${profile?.role}`);

    // Allow admins, moderators ONLY (No teachers)
    const allowedRoles = ['admin', 'moderator'];

    if (!profile || !allowedRoles.includes(profile.role)) {
        console.error(`[createEvent] Unauthorized access attempt by role: ${profile?.role}`);
        throw new Error(`Unauthorized: Role '${profile?.role}' cannot create events.`);
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const event_date = formData.get("event_date") as string; // ISO string expected
    const image_url = formData.get("image_url") as string;
    const durationDays = parseInt(formData.get("duration") as string) || 30; // Default 30 days for events

    if (!title || !description || !event_date) {
        throw new Error("Missing fields");
    }

    // Calculate expiration date
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + durationDays);

    const { error } = await supabase.from("events").insert({
        organizer_id: user.id,
        title,
        description,
        location,
        event_date,
        image_url: image_url || null,
        expires_at: expirationDate.toISOString()
    });

    if (error) {
        console.error("Error creating event:", error);
        throw new Error("Failed to create event");
    }

    redirect("/events");
}

export async function deleteEvent(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    // Check permissions (Organizer, Admin, or Moderator)
    const { data: event } = await supabase.from('events').select('organizer_id').eq('id', eventId).single();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    if (!event) throw new Error("Event not found");

    const isOrganizer = event.organizer_id === user.id;
    const isAdminOrMod = profile && ['admin', 'moderator'].includes(profile.role);

    if (!isOrganizer && !isAdminOrMod) {
        throw new Error("Unauthorized to delete this event");
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId);

    if (error) {
        throw new Error("Failed to delete event");
    }

    redirect('/events');
}
