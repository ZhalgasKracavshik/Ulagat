import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, Medal, Trophy, Users, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { clubCategoryKey } from "@/lib/clubs-i18n";
import { CLUB_CATEGORY_ICONS } from "@/components/clubs/category-icons";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";
import type { Club } from "@/types";

export const dynamic = 'force-dynamic';

export default async function ClubLeaderboardPage() {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

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
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                    {t('clubLeaderboard.title')}
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    {t('clubLeaderboard.subtitle')}
                </p>
                <Link href="/clubs" className="inline-flex">
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <ArrowLeft className="w-4 h-4" />
                        {t('clubLeaderboard.backToClubs')}
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 max-w-3xl mx-auto">
                {clubs.length > 0 ? (
                    clubs.map((club, index) => {
                        const CategoryIcon = CLUB_CATEGORY_ICONS[club.category] ?? Sparkles;
                        return (
                            <Card key={club.id} className={`
                                transform transition-all duration-300 hover:scale-[1.02] border-2
                                ${index === 0 ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/50 shadow-yellow-200 shadow-xl' : ''}
                                ${index === 1 ? 'border-border bg-muted/50 shadow-md' : ''}
                                ${index === 2 ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/50 shadow-md' : ''}
                                ${index > 2 ? 'border-transparent hover:border-border' : ''}
                            `}>
                                <CardContent className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6">
                                    <div className="flex-shrink-0 w-10 text-center font-bold text-xl text-muted-foreground">
                                        {index === 0 && <Crown className="w-10 h-10 text-yellow-500 mx-auto animate-pulse drop-shadow-md" />}
                                        {index === 1 && <Medal className="w-9 h-9 text-muted-foreground mx-auto drop-shadow-sm" />}
                                        {index === 2 && <Medal className="w-9 h-9 text-orange-500 mx-auto drop-shadow-sm" />}
                                        {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
                                    </div>

                                    <Link href={`/clubs/${club.id}`} className="flex items-center gap-4 sm:gap-6 flex-grow min-w-0 group/club">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0 transition-transform group-hover/club:scale-105">
                                            {club.logo_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={club.logo_url} alt={club.name} className="object-cover w-full h-full" />
                                            ) : (
                                                <CategoryIcon className="w-7 h-7 sm:w-9 sm:h-9 text-violet-300" />
                                            )}
                                        </div>

                                        <div className="flex-grow min-w-0">
                                            <h3 className="font-extrabold text-lg sm:text-xl truncate text-foreground group-hover/club:text-primary transition-colors">
                                                {club.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Badge variant="outline" className="border-violet-200 text-violet-700 text-[10px] font-bold">
                                                    {t(clubCategoryKey(club.category))}
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
                                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full mt-1">
                                            {t('clubLeaderboard.points')}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-20 space-y-4">
                        <Trophy className="w-16 h-16 mx-auto text-slate-200" />
                        <h3 className="text-xl font-bold text-muted-foreground">{t('clubLeaderboard.emptyTitle')}</h3>
                        <p className="text-muted-foreground">
                            {t('clubLeaderboard.emptyBody')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
