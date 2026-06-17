import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, ListFilter, Award } from "lucide-react";
import { ServiceReviewTable } from "@/components/admin/ServiceReviewTable";
import { EventReviewTable } from "@/components/admin/EventReviewTable";
import { MaterialReviewTable } from "@/components/admin/MaterialReviewTable";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export default async function AdminPage() {
    const supabase = await createClient();

    // Check Admin Role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let v = resolveKey(dict, key);
        if (vars) for (const [n, r] of Object.entries(vars)) v = v.replace(`{${n}}`, String(r));
        return v;
    };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">{t('admin.accessDenied')}</h1>
                <p>{t('admin.accessDeniedBody', { role: profile?.role ?? '' })}</p>
            </div>
        );
    }

    const isAdmin = profile.role === 'admin';

    // Fetch Stats
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
    const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });

    // Fetch Pending Content
    const [{ data: pendingServices }, { data: pendingEvents }, { data: pendingMaterials }, { count: pendingAchievements }] = await Promise.all([
        supabase.from('services').select('*, profiles:owner_id(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('events').select('*, profiles:organizer_id(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('study_materials').select('*, profiles:uploaded_by(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    // Fetch ALL Services (for moderation tab)
    const { data: allServices } = await supabase
        .from('services')
        .select('*, profiles:owner_id(full_name, role)')
        .order('created_at', { ascending: false });

    // Fetch All Users
    const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <ShieldAlert className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{t('admin.dashboardTitle')}</h1>
                        <p className="text-muted-foreground">{t('admin.dashboardSubtitle')}</p>
                    </div>
                </div>
                {/* Achievement verification lives at /achievements/review (also accessible to parliament) */}
                <Link href="/achievements/review">
                    <Button variant="outline" className="gap-2 font-bold">
                        <Award className="w-4 h-4 text-amber-500" />
                        {t('admin.reviewAchievements')}
                        {(pendingAchievements ?? 0) > 0 && <Badge className="bg-red-500">{pendingAchievements}</Badge>}
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.totalServices')}</CardTitle>
                        <ListFilter className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{serviceCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('admin.events')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eventCount || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Management Tabs */}
            <Tabs defaultValue="services" className="w-full">
                <TabsList className="w-full md:w-auto">
                    <TabsTrigger value="services" className="flex-1 md:flex-none">
                        {t('admin.tabServices')} {pendingServices && pendingServices.length > 0 && <Badge className="ml-2 bg-red-500">{pendingServices.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex-1 md:flex-none">
                        {t('admin.tabEvents')} {pendingEvents && pendingEvents.length > 0 && <Badge className="ml-2 bg-red-500">{pendingEvents.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="flex-1 md:flex-none">
                        {t('admin.tabMaterials')} {pendingMaterials && pendingMaterials.length > 0 && <Badge className="ml-2 bg-red-500">{pendingMaterials.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="all-services" className="flex-1 md:flex-none">{t('admin.tabAllServices')}</TabsTrigger>
                    <TabsTrigger value="users" className="flex-1 md:flex-none">{t('admin.tabUsers')}</TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.reviewServiceListings')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ServiceReviewTable services={pendingServices || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.reviewEventsOlympiads')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EventReviewTable events={pendingEvents || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.reviewStudyMaterials')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MaterialReviewTable materials={pendingMaterials || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* NEW: All Services Tab */}
                <TabsContent value="all-services" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.allServiceListings')}</CardTitle>
                            <p className="text-sm text-muted-foreground">{t('admin.allServicesHint')}</p>
                        </CardHeader>
                        <CardContent>
                            {allServices && allServices.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-3 px-2 font-medium">{t('admin.colTitle')}</th>
                                                <th className="py-3 px-2 font-medium">{t('admin.colOwner')}</th>
                                                <th className="py-3 px-2 font-medium">{t('admin.colStatus')}</th>
                                                <th className="py-3 px-2 font-medium">{t('admin.colPrice')}</th>
                                                <th className="py-3 px-2 font-medium">{t('admin.colCreated')}</th>
                                                <th className="py-3 px-2 font-medium">{t('admin.colActions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allServices.map((service: any) => (
                                                <tr key={service.id} className="border-b hover:bg-muted">
                                                    <td className="py-3 px-2 font-medium">
                                                        <Link href={`/services/${service.id}`} className="hover:text-primary">
                                                            {service.title}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-2 text-muted-foreground">
                                                        {service.profiles?.full_name}
                                                        <Badge variant="outline" className="ml-1 text-xs capitalize">{service.profiles?.role}</Badge>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Badge variant={service.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                            {service.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2">{service.price} ₸</td>
                                                    <td className="py-3 px-2 text-muted-foreground">
                                                        {new Date(service.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Link href={`/services/${service.id}`}>
                                                            <Button size="sm" variant="outline">{t('admin.view')}</Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center py-8 text-muted-foreground">{t('admin.noServices')}</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('admin.userDatabase')}</CardTitle>
                            {!isAdmin && <p className="text-sm text-yellow-600">{t('admin.roleChangeNote')}</p>}
                        </CardHeader>
                        <CardContent>
                            <UserManagementTable users={allUsers || []} currentUserId={user.id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
