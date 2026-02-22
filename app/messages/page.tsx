
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Users2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function MessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return (
            <div className="container py-10 text-center">
                Please <Link href="/login" className="text-primary underline">log in</Link> to view messages.
            </div>
        );
    }

    // Fetch DM conversations
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            updated_at,
            participant1:participant1_id(full_name, avatar_url),
            participant2:participant2_id(full_name, avatar_url),
            participant1_id,
            participant2_id
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

    // Fetch groups the user belongs to
    const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name, avatar_url, updated_at:created_at)')
        .eq('user_id', user.id);

    // Also fetch groups the user created
    const { data: createdGroups } = await supabase
        .from('groups')
        .select('id, name, avatar_url, created_at')
        .eq('creator_id', user.id);

    // Merge groups, deduplicate
    const groupMap = new Map();
    userGroups?.forEach((gm: any) => {
        if (gm.groups) groupMap.set(gm.groups.id, gm.groups);
    });
    createdGroups?.forEach((g: any) => {
        groupMap.set(g.id, { ...g, updated_at: g.created_at });
    });
    const groups = Array.from(groupMap.values());

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            <div className="container mx-auto py-8 max-w-3xl px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
                    <Link href="/messages/new-group">
                        <Button variant="outline" className="gap-2 rounded-full">
                            <Plus className="w-4 h-4" />
                            New Group
                        </Button>
                    </Link>
                </div>

                {/* Group Chats Section */}
                {groups.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users2 className="w-4 h-4" /> Groups
                        </h2>
                        <div className="space-y-2">
                            {groups.map((group: any) => (
                                <Link href={`/messages/group/${group.id}`} key={group.id}>
                                    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer mb-2">
                                        <Avatar className="h-12 w-12 bg-indigo-100">
                                            <AvatarImage src={group.avatar_url} />
                                            <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">{group.name?.[0] || 'G'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate">{group.name}</h3>
                                            <p className="text-xs text-muted-foreground">Group chat</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Direct Messages Section */}
                <div>
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Direct Messages
                    </h2>
                    <div className="space-y-2">
                        {conversations && conversations.length > 0 ? (
                            conversations.map((conv: any) => {
                                const otherUser = conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
                                const participant = Array.isArray(otherUser) ? otherUser[0] : otherUser;

                                return (
                                    <Link href={`/messages/${conv.id}`} key={conv.id}>
                                        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer mb-2">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={participant?.avatar_url} />
                                                <AvatarFallback>{participant?.full_name?.[0] || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-slate-900 truncate">{participant?.full_name || 'Unknown User'}</h3>
                                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    Click to view conversation...
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
                                <MessageSquare className="h-10 w-10 mx-auto text-slate-200 mb-4" />
                                <h3 className="text-lg font-semibold text-slate-800">No messages yet</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    Start a conversation from a Service or Profile page!
                                </p>
                                <Link href="/services">
                                    <Button className="mt-4" variant="outline">Browse Services</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
