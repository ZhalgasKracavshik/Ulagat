
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Users2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";

type ConversationParty = { full_name: string | null; avatar_url: string | null };

/** A DM conversation row joined with both participants. */
type ConversationRow = {
    id: string;
    updated_at: string;
    participant1_id: string;
    participant2_id: string;
    participant1: ConversationParty | ConversationParty[] | null;
    participant2: ConversationParty | ConversationParty[] | null;
};

/** A group summary (id, name, avatar, updated_at) used in the list. */
type GroupSummary = {
    id: string;
    name: string | null;
    avatar_url: string | null;
    updated_at: string;
};

export default async function MessagesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Server component: resolve locale from cookie and translate via dictionary.
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    if (!user) {
        return (
            <div className="container py-10 text-center">
                <Link href="/login" className="text-primary underline">{t('messages.login')}</Link>{' '}
                {t('messages.loginPrompt')}
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
    const groupMap = new Map<string, GroupSummary>();
    (userGroups as { groups: GroupSummary | null }[] | null)?.forEach((gm) => {
        if (gm.groups) groupMap.set(gm.groups.id, gm.groups);
    });
    (createdGroups as { id: string; name: string | null; avatar_url: string | null; created_at: string }[] | null)?.forEach((g) => {
        groupMap.set(g.id, { id: g.id, name: g.name, avatar_url: g.avatar_url, updated_at: g.created_at });
    });
    const groups = Array.from(groupMap.values());

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto py-8 max-w-3xl px-4">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-foreground">{t('messages.title')}</h1>
                    <Link href="/messages/new-group">
                        <Button variant="outline" className="gap-2 rounded-full">
                            <Plus className="w-4 h-4" />
                            {t('messages.newGroup')}
                        </Button>
                    </Link>
                </div>

                {/* Group Chats Section */}
                {groups.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Users2 className="w-4 h-4" /> {t('messages.groups')}
                        </h2>
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <Link href={`/messages/group/${group.id}`} key={group.id}>
                                    <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer mb-2">
                                        <Avatar className="h-12 w-12 bg-indigo-100 dark:bg-indigo-950/40">
                                            <AvatarImage src={group.avatar_url ?? undefined} />
                                            <AvatarFallback className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold">{group.name?.[0] || 'G'}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground truncate">{group.name}</h3>
                                            <p className="text-xs text-muted-foreground">{t('messages.groupChat')}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Direct Messages Section */}
                <div>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> {t('messages.directMessages')}
                    </h2>
                    <div className="space-y-2">
                        {conversations && conversations.length > 0 ? (
                            (conversations as ConversationRow[]).map((conv) => {
                                const otherUser = conv.participant1_id === user.id ? conv.participant2 : conv.participant1;
                                const participant = Array.isArray(otherUser) ? otherUser[0] : otherUser;

                                return (
                                    <Link href={`/messages/${conv.id}`} key={conv.id}>
                                        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-all cursor-pointer mb-2">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={participant?.avatar_url ?? undefined} />
                                                <AvatarFallback>{participant?.full_name?.[0] || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-foreground truncate">{participant?.full_name || t('messages.unknownUser')}</h3>
                                                    <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">
                                                    {t('messages.clickToView')}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
                                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground">{t('messages.emptyTitle')}</h3>
                                <p className="text-muted-foreground text-sm mt-1">
                                    {t('messages.emptyBody')}
                                </p>
                                <Link href="/services">
                                    <Button className="mt-4" variant="outline">{t('messages.browseServices')}</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
