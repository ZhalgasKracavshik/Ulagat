"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(conversationId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");

    const content = formData.get("content") as string;
    if (!content.trim()) return;

    // Insert Message
    const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim()
    });

    if (error) {
        console.error("Error sending message:", error);
        throw new Error("Failed to send");
    }

    // Update conversation 'updated_at' to bubble it to top
    await supabase.from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    revalidatePath(`/messages/${conversationId}`);
}

export async function startConversation(otherUserId: string) {
    // This action would be called from the Service Page "Chat" button
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Unauthorized");
    if (user.id === otherUserId) throw new Error("Cannot chat with yourself");

    // Check existing conversation
    // This is tricky with RLS queries in complex `OR` logic sometimes, but trying simple check
    // We need to find if there is a row where (p1=me AND p2=other) OR (p1=other AND p2=me)

    // Attempt insert, on conflict do nothing? No, we need ID.
    // Let's just try to select first.

    // A robust way:
    // We can't easily do (p1, p2) OR (p2, p1) in single easy query without stored proc or complex filter.
    // Let's just try to fetch both combinations.

    const { data: existing } = await supabase.from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`)
        .single();

    if (existing) {
        return existing.id;
    }

    // Create new
    const { data: newConv, error } = await supabase.from('conversations').insert({
        participant1_id: user.id,
        participant2_id: otherUserId
    }).select().single();

    if (error) throw error;

    return newConv.id;
}
