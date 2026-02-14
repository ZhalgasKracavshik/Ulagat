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
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // Allow admins, moderators, and teachers to create events
    const allowedRoles = ['admin', 'moderator', 'teacher'];
    if (!profile || !allowedRoles.includes(profile.role)) {
        throw new Error("Unauthorized: Only Teachers, Moderators, and Admins can create events.");
    }

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const event_date = formData.get("event_date") as string; // ISO string expected

    if (!title || !description || !event_date) {
        throw new Error("Missing fields");
    }

    const { error } = await supabase.from("events").insert({
        organizer_id: user.id,
        title,
        description,
        location,
        event_date,
        image_url: "" // TODO: Handle image upload
    });

    if (error) {
        console.error("Error creating event:", error);
        throw new Error("Failed to create event");
    }

    redirect("/events");
}
