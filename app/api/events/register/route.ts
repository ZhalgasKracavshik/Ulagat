import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event_id } = await request.json();

    if (!event_id) {
        return NextResponse.json({ error: "event_id is required" }, { status: 400 });
    }

    // Friendly pre-checks (status / deadline / capacity). These mirror the
    // BEFORE INSERT trigger on event_registrations, which is the real boundary:
    // the trigger enforces the same rules atomically for EVERY insert path, so
    // a direct PostgREST insert cannot bypass them.
    const { data: event } = await supabase
        .from('events')
        .select('max_students, status, registration_deadline')
        .eq('id', event_id)
        .single();

    if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.status !== 'active') {
        return NextResponse.json({ error: "This event is not open for registration" }, { status: 400 });
    }
    if (event.registration_deadline && almatyTodayIso() > event.registration_deadline) {
        return NextResponse.json({ error: "Registration deadline has passed" }, { status: 400 });
    }
    if (event.max_students) {
        const { count } = await supabase
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event_id);

        if (count !== null && count >= event.max_students) {
            return NextResponse.json({ error: "Event is full" }, { status: 400 });
        }
    }

    // Register user
    const { error } = await supabase
        .from('event_registrations')
        .insert({ event_id, user_id: user.id });

    if (error) {
        if (error.code === '23505') {
            return NextResponse.json({ error: "Already registered" }, { status: 400 });
        }
        // 23514 = the enforcement trigger rejected it (race / deadline / capacity
        // / status changed between the pre-check and the insert).
        if (error.code === '23514') {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event_id } = await request.json();

    const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', event_id)
        .eq('user_id', user.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
