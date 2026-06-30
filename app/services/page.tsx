
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ServiceCard } from "@/components/services/ServiceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Store } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { SERVICE_CATEGORIES, SERVICE_CREATOR_ROLES } from "@/lib/services";
import { serviceCategoryKey } from "@/lib/services-i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";
import type { Service, Profile } from "@/types";

/** A service row joined with its owner profile, as consumed by ServiceCard. */
type ServiceWithOwner = Service & { profiles?: Partial<Profile> | null };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const supabase = await createClient();
    const params = await searchParams;
    const categoryFilter = typeof params?.category === 'string' ? params.category : null;
    const submitted = Boolean(params?.submitted || params?.payment_success);

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const { data: { user } } = await supabase.auth.getUser();
    let profile: { role: string } | null = null;
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

    const { data: services } = await query;

    const canPost =
        profile !== null && (SERVICE_CREATOR_ROLES as readonly string[]).includes(profile.role);

    return (
        <div className="container mx-auto py-8 space-y-8 min-h-screen px-4 md:px-6">
            {/* Success Banner */}
            {submitted && (
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 text-green-700 dark:text-green-200 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">{t('servicesList.submittedTitle')} </strong>
                    <span className="block sm:inline">{t('servicesList.submittedBody')}</span>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-gradient-to-r from-primary/5 to-transparent p-6 rounded-2xl border border-primary/10">
                <div className="space-y-2">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                        {t('servicesList.title')}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-xl">
                        {t('servicesList.subtitle')}
                    </p>
                </div>
                {/* Teachers, Admins, Moderators and Parliament can post */}
                {canPost && (
                    <Link href="/services/new">
                        <Button size="lg" className="rounded-full shadow-lg gap-2 text-md font-bold px-6">
                            <PlusCircle className="w-5 h-5" />
                            {t('servicesList.postListing')}
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filter Bar */}
            <div className="sticky top-2 z-30 bg-background/80 backdrop-blur-lg p-2 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 px-2 scrollbar-none">
                    <Link href="/services">
                        <Button variant={!categoryFilter ? "secondary" : "ghost"} size="sm" className="rounded-full">{t('servicesList.all')}</Button>
                    </Link>
                    {SERVICE_CATEGORIES.map(cat => (
                        <Link key={cat.value} href={`/services?category=${cat.value}`}>
                            <Button
                                variant={categoryFilter === cat.value ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-full text-muted-foreground"
                            >
                                {t(serviceCategoryKey(cat.value))}
                            </Button>
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto bg-muted rounded-full px-3 py-1">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder={t('servicesList.searchPlaceholder')}
                        className="border-0 bg-transparent focus-visible:ring-0 h-8 w-full md:w-[200px]"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services && services.length > 0 ? (
                    (services as ServiceWithOwner[]).map((service) => (
                        <ServiceCard key={service.id} service={service} />
                    ))
                ) : (
                    <div className="col-span-full">
                        <EmptyState
                            icon={Store}
                            title={categoryFilter ? t('servicesList.emptyTitleCategory') : t('servicesList.emptyTitle')}
                            description={t('servicesList.emptyBody')}
                            tint="bg-indigo-50 dark:bg-indigo-950/40"
                            iconColor="text-indigo-400"
                            action={{ href: '/services/new', label: t('servicesList.createFirst') }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
