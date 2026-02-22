"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendGroupMessage(groupId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const content = formData.get("content") as string;
    if (!content?.trim()) return;

    await supabase.from("group_messages").insert({
        group_id: groupId,
        sender_id: user.id,
        content: content.trim(),
    });

    revalidatePath(`/messages/group/${groupId}`);
}
