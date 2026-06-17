
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";
import { sendMessage } from "./actions";

interface PageProps {
    params: Promise<{ id: string }>;
}

/** Minimal shape of a row from the `messages` table used by this view. */
type MessageRow = {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
};

export default async function ChatPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Server component: resolve locale from cookie and translate via dictionary.
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    // Fetch conversation details to show header
    const { data: conversation } = await supabase
        .from('conversations')
        .select(`
            *,
            participant1:participant1_id(full_name, avatar_url),
            participant2:participant2_id(full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

    if (!conversation) return <div>{t('messages.conversationNotFound')}</div>;

    // Identify other participant
    const otherParticipant = conversation.participant1_id === user.id ? conversation.participant2 : conversation.participant1;
    // Handle array destructuring safely if needed (Supabase sometimes returns arrays for joins)
    const partner = Array.isArray(otherParticipant) ? otherParticipant[0] : otherParticipant;

    // Fetch messages
    const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });

    return (
        <div className="container py-8 max-w-3xl h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-4 mb-4">
                <Avatar>
                    <AvatarImage src={partner?.avatar_url} />
                    <AvatarFallback>{partner?.full_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <h2 className="font-bold text-xl">{partner?.full_name}</h2>
                    <p className="text-xs text-muted-foreground">{t('messages.activeNow')}</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted rounded-lg mb-4">
                {messages && (messages as MessageRow[]).map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-card border text-foreground rounded-bl-none shadow-sm'
                                }`}>
                                <p>{msg.content}</p>
                                <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-100' : 'text-muted-foreground'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <form action={sendMessage.bind(null, id)} className="flex gap-2">
                <Input
                    name="content"
                    placeholder={t('messages.typeMessage')}
                    className="flex-1"
                    autoComplete="off"
                    required
                />
                <Button type="submit" size="icon">
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
}
