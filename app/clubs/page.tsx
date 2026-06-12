import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Star, Tag, PlusCircle } from "lucide-react";
import Link from "next/link";
import {
    CLUB_CATEGORIES,
    CLUB_CATEGORY_LABELS,
    CLUB_CREATOR_ROLES,
    isClubCategory,
} from "@/lib/clubs";
import { CLUB_CATEGORY_ICONS } from "@/components/clubs/category-icons";
import type { Club } from "@/types";

export const dynamic = 'force-dynamic';

export default async function ClubsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const rawCategory = typeof params?.category === 'string' ? params.category : null;
    const categoryFilter = rawCategory && isClubCategory(rawCategory) ? rawCategory : null;

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
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        School Clubs
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        Find your people. Join a club, show up, and climb the club leaderboard.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/clubs/leaderboard">
                        <Button variant="outline" size="lg" className="rounded-full gap-2 font-bold px-6 border-amber-300 text-amber-700 hover:bg-amber-50">
                            <Trophy className="w-5 h-5" />
                            Leaderboard
                        </Button>
                    </Link>
                    {canCreateClub && (
                        <Link href="/clubs/new">
                            <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6 bg-violet-600 hover:bg-violet-700">
                                <PlusCircle className="w-5 h-5" />
                                Create Club
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Category filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <Link href="/clubs">
                    <Button variant={!categoryFilter ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                        All
                    </Button>
                </Link>
                {CLUB_CATEGORIES.map((category) => (
                    <Link key={category} href={`/clubs?category=${category}`}>
                        <Button
                            variant={categoryFilter === category ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full px-4"
                        >
                            {CLUB_CATEGORY_LABELS[category]}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clubs.length > 0 ? (
                    clubs.map((club) => {
                        const CategoryIcon = CLUB_CATEGORY_ICONS[club.category];
                        return (
                            <Card key={club.id} className="group hover:shadow-xl transition-all border-violet-100 overflow-hidden">
                                <div className="aspect-video w-full bg-slate-100 relative">
                                    {club.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={club.logo_url} alt={club.name} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full bg-violet-50 text-violet-200">
                                            <CategoryIcon className="w-16 h-16" />
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2">
                                        <Badge variant="outline" className="bg-white/90 border-violet-200 text-violet-700 font-bold shadow-sm">
                                            {CLUB_CATEGORY_LABELS[club.category]}
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
                                            {memberCounts[club.id] || 0} members
                                        </span>
                                        <span className="flex items-center gap-1 font-bold text-amber-600">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            {club.points} pts
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="line-clamp-3 text-sm text-slate-600 min-h-[3.75rem]">
                                        {club.description || 'No description yet.'}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Link href={`/clubs/${club.id}`} className="w-full">
                                        <Button className="w-full" variant="outline">
                                            View Club
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-violet-50 rounded-full flex items-center justify-center">
                            <Users className="w-12 h-12 text-violet-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No Clubs Yet</h3>
                        <p className="text-muted-foreground">
                            {categoryFilter
                                ? `No ${CLUB_CATEGORY_LABELS[categoryFilter]} clubs yet. Try another category!`
                                : "Be the first to start a club at BINOM!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
