import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Medal, Trophy, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CLUB_CATEGORY_LABELS } from "@/lib/clubs";
import { CLUB_CATEGORY_ICONS } from "@/components/clubs/category-icons";
import type { Club } from "@/types";

export const dynamic = 'force-dynamic';

export default async function ClubLeaderboardPage() {
    const supabase = await createClient();

    const { data: clubsRaw } = await supabase
        .from('clubs')
        .select('*')
        .eq('status', 'active')
        .order('points', { ascending: false })
        .order('name', { ascending: true });

    const clubs = (clubsRaw ?? []) as Club[];

    // Member counts per club
    const memberCounts: Record<string, number> = {};
    if (clubs.length > 0) {
        const { data: members } = await supabase
            .from('club_members')
            .select('club_id')
            .in('club_id', clubs.map((c) => c.id));
        (members ?? []).forEach((m: { club_id: string }) => {
            memberCounts[m.club_id] = (memberCounts[m.club_id] || 0) + 1;
        });
    }

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-purple-500 to-violet-600">
                    Club Leaderboard
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Every recorded meeting earns points — 5 for holding it, plus 1 per attendee.
                    The most active clubs rise to the top.
                </p>
                <Link href="/clubs" className="inline-flex">
                    <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
                        <ArrowLeft className="w-4 h-4" />
                        Back to all clubs
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 max-w-3xl mx-auto">
                {clubs.length > 0 ? (
                    clubs.map((club, index) => {
                        const CategoryIcon = CLUB_CATEGORY_ICONS[club.category];
                        return (
                            <Card key={club.id} className={`
                                transform transition-all duration-300 hover:scale-[1.02] border-2
                                ${index === 0 ? 'border-yellow-400 bg-yellow-50/50 shadow-yellow-200 shadow-xl' : ''}
                                ${index === 1 ? 'border-slate-300 bg-slate-50/50 shadow-md' : ''}
                                ${index === 2 ? 'border-orange-300 bg-orange-50/50 shadow-md' : ''}
                                ${index > 2 ? 'border-transparent hover:border-border' : ''}
                            `}>
                                <CardContent className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6">
                                    <div className="flex-shrink-0 w-10 text-center font-bold text-xl text-slate-400">
                                        {index === 0 && <Crown className="w-10 h-10 text-yellow-500 mx-auto animate-pulse drop-shadow-md" />}
                                        {index === 1 && <Medal className="w-9 h-9 text-slate-400 mx-auto drop-shadow-sm" />}
                                        {index === 2 && <Medal className="w-9 h-9 text-orange-500 mx-auto drop-shadow-sm" />}
                                        {index > 2 && <span className="text-slate-300">#{index + 1}</span>}
                                    </div>

                                    <Link href={`/clubs/${club.id}`} className="flex items-center gap-4 sm:gap-6 flex-grow min-w-0 group/club">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-violet-50 flex items-center justify-center shrink-0 transition-transform group-hover/club:scale-105">
                                            {club.logo_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={club.logo_url} alt={club.name} className="object-cover w-full h-full" />
                                            ) : (
                                                <CategoryIcon className="w-7 h-7 sm:w-9 sm:h-9 text-violet-300" />
                                            )}
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-extrabold text-lg sm:text-xl truncate text-slate-900 group-hover/club:text-primary transition-colors">
                                                {club.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Badge variant="outline" className="border-violet-200 text-violet-700 text-[10px] font-bold">
                                                    {CLUB_CATEGORY_LABELS[club.category]}
                                                </Badge>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {memberCounts[club.id] || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    <div className="text-right pl-4">
                                        <div className="font-black text-2xl sm:text-3xl text-primary tabular-nums tracking-tight">
                                            {club.points}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                                            Points
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-20 space-y-4">
                        <Trophy className="w-16 h-16 mx-auto text-slate-200" />
                        <h3 className="text-xl font-bold text-slate-400">No Clubs on the Board Yet</h3>
                        <p className="text-muted-foreground">
                            Create a club and record meetings to start earning points!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
