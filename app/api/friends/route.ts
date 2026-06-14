import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/validation";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, targetUserId, friendshipId } = await request.json();

    if (action === "add") {
        // targetUserId is interpolated into the .or() filter below — must be a
        // validated UUID before use.
        if (!isUuid(targetUserId)) {
            return NextResponse.json({ error: "Invalid target user id" }, { status: 400 });
        }

        // Check if friendship already exists
        const { data: existing } = await supabase
            .from("friendships")
            .select("id")
            .or(
                `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`
            )
            .single();

        if (existing) {
            return NextResponse.json({ success: true, message: "Already exists" });
        }

        const { error } = await supabase.from("friendships").insert({
            requester_id: user.id,
            addressee_id: targetUserId,
            status: "pending",
        });

        if (error) {
            console.error("Error sending friend request:", error);
            return NextResponse.json({ error: "Failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    }

    if (action === "accept") {
        const { error } = await supabase
            .from("friendships")
            .update({ status: "accepted" })
            .eq("id", friendshipId)
            .eq("addressee_id", user.id); // Only addressee can accept

        if (error) {
            return NextResponse.json({ error: "Failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    }

    if (action === "remove") {
        const { error } = await supabase
            .from("friendships")
            .delete()
            .eq("id", friendshipId);

        if (error) {
            return NextResponse.json({ error: "Failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
