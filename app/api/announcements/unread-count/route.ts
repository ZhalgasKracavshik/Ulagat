import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUnreadAnnouncementCount } from "@/lib/announcements/reads";

export const dynamic = "force-dynamic";

/** Unread official-announcement count for the current user (drives the nav badge). */
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ count: 0 });

    try {
        const count = await getUnreadAnnouncementCount(supabase, user.id);
        return NextResponse.json({ count });
    } catch (err) {
        console.error("[unread-count] failed:", err);
        return NextResponse.json({ count: 0 });
    }
}
