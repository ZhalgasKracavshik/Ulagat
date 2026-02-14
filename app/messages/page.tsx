
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
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

    // Fetch conversations (Simple query, no complex joins for MVP)
    // We want the other participant's info.
    // This query is slightly complex in raw Supabase JS.
    // Let's fetch all conversations where user is participant.
    const { data: conversations } = await supabase
        .from('conversations')
        .select(`
            id,
            updated_at,
            participant1:participant1_id(full_name, avatar_url),
            participant2:participant2_id(full_name, avatar_url)
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

    return (
        <div className="container py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Messages</h1>

            <div className="space-y-4">
                {conversations && conversations.length > 0 ? (
                    conversations.map((conv: any) => {
                        // Determine who the "other" person is
                        const otherUser = conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
                        // Handle potential array return or single object
                        const participant = Array.isArray(otherUser) ? otherUser[0] : otherUser;

                        return (
                            <Link href={`/messages/${conv.id}`} key={conv.id}>
                                <Card className="hover:bg-slate-50 transition-colors">
                                    <CardContent className="flex items-center gap-4 p-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={participant?.avatar_url} />
                                            <AvatarFallback>{participant?.full_name?.[0] || '?'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg">{participant?.full_name || 'Unknown User'}</h3>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                Click to view conversation...
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed">
                        <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No messages yet</h3>
                        <p className="text-muted-foreground">
                            Start a conversation from a Service page!
                        </p>
                        <Link href="/services">
                            <Button className="mt-4" variant="outline">Browse Services</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
