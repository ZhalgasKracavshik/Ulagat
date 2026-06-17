import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewGroupForm } from "./new-group-form";

type FriendProfile = { id: string; full_name: string; avatar_url: string };

/**
 * A friendship row with both parties' profiles joined. Supabase may surface a
 * joined relation as either a single object or a single-element array, so the
 * profile fields are typed permissively and normalized below.
 */
type FriendshipRow = {
    requester_id: string;
    addressee_id: string;
    profiles_requester: FriendProfile | FriendProfile[] | null;
    profiles_addressee: FriendProfile | FriendProfile[] | null;
};

export default async function NewGroupPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch user's friends to add as members
    const { data: friendships } = await supabase
        .from('friendships')
        .select(`
            requester_id, 
            addressee_id, 
            profiles_requester:requester_id(id, full_name, avatar_url), 
            profiles_addressee:addressee_id(id, full_name, avatar_url)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

    const friends = ((friendships || []) as unknown as FriendshipRow[])
        .map((f) => {
            const joined = f.requester_id === user.id ? f.profiles_addressee : f.profiles_requester;
            return Array.isArray(joined) ? joined[0] ?? null : joined;
        })
        .filter((p): p is FriendProfile => p !== null);

    return <NewGroupForm friends={friends} />;
}
