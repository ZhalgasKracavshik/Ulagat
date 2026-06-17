import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";
import { sendGroupMessage } from "./actions";

interface PageProps {
    params: Promise<{ groupId: string }>;
}

/** Minimal shape of a `group_messages` row joined with its sender profile. */
type GroupMessageRow = {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    sender:
        | { full_name: string | null; avatar_url: string | null }
        | { full_name: string | null; avatar_url: string | null }[]
        | null;
};

export default async function GroupChatPage({ params }: PageProps) {
    const { groupId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Server component: resolve locale from cookie and translate via dictionary.
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let value = resolveKey(dict, key);
        if (vars) {
            for (const [name, replacement] of Object.entries(vars)) {
                value = value.replace(`{${name}}`, String(replacement));
            }
        }
        return value;
    };

    // Fetch group details
    const { data: group } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (!group) return <div className="container py-10 text-center">{t('messages.groupNotFound')}</div>;

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
                        <Users className="w-3 h-3" /> {t('messages.groupMembers', { count: memberCount ?? 0 })}
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted rounded-lg mb-4">
                {messages && (messages as GroupMessageRow[]).map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    const sender = Array.isArray(msg.sender) ? msg.sender[0] : msg.sender;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isMe ? '' : 'flex gap-2'}`}>
                                {!isMe && (
                                    <Avatar className="w-6 h-6 mt-1">
                                        <AvatarImage src={sender?.avatar_url ?? undefined} />
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
                    placeholder={t('messages.typeMessage')}
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
