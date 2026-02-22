
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, ExternalLink, PlusCircle, Filter } from "lucide-react";
import Link from "next/link";
import { InteractiveButton } from "@/components/shared/InteractiveButton";

export const dynamic = 'force-dynamic';

export default async function OlympiadPrepPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const categoryFilter = typeof params?.category === 'string' ? params.category : null;

    const { data: { user } } = await supabase.auth.getUser();
    let isAdminOrMod = false;
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        isAdminOrMod = ['admin', 'moderator'].includes(profile?.role || '');
    }

    let query = supabase
        .from('study_materials')
        .select('*, profiles:uploaded_by(full_name)')
        .order('created_at', { ascending: false });

    if (categoryFilter) {
        query = query.eq('category', categoryFilter);
    }

    const { data: materials } = await query;

    const CATEGORIES = ["Math", "Physics", "Chemistry", "Biology", "Informatics", "English", "History"];

    const difficultyColors: Record<string, string> = {
        easy: "bg-green-100 text-green-700 border-green-200",
        medium: "bg-amber-100 text-amber-700 border-amber-200",
        hard: "bg-red-100 text-red-700 border-red-200",
    };

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-6 rounded-2xl border border-indigo-200/50">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <GraduationCap className="w-10 h-10 text-indigo-600" />
                        Olympiad Prep Center
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        Study materials, example questions, and resources to ace your next olympiad.
                    </p>
                </div>
                {isAdminOrMod && (
                    <Link href="/olympiad/new">
                        <Button
                            size="lg"
                            className="rounded-full shadow-lg gap-2 font-bold px-6 bg-indigo-600 hover:bg-indigo-700 transition-all hover:ring-4 hover:ring-indigo-200 active:scale-95"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Add Resource
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <Link href="/olympiad">
                    <Button
                        variant={!categoryFilter ? "secondary" : "ghost"}
                        size="sm"
                        className="rounded-full px-4 hover:ring-2 hover:ring-indigo-400/50 transition-all"
                    >
                        All
                    </Button>
                </Link>
                {CATEGORIES.map(cat => (
                    <Link key={cat} href={`/olympiad?category=${cat}`}>
                        <Button
                            variant={categoryFilter === cat ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-full px-4 hover:ring-2 hover:ring-indigo-400/50 transition-all font-medium"
                        >
                            {cat}
                        </Button>
                    </Link>
                ))}
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials && materials.length > 0 ? (
                    materials.map((material: any) => (
                        <Card key={material.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-indigo-100/50 overflow-hidden bg-white">
                            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="space-y-4">
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug">
                                        {material.title}
                                    </CardTitle>
                                    <Badge className={`shrink-0 border shadow-none ${difficultyColors[material.difficulty] || difficultyColors.medium}`}>
                                        {material.difficulty}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-slate-50">{material.category}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {material.description && (
                                    <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{material.description}</p>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                            {material.profiles?.full_name?.[0] || 'A'}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {material.profiles?.full_name || 'Admin'}
                                        </span>
                                    </div>
                                    {material.url && (
                                        <a href={material.url} target="_blank" rel="noopener noreferrer">
                                            <InteractiveButton
                                                size="sm"
                                                variant="outline"
                                                className="gap-1.5 text-indigo-600 border-indigo-200 bg-indigo-50/30 hover:bg-indigo-600 hover:text-white transition-all font-bold"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Open
                                            </InteractiveButton>
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">No Materials Found</h3>
                        <p className="text-muted-foreground">
                            {categoryFilter
                                ? `No resources for "${categoryFilter}" yet.`
                                : "Admins and Moderators will add study materials soon!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
