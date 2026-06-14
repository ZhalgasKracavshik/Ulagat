import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/validation";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await request.json();

    // otherUserId is interpolated into the .or() filter below — must be a
    // validated UUID before use.
    if (!isUuid(otherUserId) || user.id === otherUserId) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Check existing conversation (either direction)
    const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
            `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`
        )
        .single();

    if (existing) {
        return NextResponse.json({ conversationId: existing.id });
    }

    // Create new conversation
    const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
            participant1_id: user.id,
            participant2_id: otherUserId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating conversation:", error);
        return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    return NextResponse.json({ conversationId: newConv.id });
}
