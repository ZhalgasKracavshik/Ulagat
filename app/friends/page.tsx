
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, UserPlus, Search, Clock, Check, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendButton } from "@/components/shared/FriendButton";
import { UserSearch } from "@/components/social/UserSearch";

export default async function FriendsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    // 1. Fetch All Friendships for the current user
    const { data: friendships } = await supabase
        .from('friendships')
        .select(`
            *,
            requester:requester_id(id, full_name, avatar_url, role),
            addressee:addressee_id(id, full_name, avatar_url, role)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const incomingRequests = (friendships || []).filter(f => f.addressee_id === user.id && f.status === 'pending');
    const sentRequests = (friendships || []).filter(f => f.requester_id === user.id && f.status === 'pending');
    const friends = (friendships || []).filter(f => f.status === 'accepted').map(f => {
        return f.requester_id === user.id ? f.addressee : f.requester;
    });

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-foreground flex items-center gap-3">
                        <Users className="w-10 h-10 text-primary" />
                        Community Hub
                    </h1>
                    <p className="text-muted-foreground text-lg">Manage your friends and find new people in the Ulagat community.</p>
                </div>
                <div className="w-full md:w-80">
                    <UserSearch />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Friends List - Left/Center */}
                <div className="lg:col-span-2 space-y-8">
                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                            My Friends
                            <Badge variant="secondary" className="rounded-full">{friends.length}</Badge>
                        </h2>
                        {friends.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {friends.map((friend: any) => (
                                    <Card key={friend.id} className="hover:shadow-md transition-all group border-border overflow-hidden">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <Link href={`/profile/${friend.id}`} className="flex items-center gap-3 flex-grow min-w-0">
                                                <Avatar className="w-12 h-12 border">
                                                    <AvatarImage src={friend.avatar_url} />
                                                    <AvatarFallback>{friend.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="truncate">
                                                    <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{friend.full_name}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{friend.role}</p>
                                                </div>
                                            </Link>
                                            <FriendButton
                                                targetUserId={friend.id}
                                                currentUserId={user.id}
                                                initialStatus="accepted"
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-muted rounded-2xl border border-dashed">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-muted-foreground">You haven't added any friends yet.</p>
                                <p className="text-xs text-muted-foreground mt-1">Search for people or visit their profiles to connect.</p>
                            </div>
                        )}
                    </section>
                </div>

                {/* Requests Sidebar - Right */}
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            Invitations
                            {incomingRequests.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-bounce" />}
                        </h2>
                        {incomingRequests.length > 0 ? (
                            <div className="space-y-3">
                                {incomingRequests.map((req: any) => (
                                    <Card key={req.id} className="border-indigo-100 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-sm overflow-hidden">
                                        <CardContent className="p-4 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10 border shadow-sm">
                                                    <AvatarImage src={req.requester?.avatar_url} />
                                                    <AvatarFallback>{req.requester?.full_name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-bold text-sm text-foreground">{req.requester?.full_name}</p>
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tighter">Wants to be friends</p>
                                                </div>
                                            </div>
                                            <FriendButton
                                                targetUserId={req.requester_id}
                                                currentUserId={user.id}
                                                initialStatus="pending_received"
                                                friendshipId={req.id}
                                            />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="border-dashed bg-transparent shadow-none">
                                <CardContent className="p-8 text-center">
                                    <Clock className="w-8 h-8 text-slate-100 mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground">No pending invitations.</p>
                                </CardContent>
                            </Card>
                        )}
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Outbound</h2>
                        <div className="space-y-2">
                            {sentRequests.map((req: any) => (
                                <Card key={req.id} className="border-slate-50 bg-muted/50 shadow-none">
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2 truncate">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={req.addressee?.avatar_url} />
                                                <AvatarFallback>{req.addressee?.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-muted-foreground truncate">{req.addressee?.full_name}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground bg-card shadow-none">SENT</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                            {sentRequests.length === 0 && (
                                <p className="text-[10px] text-muted-foreground italic text-center">No outbound requests.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
