
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();

    // 1. Check if we already have data to avoid duplicates (optional, but good practice)
    const { count } = await supabase.from('services').select('*', { count: 'exact', head: true });

    if (count && count > 0) {
        return NextResponse.json({ message: "Database already has data!" });
    }

    // 2. Get the current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "You must be logged in to seed data. Log in first!" }, { status: 401 });
    }

    // AUTO-FIX: If the database was reset, the user might exist in Auth but not in Profiles.
    // We recreate the profile here to prevent errors.
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

    if (!profile) {
        await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || "Admin User",
            avatar_url: user.user_metadata?.avatar_url || "",
            role: 'teacher' // Default to teacher for ability to create events
        });
    }

    // 3. Insert Services
    const { error: serviceError } = await supabase.from('services').insert([
        {
            owner_id: user.id,
            title: "Advanced Mathematics Tutoring",
            description: "I can help you prepare for the SATs and Olympiads. 5 years of experience.",
            price: 5000,
            category: "Math",
            status: "active"
        },
        {
            owner_id: user.id,
            title: "Guitar Lessons for Beginners",
            description: "Learn to play your favorite songs in 3 months! Acoustic and Electric.",
            price: 3000,
            category: "Music",
            status: "active"
        }
    ]);

    if (serviceError) return NextResponse.json({ error: serviceError.message }, { status: 500 });

    // 4. Insert Events
    const { error: eventError } = await supabase.from('events').insert([
        {
            organizer_id: user.id,
            title: "Spring Code Hackathon",
            description: "Join us for 24 hours of coding, pizza, and prizes! Build something amazing.",
            event_date: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
            location: "Main School Hall",
        }
    ]);

    if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 });

    // 5. Insert Reputation (Leaderboard)
    await supabase.from('reputation_ledger').insert([
        {
            user_id: user.id,
            action: 'Won Hackathon',
            points: 100,
            previous_hash: 'genesis',
            current_hash: 'hash_1'
        }
    ]);

    return NextResponse.json({ success: true, message: "Database seeded successfully! Refresh your Supabase dashboard." });
}
