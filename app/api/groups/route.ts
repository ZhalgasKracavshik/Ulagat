import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, member_ids } = await request.json();

    if (!name || !member_ids || member_ids.length === 0) {
        return NextResponse.json({ error: "Name and at least one member required." }, { status: 400 });
    }

    // Create group
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name, creator_id: user.id })
        .select()
        .single();

    if (groupError) {
        return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    // Add creator as admin member
    await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
    });

    // Add other members
    const memberInserts = member_ids.map((id: string) => ({
        group_id: group.id,
        user_id: id,
        role: 'member',
    }));

    await supabase.from('group_members').insert(memberInserts);

    return NextResponse.json({ id: group.id });
}
