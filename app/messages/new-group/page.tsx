import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NewGroupForm } from "./new-group-form";

export default async function NewGroupPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch user's friends to add as members
    const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id, profiles_user:user_id(id, full_name, avatar_url), profiles_friend:friend_id(id, full_name, avatar_url)')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

    const friends = friendships?.map((f: any) => {
        const isUserA = f.user_id === user.id;
        const profile = isUserA ? f.profiles_friend : f.profiles_user;
        const p = Array.isArray(profile) ? profile[0] : profile;
        return p;
    }).filter(Boolean) || [];

    return <NewGroupForm friends={friends} />;
}
