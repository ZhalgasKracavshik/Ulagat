import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Star, Tag, PlusCircle, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import {
    CLUB_CATEGORIES,
    CLUB_CREATOR_ROLES,
    isClubCategory,
} from "@/lib/clubs";
import { clubCategoryKey } from "@/lib/clubs-i18n";
import { CLUB_CATEGORY_ICONS } from "@/components/clubs/category-icons";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";
import type { Club } from "@/types";

export const dynamic = 'force-dynamic';

export default async function ClubsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const rawCategory = typeof params?.category === 'string' ? params.category : null;
    const categoryFilter = rawCategory && isClubCategory(rawCategory) ? rawCategory : null;

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

    const { data: { user } } = await supabase.auth.getUser();
    let role: string | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        role = profile?.role ?? null;
    }

    let query = supabase
        .from('clubs')
        .select('*')
        .eq('status', 'active')
        .order('points', { ascending: false })
        .order('name', { ascending: true });

    if (categoryFilter) {
        query = query.eq('category', categoryFilter);
    }

    const { data: clubsRaw } = await query;
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

    const canCreateClub = role !== null && (CLUB_CREATOR_ROLES as readonly string[]).includes(role);

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-violet-500/10 to-transparent p-6 rounded-2xl border border-violet-500/10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        {t('clubs.title')}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        {t('clubs.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/clubs/leaderboard">
                        <Button variant="outline" size="lg" className="rounded-full gap-2 font-bold px-6 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40">
                            <Trophy className="w-5 h-5" />
                            {t('clubs.leaderboard')}
                        </Button>
                    </Link>
                    {canCreateClub && (
                        <Link href="/clubs/new">
                            <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6 bg-violet-600 hover:bg-violet-700">
                                <PlusCircle className="w-5 h-5" />
                                {t('clubs.createClub')}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Category filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                <Link href="/clubs">
                    <Button variant={!categoryFilter ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                        {t('clubs.all')}
                    </Button>
                </Link>
                {CLUB_CATEGORIES.map((category) => (
                    <Link key={category} href={`/clubs?category=${category}`}>
                        <Button
                            variant={categoryFilter === category ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full px-4"
                        >
                            {t(clubCategoryKey(category))}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.length > 0 ? (
                    clubs.map((club, i) => {
                        const CategoryIcon = CLUB_CATEGORY_ICONS[club.category] ?? Sparkles;
                        return (
                            <Card
                                key={club.id}
                                style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, animationFillMode: 'backwards' }}
                                className="group hover:shadow-xl transition-all border-violet-100 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none"
                            >
                                <div className="aspect-video w-full bg-muted relative">
                                    {club.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={club.logo_url} alt={club.name} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full bg-violet-50 dark:bg-violet-950/40 text-violet-200 dark:text-violet-700">
                                            <CategoryIcon className="w-16 h-16" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <Badge variant="outline" className="bg-card/90 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 font-bold shadow-sm">
                                            {t(clubCategoryKey(club.category))}
                                        </Badge>
                                    </div>
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1 group-hover:text-violet-600 transition-colors">
                                        {club.name}
                                    </CardTitle>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5 text-violet-500" />
                                            {t('clubs.members', { count: memberCounts[club.id] || 0 })}
                                        </span>
                                        <span className="flex items-center gap-1 font-bold text-amber-600">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            {t('clubs.points', { count: club.points })}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="line-clamp-3 text-sm text-muted-foreground min-h-[3.75rem]">
                                        {club.description || t('clubs.noDescription')}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Link href={`/clubs/${club.id}`} className="w-full">
                                        <Button className="w-full" variant="outline">
                                            {t('clubs.viewClub')}
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Users}
                            title={t('clubs.noClubsTitle')}
                            description={categoryFilter ? t('clubs.noClubsCategory', { category: t(clubCategoryKey(categoryFilter)) }) : t('clubs.noClubsDefault')}
                            tint="bg-violet-50 dark:bg-violet-950/40"
                            iconColor="text-violet-300 dark:text-violet-600"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
