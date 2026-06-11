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
        .select(`
            requester_id, 
            addressee_id, 
            profiles_requester:requester_id(id, full_name, avatar_url), 
            profiles_addressee:addressee_id(id, full_name, avatar_url)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

    const friends = friendships?.map((f: any) => {
        const isRequester = f.requester_id === user.id;
        const profile = isRequester ? f.profiles_addressee : f.profiles_requester;
        // In Supabase with multiple joins, sometimes it returns as an object directly
        return profile;
    }).filter(Boolean) || [];

    return <NewGroupForm friends={friends} />;
}
