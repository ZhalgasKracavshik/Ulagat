import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, PlusCircle, Tag, Search, PackageSearch, Clock } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import {
    LOST_ITEM_CATEGORIES,
    LOST_ITEM_CATEGORY_LABELS,
    LOST_ITEM_STATUSES,
    LOST_ITEM_STATUS_LABELS,
    LOST_ITEM_POSTER_ROLES,
    isLostItemCategory,
    isLostItemStatus,
} from "@/lib/lost-found";
import { LOST_ITEM_CATEGORY_ICONS } from "@/components/lost-found/category-icons";
import { StatusBadge } from "@/components/lost-found/StatusBadge";
import type { LostItem } from "@/types";

export const dynamic = 'force-dynamic';

export default async function LostFoundPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    const rawStatus = typeof params?.status === 'string' ? params.status : null;
    const statusFilter = rawStatus && isLostItemStatus(rawStatus) ? rawStatus : null;
    const rawCategory = typeof params?.category === 'string' ? params.category : null;
    const categoryFilter = rawCategory && isLostItemCategory(rawCategory) ? rawCategory : null;
    const search = typeof params?.q === 'string' ? params.q.trim() : '';

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
        .from('lost_items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (statusFilter) query = query.eq('status', statusFilter);
    if (categoryFilter) query = query.eq('category', categoryFilter);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data: itemsRaw } = await query;
    const items = (itemsRaw ?? []) as LostItem[];

    const canPost = role !== null && (LOST_ITEM_POSTER_ROLES as readonly string[]).includes(role);

    // Preserve active filters across chip links.
    const buildHref = (overrides: { status?: string | null; category?: string | null }) => {
        const sp = new URLSearchParams();
        const s = overrides.status === undefined ? statusFilter : overrides.status;
        const c = overrides.category === undefined ? categoryFilter : overrides.category;
        if (s) sp.set('status', s);
        if (c) sp.set('category', c);
        if (search) sp.set('q', search);
        const qs = sp.toString();
        return qs ? `/lost-found?${qs}` : '/lost-found';
    };

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-teal-500/10 to-transparent p-6 rounded-2xl border border-teal-500/10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                        <PackageSearch className="w-9 h-9 text-teal-600" />
                        Lost &amp; Found
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        Lost something? Found something? Post it here and reunite items with their owners.
                    </p>
                </div>
                {canPost && (
                    <Link href="/lost-found/new">
                        <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6 bg-teal-600 hover:bg-teal-700">
                            <PlusCircle className="w-5 h-5" />
                            Post Item
                        </Button>
                    </Link>
                )}
            </div>

            {/* Search */}
            <form action="/lost-found" method="get" className="flex gap-2 max-w-xl">
                {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        name="q"
                        defaultValue={search}
                        placeholder="Search by title…"
                        className="pl-9 h-11 rounded-full border-slate-200"
                    />
                </div>
                <Button type="submit" variant="secondary" className="rounded-full h-11 px-6">Search</Button>
            </form>

            {/* Status filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Status</span>
                <Link href={buildHref({ status: null })}>
                    <Button variant={!statusFilter ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                        All
                    </Button>
                </Link>
                {LOST_ITEM_STATUSES.map((status) => (
                    <Link key={status} href={buildHref({ status })}>
                        <Button variant={statusFilter === status ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                            {LOST_ITEM_STATUS_LABELS[status]}
                        </Button>
                    </Link>
                ))}
            </div>

            {/* Category filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <Link href={buildHref({ category: null })}>
                    <Button variant={!categoryFilter ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                        All
                    </Button>
                </Link>
                {LOST_ITEM_CATEGORIES.map((category) => (
                    <Link key={category} href={buildHref({ category })}>
                        <Button variant={categoryFilter === category ? "secondary" : "ghost"} size="sm" className="rounded-full px-4">
                            {LOST_ITEM_CATEGORY_LABELS[category]}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.length > 0 ? (
                    items.map((item) => {
                        const CategoryIcon = LOST_ITEM_CATEGORY_ICONS[item.category];
                        return (
                            <Link key={item.id} href={`/lost-found/${item.id}`} className="group">
                                <Card className="h-full hover:shadow-xl transition-all border-teal-100 overflow-hidden">
                                    <div className="aspect-video w-full bg-slate-100 relative">
                                        {item.photo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.photo_url} alt={item.title} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full bg-teal-50 text-teal-200">
                                                <CategoryIcon className="w-16 h-16" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            <Badge variant="outline" className="bg-white/90 border-teal-200 text-teal-700 font-bold shadow-sm">
                                                {LOST_ITEM_CATEGORY_LABELS[item.category]}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <StatusBadge status={item.status} />
                                        </div>
                                    </div>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="line-clamp-1 text-lg group-hover:text-teal-600 transition-colors">
                                            {item.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <p className="line-clamp-2 text-sm text-slate-600 min-h-[2.5rem]">
                                            {item.description || 'No description.'}
                                        </p>
                                    </CardContent>
                                    <CardFooter className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1 min-w-0 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                                            <span className="truncate">{item.location || 'No location'}</span>
                                        </span>
                                        <span className="flex items-center gap-1 shrink-0">
                                            <Clock className="w-3.5 h-3.5" />
                                            {format(new Date(item.created_at), 'MMM d')}
                                        </span>
                                    </CardFooter>
                                </Card>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="mx-auto w-24 h-24 bg-teal-50 rounded-full flex items-center justify-center">
                            <PackageSearch className="w-12 h-12 text-teal-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Nothing here yet</h3>
                        <p className="text-muted-foreground">
                            {search || statusFilter || categoryFilter
                                ? "No items match your filters. Try clearing them."
                                : "No lost or found items posted yet."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
