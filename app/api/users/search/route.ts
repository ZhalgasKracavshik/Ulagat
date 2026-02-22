
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
        return NextResponse.json({ users: [] });
    }

    const supabase = await createClient();

    // Search for users by full_name (case-insensitive)
    const { data: users, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .ilike('full_name', `%${query}%`)
        .limit(10);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users });
}
