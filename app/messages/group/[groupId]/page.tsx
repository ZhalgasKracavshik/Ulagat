import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { sendGroupMessage } from "./actions";

interface PageProps {
    params: Promise<{ groupId: string }>;
}

export default async function GroupChatPage({ params }: PageProps) {
    const { groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch group details
    const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (!group) return <div className="container py-10 text-center">Group not found.</div>;

    // Fetch members count
    const { count: memberCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

    // Fetch messages with sender info
    const { data: messages } = await supabase
        .from('group_messages')
        .select('*, sender:sender_id(full_name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

    return (
        <div className="container py-6 max-w-3xl h-[calc(100vh-4rem)] flex flex-col mx-auto px-4">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-4 mb-4">
                <Link href="/messages" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <Avatar className="bg-indigo-100 dark:bg-indigo-900/30">
                    <AvatarImage src={group.avatar_url} />
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 font-bold">{group.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-bold text-xl">{group.name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" /> {memberCount} members
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted rounded-lg mb-4">
                {messages && messages.map((msg: any) => {
                    const isMe = msg.sender_id === user.id;
                    const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isMe ? '' : 'flex gap-2'}`}>
                                {!isMe && (
                                    <Avatar className="w-6 h-6 mt-1">
                                        <AvatarImage src={sender?.avatar_url} />
                                        <AvatarFallback className="text-[8px]">{sender?.full_name?.[0]}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`rounded-2xl px-4 py-2 ${isMe
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : 'bg-card border text-foreground rounded-bl-none shadow-sm'
                                    }`}>
                                    {!isMe && (
                                        <span className="text-[10px] font-bold text-indigo-500 block">{sender?.full_name}</span>
                                    )}
                                    <p>{msg.content}</p>
                                    <span className={`text-[10px] block mt-1 ${isMe ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <form action={sendGroupMessage.bind(null, groupId)} className="flex gap-2">
                <Input
                    name="content"
                    placeholder="Type a message..."
                    className="flex-1"
                    autoComplete="off"
                    required
                />
                <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700">
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
}
