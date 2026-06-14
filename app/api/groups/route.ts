import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/validation";

const MAX_MEMBERS = 50;

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, member_ids } = await request.json();

    if (!name || !Array.isArray(member_ids) || member_ids.length === 0) {
        return NextResponse.json({ error: "Name and at least one member required." }, { status: 400 });
    }

    if (member_ids.length > MAX_MEMBERS) {
        return NextResponse.json({ error: `A group may have at most ${MAX_MEMBERS} members.` }, { status: 400 });
    }

    // Validate + dedupe requested ids; drop the creator (added separately as admin)
    // and anything that is not a well-formed UUID.
    const requestedIds = Array.from(
        new Set(member_ids.filter((id: unknown) => isUuid(id) && id !== user.id))
    ) as string[];

    // IDOR guard: only keep ids that actually exist in profiles, so a creator
    // cannot fabricate memberships for arbitrary/non-existent user ids.
    let validMemberIds: string[] = [];
    if (requestedIds.length > 0) {
        const { data: existingProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id')
            .in('id', requestedIds);

        if (profilesError) {
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        validMemberIds = (existingProfiles ?? []).map((p) => p.id);
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

    // Add creator as admin member (always a member of their own group)
    await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
    });

    // Add the validated members
    if (validMemberIds.length > 0) {
        const memberInserts = validMemberIds.map((id) => ({
            group_id: group.id,
            user_id: id,
            role: 'member',
        }));

        await supabase.from('group_members').insert(memberInserts);
    }

    return NextResponse.json({ id: group.id });
}
