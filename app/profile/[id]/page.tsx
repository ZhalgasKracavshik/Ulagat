
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Star, Calendar, ShieldCheck, Users, ExternalLink } from "lucide-react";
import { ServiceCard } from "@/components/services/ServiceCard";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendButton } from "@/components/shared/FriendButton";
import { AchievementsSection } from "@/components/profile/AchievementsSection";
import { ContactTutorButton } from "@/components/shared/ContactTutorButton";
import { InviteParentSection } from "@/components/profile/InviteParentSection";
import { PersonalCabinet } from "@/components/profile/PersonalCabinet";
import { verifyChain } from "@/lib/reputation";
import { resolvePlan } from "@/lib/subscription-plan";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
    let { id } = await params;
    const supabase = await createClient();

    // Handle "me" shortcut
    let currentUser = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) currentUser = user;

    if (id === 'me') {
        if (!user) {
            return (
                <div className="container py-20 text-center">
                    <p className="mb-4 text-lg text-muted-foreground">Please log in to view your profile.</p>
                    <Link href="/login" className="px-6 py-2 bg-primary text-white rounded-full font-medium">Log In</Link>
                </div>
            );
        }
        id = user.id;
    }

    // Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    if (!profile) {
        return <div className="container py-20 text-center text-xl">User not found 😕</div>;
    }

    const isOwner = currentUser?.id === profile.id;

    // P1-3: pending/rejected achievements (and rejection reasons) are private —
    // only the profile owner and admins/moderators may see them.
    let viewerRole: string | null = null;
    if (currentUser && !isOwner) {
        const { data: viewerProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();
        viewerRole = viewerProfile?.role ?? null;
    }
    const canSeeAllAchievements = isOwner || (!!viewerRole && ['admin', 'moderator'].includes(viewerRole));

    // Fetch Services
    const { data: services } = await supabase
        .from('services')
        .select('*, profiles:owner_id(*)')
        .eq('owner_id', id)
        .eq('status', 'active');

    // Fetch Events
    const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', id);

    // Fetch Achievements (visitors only see verified ones — see P1-3 above)
    let achievementsQuery = supabase
        .from('achievements')
        .select('*')
        .eq('user_id', id)
        .order('achievement_date', { ascending: false });
    if (!canSeeAllAchievements) {
        achievementsQuery = achievementsQuery.eq('status', 'verified');
    }
    const { data: achievements } = await achievementsQuery;

    // Fetch Reputation Stats
    const { data: repBlocks } = await supabase
        .from('reputation_ledger')
        .select('points, action_type')
        .eq('user_id', id);

    const totalPoints = repBlocks?.reduce((sum: number, b: any) => sum + (b.points || 0), 0) || 0;
    const totalActions = repBlocks?.filter((b: any) => b.action_type !== 'genesis').length || 0;
    const isChainValid = await verifyChain(id);

    // Premium status — only needed for the owner's cabinet badge.
    let isPremium = false;
    if (isOwner) {
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan, status, current_period_end')
            .eq('user_id', id)
            .maybeSingle();
        isPremium = resolvePlan(subscription ?? null, Date.now()) === 'premium';
    }

    // Fetch Friends
    const { data: friendships } = await supabase
        .from('friendships')
        .select('*, requester:requester_id(id, full_name, avatar_url), addressee:addressee_id(id, full_name, avatar_url)')
        .or(`requester_id.eq.${id},addressee_id.eq.${id}`)
        .eq('status', 'accepted');

    // Check friendship status with current user
    let friendStatus: "none" | "pending_sent" | "pending_received" | "accepted" = "none";
    let friendshipId: string | undefined;

    if (currentUser && !isOwner) {
        const { data: fs } = await supabase
            .from('friendships')
            .select('*')
            .or(`and(requester_id.eq.${currentUser.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${currentUser.id})`)
            .single();

        if (fs) {
            friendshipId = fs.id;
            if (fs.status === 'accepted') {
                friendStatus = 'accepted';
            } else if (fs.requester_id === currentUser.id) {
                friendStatus = 'pending_sent';
            } else {
                friendStatus = 'pending_received';
            }
        }
    }

    // Fetch existing unused invite tokens (only for the profile owner)
    let existingInviteTokens: { token: string; expires_at: string; used_at: string | null }[] = [];
    if (isOwner && (profile.role === 'student' || profile.role === 'parliament')) {
        const { data: tokens } = await supabase
            .from('parent_invite_tokens')
            .select('token, expires_at, used_at')
            .eq('student_id', id)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(5);
        existingInviteTokens = tokens || [];
    }

    // Build friends list for display
    const friendsList = (friendships || []).map((f: any) => {
        const friend = f.requester_id === id
            ? (Array.isArray(f.addressee) ? f.addressee[0] : f.addressee)
            : (Array.isArray(f.requester) ? f.requester[0] : f.requester);
        return friend;
    }).filter(Boolean);

    return (
        <div className="min-h-screen bg-background">
            {/* Owner: Personal Cabinet (home base) above the tabs. */}
            {isOwner && (
                <div className="container mx-auto px-4 pt-8">
                    <PersonalCabinet
                        profile={profile}
                        totalPoints={totalPoints}
                        isChainValid={isChainValid}
                        isPremium={isPremium}
                    />
                    {(profile.role === 'student' || profile.role === 'parliament') && (
                        <div id="invite" className="mt-6 max-w-md scroll-mt-20">
                            <InviteParentSection
                                studentId={id}
                                existingTokens={existingInviteTokens}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Public header / cover area (non-owner view stays as before). */}
            {!isOwner && (
            <div className="bg-card border-b border-border">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        {/* Avatar */}
                        <div className="relative group">
                            <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-card shadow-lg">
                                <AvatarImage src={profile.avatar_url} className="object-cover" />
                                <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                    {profile.full_name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                                <h1 className="text-3xl font-bold text-foreground">{profile.full_name}</h1>

                                <div className="flex gap-2">
                                    <Badge variant="secondary" className="capitalize px-3 py-1">
                                        {profile.role}
                                    </Badge>
                                    {isChainValid ? (
                                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200 hover:bg-green-100 border-green-200 gap-1">
                                            <ShieldCheck className="w-3 h-3" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 hover:bg-red-100 border-red-200 gap-1" title="Reputation ledger has been tampered with">
                                            <ShieldCheck className="w-3 h-3" />
                                            Invalid Ledger
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
                                {profile.bio || "This user hasn't written a bio yet."}
                            </p>

                            {/* Social Links */}
                            {profile.social_links && profile.social_links.length > 0 && (
                                <div className="flex items-center gap-3 pt-1 flex-wrap">
                                    {profile.social_links.map((link: any, idx: number) => (
                                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors bg-primary/5 px-3 py-1 rounded-full">
                                            <ExternalLink className="w-3 h-3" />
                                            {link.network.charAt(0).toUpperCase() + link.network.slice(1)}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Quick Stats Row */}
                            <div className="flex items-center justify-center md:justify-start gap-6 pt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold text-foreground">{totalPoints}</span> Points
                                </div>
                                <div className="flex items-center gap-1">
                                    <Crown className="w-4 h-4 text-indigo-500" />
                                    <span className="font-semibold text-foreground">{totalActions}</span> Activities
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span className="font-semibold text-foreground">{friendsList.length}</span> Friends
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    Joined {new Date(profile.created_at).getFullYear()}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 items-center">
                            {currentUser && (
                                <>
                                    <FriendButton
                                        targetUserId={id}
                                        currentUserId={currentUser?.id || null}
                                        initialStatus={friendStatus}
                                        friendshipId={friendshipId}
                                    />
                                    <ContactTutorButton
                                        otherUserId={id}
                                        currentUserId={currentUser?.id || null}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Tabs Content */}
            <div className="container mx-auto px-4 py-8">
                <Tabs defaultValue="achievements" className="space-y-6">
                    <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex h-12 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
                        <TabsTrigger value="achievements" className="rounded-md px-6 py-2">Achievements</TabsTrigger>
                        <TabsTrigger value="services" className="rounded-md px-6 py-2">Services</TabsTrigger>
                        {profile.role !== 'student' && <TabsTrigger value="events" className="rounded-md px-6 py-2">Events</TabsTrigger>}
                        <TabsTrigger value="friends" className="rounded-md px-6 py-2">Friends</TabsTrigger>
                    </TabsList>

                    {/* Achievements Tab */}
                    <TabsContent value="achievements" className="animate-in fade-in-50 duration-300">
                        <AchievementsSection achievements={achievements || []} isOwner={isOwner} />
                    </TabsContent>

                    {/* Services Tab */}
                    <TabsContent value="services" className="space-y-6 animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services && services.length > 0 ? (
                                services.map((service: any) => (
                                    <ServiceCard key={service.id} service={service} />
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed border-border">
                                    <p className="text-muted-foreground">No active services.</p>
                                    {isOwner && profile.role !== 'student' && (
                                        <Link href="/services/new" className="text-primary font-medium hover:underline mt-2 inline-block">
                                            Create a Service &rarr;
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Events Tab */}
                    <TabsContent value="events" className="space-y-6 animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events && events.length > 0 ? (
                                events.map((event: any) => (
                                    <Card key={event.id} className="overflow-hidden hover:shadow-md transition-all">
                                        <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500" />
                                        <CardHeader>
                                            <CardTitle>{event.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <Badge variant="secondary">{event.location}</Badge>
                                                <Badge variant="outline">{new Date(event.event_date).toLocaleDateString()}</Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed border-border">
                                    <p className="text-muted-foreground">No events hosted yet.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Friends Tab */}
                    <TabsContent value="friends" className="animate-in fade-in-50 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {friendsList.length > 0 ? (
                                friendsList.map((friend: any) => (
                                    <Link href={`/profile/${friend.id}`} key={friend.id}>
                                        <Card className="hover:shadow-md transition-all p-4 flex items-center gap-3">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={friend.avatar_url} />
                                                <AvatarFallback>{friend.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-bold text-sm">{friend.full_name}</p>
                                            </div>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="col-span-full py-12 text-center bg-card rounded-xl border border-dashed border-border">
                                    <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-muted-foreground">No friends yet.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
