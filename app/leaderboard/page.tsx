
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Trophy, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic'; // Force refresh

export default async function LeaderboardPage() {
    const supabase = await createClient();

    // 1. Fetch all profiles
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role');

    if (profileError) {
        return <div className="container py-10">Error loading profiles: {profileError.message}</div>;
    }

    // 2. Fetch all reputation blocks to calculate scores
    // In a real app with many users, this should be a DB view or RPC function!
    const { data: ledger, error: ledgerError } = await supabase
        .from('reputation_ledger')
        .select('user_id, points');

    if (ledgerError) {
        return <div className="container py-10">Error loading ledger: {ledgerError.message}</div>;
    }

    // 3. Aggregate scores
    const scores: Record<string, number> = {};
    if (ledger) {
        ledger.forEach(block => {
            scores[block.user_id] = (scores[block.user_id] || 0) + block.points;
        });
    }

    // 4. Combine and Sort
    const leaderboard = profiles
        .map(profile => ({
            ...profile,
            points: scores[profile.id] || 0
        }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 10); // Top 10

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600">
                    Smart Reputation Leaderboard
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Top students and teachers verifying their achievements on the Ulagat Blockchain.
                </p>
            </div>

            <div className="grid gap-4 max-w-3xl mx-auto">
                {leaderboard.length > 0 ? (
                    leaderboard.map((user, index) => (
                        <Card key={user.id} className={`
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

                                <Link href={`/profile/${user.id}`} className="flex items-center gap-4 sm:gap-6 flex-grow min-w-0 group/user">
                                    <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-white shadow-sm transition-transform group-hover/user:scale-105">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback className="bg-slate-100">{user.full_name?.[0]}</AvatarFallback>
                                    </Avatar>

                                    <div className="flex-grow min-w-0">
                                        <h3 className="font-extrabold text-lg sm:text-xl truncate flex items-center gap-2 text-slate-900 group-hover/user:text-primary transition-colors">
                                            {user.full_name}
                                            <ShieldCheck className="w-4 h-4 text-primary opacity-80" />
                                        </h3>
                                        <p className="text-sm text-muted-foreground capitalize font-medium">{user.role}</p>
                                    </div>
                                </Link>

                                <div className="text-right pl-4">
                                    <div className="font-black text-2xl sm:text-3xl text-primary tabular-nums tracking-tight">
                                        {user.points}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                                        Points
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 space-y-4">
                        <Trophy className="w-16 h-16 mx-auto text-slate-200" />
                        <h3 className="text-xl font-bold text-slate-400">No Champions Yet</h3>
                        <p className="text-muted-foreground">Be the first to earn reputation!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
