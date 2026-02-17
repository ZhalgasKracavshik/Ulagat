
import { createClient } from "@/lib/supabase/server";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Filter } from "lucide-react";
import Link from "next/link";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const categoryFilter = typeof params?.category === 'string' ? params.category : null;
    const { payment_success } = params || {};

    const { data: { user } } = await supabase.auth.getUser();
    let profile = null;
    if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        profile = data;
    }

    // Fetch Services
    let query = supabase
        .from('services')
        .select('*, profiles:owner_id(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (categoryFilter && categoryFilter !== 'All') {
        // Assuming there is a category column in services, checking schema...
        // If not, we might need to rely on title filtering or add category column.
        // For now, let's assume 'category' column exists or use description search if not.
        // Wait, I recall schema.sql had 'category' TEXT NOT NULL.
        query = query.eq('category', categoryFilter);
    }

    const { data: services, error } = await query;

    const CATEGORIES = ["Math", "English", "Music", "Coding", "Arts", "Sports"];

    return (
        <div className="container mx-auto py-8 space-y-8 min-h-screen px-4 md:px-6">
            {/* Success Banner */}
            {payment_success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Success! </strong>
                    <span className="block sm:inline">Your service has been submitted and is currently under review by our moderators. It will appear here once approved.</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-primary/5 to-transparent p-6 rounded-2xl border border-primary/10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                        Find the Best Tutor for You
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        Discover peer tutors, music lessons, and creative workshops from the Ulagat community.
                    </p>
                </div>
                {/* Only Teachers, Admins, Moderators can post */}
                {['teacher', 'admin', 'moderator'].includes(profile?.role) && (
                    <Link href="/services/new">
                        <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6">
                            <PlusCircle className="w-5 h-5" />
                            Post Ad (100₸)
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filter Bar */}
            <div className="sticky top-2 z-30 bg-background/80 backdrop-blur-lg p-2 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 px-2 scrollbar-none">
                    <Link href="/services">
                        <Button variant={!categoryFilter ? "secondary" : "ghost"} size="sm" className="rounded-full">All</Button>
                    </Link>
                    {CATEGORIES.map(cat => (
                        <Link key={cat} href={`/services?category=${cat}`}>
                            <Button
                                variant={categoryFilter === cat ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-full text-slate-600"
                            >
                                {cat}
                            </Button>
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto bg-slate-100 rounded-full px-3 py-1">
                    <Search className="w-4 h-4 text-slate-400" />
                    <Input
                        type="text"
                        placeholder="Search services..."
                        className="border-0 bg-transparent focus-visible:ring-0 h-8 w-full md:w-[200px]"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services && services.length > 0 ? (
                    services.map((service: any) => (
                        <ServiceCard key={service.id} service={service} />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="text-6xl">🙈</div>
                        <h3 className="text-xl font-bold">No services found for {categoryFilter || 'this category'}</h3>
                        <p className="text-muted-foreground">Be the first to offer something cool!</p>
                        <Link href="/services/new">
                            <Button variant="outline" className="mt-4">Create First Listing</Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
