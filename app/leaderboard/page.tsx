
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Medal, Trophy, ShieldCheck, VenetianMask, GraduationCap } from "lucide-react";
import Link from "next/link";
import { anonymousPseudonym } from "@/lib/leaderboard";

export const dynamic = 'force-dynamic';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

type LeaderboardProfile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    grade: number | null;
    leaderboard_anonymous: boolean | null;
};

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const rawGrade = typeof params?.grade === 'string' ? Number(params.grade) : NaN;
    const gradeFilter = Number.isInteger(rawGrade) && rawGrade >= 1 && rawGrade <= 11 ? rawGrade : null;

    // 1. Fetch profiles (optionally filtered by grade)
    let profilesQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, grade, leaderboard_anonymous');
    if (gradeFilter) {
        profilesQuery = profilesQuery.eq('grade', gradeFilter);
    }
    const { data: profilesRaw, error: profileError } = await profilesQuery;

    if (profileError) {
        return <div className="container py-10">Error loading profiles: {profileError.message}</div>;
    }
    const profiles = (profilesRaw ?? []) as LeaderboardProfile[];

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
        ledger.forEach((block: { user_id: string; points: number }) => {
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

            {/* Grade filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-3xl mx-auto">
                <GraduationCap className="w-4 h-4 text-muted-foreground shrink-0" />
                <Link href="/leaderboard">
                    <Button variant={!gradeFilter ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                        All
                    </Button>
                </Link>
                {GRADES.map((grade) => (
                    <Link key={grade} href={`/leaderboard?grade=${grade}`}>
                        <Button
                            variant={gradeFilter === grade ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full px-3 tabular-nums"
                        >
                            {grade}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="grid gap-4 max-w-3xl mx-auto">
                {leaderboard.length > 0 ? (
                    leaderboard.map((user, index) => {
                        const isAnonymous = Boolean(user.leaderboard_anonymous);
                        const displayName = isAnonymous
                            ? anonymousPseudonym(user.id)
                            : user.full_name || 'Unknown';

                        const identity = (
                            <>
                                <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-card shadow-sm transition-transform group-hover/user:scale-105">
                                    {!isAnonymous && <AvatarImage src={user.avatar_url ?? undefined} />}
                                    <AvatarFallback className="bg-muted">
                                        {isAnonymous ? <VenetianMask className="w-6 h-6 text-muted-foreground" /> : user.full_name?.[0]}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-grow min-w-0">
                                    <h3 className="font-extrabold text-lg sm:text-xl truncate flex items-center gap-2 text-foreground group-hover/user:text-primary transition-colors">
                                        {displayName}
                                        <ShieldCheck className="w-4 h-4 text-primary opacity-80" />
                                    </h3>
                                    <p className="text-sm text-muted-foreground capitalize font-medium">
                                        {user.role}
                                        {/* P2-4: grade narrows down who an anonymous entry is — show it only for named entries */}
                                        {!isAnonymous && user.grade ? ` · Grade ${user.grade}` : ''}
                                    </p>
                                </div>
                            </>
                        );

                        return (
                            <Card key={user.id} className={`
                                transform transition-all duration-300 hover:scale-[1.02] border-2
                                ${index === 0 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20 shadow-yellow-200 shadow-xl' : ''}
                                ${index === 1 ? 'border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-muted shadow-md' : ''}
                                ${index === 2 ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 shadow-md' : ''}
                                ${index > 2 ? 'border-transparent hover:border-border' : ''}
                            `}>
                                <CardContent className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6">
                                    <div className="flex-shrink-0 w-10 text-center font-bold text-xl text-muted-foreground">
                                        {index === 0 && <Crown className="w-10 h-10 text-yellow-500 mx-auto animate-pulse drop-shadow-md" />}
                                        {index === 1 && <Medal className="w-9 h-9 text-slate-400 mx-auto drop-shadow-sm" />}
                                        {index === 2 && <Medal className="w-9 h-9 text-orange-500 mx-auto drop-shadow-sm" />}
                                        {index > 2 && <span className="text-muted-foreground/60">#{index + 1}</span>}
                                    </div>

                                    {/* Anonymous entries don't link to a profile — that would defeat the pseudonym */}
                                    {isAnonymous ? (
                                        <div className="flex items-center gap-4 sm:gap-6 flex-grow min-w-0 group/user">
                                            {identity}
                                        </div>
                                    ) : (
                                        <Link href={`/profile/${user.id}`} className="flex items-center gap-4 sm:gap-6 flex-grow min-w-0 group/user">
                                            {identity}
                                        </Link>
                                    )}

                                    <div className="text-right pl-4">
                                        <div className="font-black text-2xl sm:text-3xl text-primary tabular-nums tracking-tight">
                                            {user.points}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full mt-1">
                                            Points
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-20 space-y-4">
                        <Trophy className="w-16 h-16 mx-auto text-muted-foreground/40" />
                        <h3 className="text-xl font-bold text-muted-foreground">No Champions Yet</h3>
                        <p className="text-muted-foreground">
                            {gradeFilter
                                ? `No grade ${gradeFilter} students on the board yet.`
                                : "Be the first to earn reputation!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
