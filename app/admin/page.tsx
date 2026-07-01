import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, ListFilter, Award, Calendar, CalendarClock, CalendarDays, Megaphone, CheckCircle2, AlertTriangle } from "lucide-react";
import { ServiceReviewTable } from "@/components/admin/ServiceReviewTable";
import { EventReviewTable } from "@/components/admin/EventReviewTable";
import { MaterialReviewTable } from "@/components/admin/MaterialReviewTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

/** A service row joined with its owner profile (admin moderation table). */
type AdminServiceRow = {
    id: string;
    title: string;
    status: string;
    price: number;
    created_at: string;
    profiles?: { full_name: string | null; role: string | null } | null;
};

// Shared styles for the quick-action tiles (staff control center).
const ACTION_TILE = "group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm";
const ACTION_ICON = "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg";

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

    // ---- Launch-readiness metrics (pre-pilot visibility for staff) ----
    // Counted with the service-role client so aggregates are accurate
    // regardless of per-row RLS (e.g. family_bonds). No PII is surfaced.
    // Wrapped so a missing/misconfigured service-role key never crashes the
    // whole dashboard — the moderation tabs must keep working regardless.
    let studentsNoClass = 0;
    let familyBondsCount = 0;
    let scheduleRows = 0;
    let staffCount = 0;
    let readinessAvailable = true;
    try {
        const adminClient = createAdminClient();
        const [
            { count: noClass },
            { count: teacherCount },
            { count: moderatorCount },
            { count: parliamentCount },
            { count: bonds },
            { count: sched },
        ] = await Promise.all([
            adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student').or('grade.is.null,class_letter.is.null'),
            adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
            adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'moderator'),
            adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'parliament'),
            adminClient.from('family_bonds').select('*', { count: 'exact', head: true }),
            adminClient.from('schedule').select('*', { count: 'exact', head: true }),
        ]);
        studentsNoClass = noClass ?? 0;
        familyBondsCount = bonds ?? 0;
        scheduleRows = sched ?? 0;
        staffCount = (teacherCount ?? 0) + (moderatorCount ?? 0) + (parliamentCount ?? 0);
    } catch (err) {
        console.error('[admin] readiness metrics unavailable:', err);
        readinessAvailable = false;
    }
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? '';
    const emailConfigured = Boolean(process.env.RESEND_API_KEY) && Boolean(fromEmail) && !fromEmail.includes('resend.dev');

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
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eventCount || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick actions — staff control center (the daily tools live on their
                own pages; this surfaces them in one place on the dashboard). */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('admin.quickActions')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Link href="/schedule/substitutions" className={ACTION_TILE}>
                            <span className={`${ACTION_ICON} bg-amber-100 text-amber-600 dark:bg-amber-950/50`}>
                                <CalendarClock className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground">{t('admin.actSubstitutions')}</p>
                                <p className="text-sm text-muted-foreground">{t('admin.actSubstitutionsDesc')}</p>
                            </div>
                        </Link>

                        <Link href="/schedule/manage" className={ACTION_TILE}>
                            <span className={`${ACTION_ICON} bg-sky-100 text-sky-600 dark:bg-sky-950/50`}>
                                <CalendarDays className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground">{t('admin.actTimetable')}</p>
                                <p className="text-sm text-muted-foreground">{t('admin.actTimetableDesc')}</p>
                            </div>
                        </Link>

                        <Link href="/announcements/new" className={ACTION_TILE}>
                            <span className={`${ACTION_ICON} bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50`}>
                                <Megaphone className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground">{t('admin.actAnnouncement')}</p>
                                <p className="text-sm text-muted-foreground">{t('admin.actAnnouncementDesc')}</p>
                            </div>
                        </Link>

                        <Link href="/achievements/review" className={ACTION_TILE}>
                            <span className={`${ACTION_ICON} bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50`}>
                                <Award className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-foreground">{t('admin.reviewAchievements')}</p>
                                    {(pendingAchievements ?? 0) > 0 && <Badge className="bg-red-500">{pendingAchievements}</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{t('admin.actAchievementsDesc')}</p>
                            </div>
                        </Link>

                        {isAdmin && (
                            <Link href="/admin/users" className={ACTION_TILE}>
                                <span className={`${ACTION_ICON} bg-rose-100 text-rose-600 dark:bg-rose-950/50`}>
                                    <Users className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{t('admin.manageUsers')}</p>
                                    <p className="text-sm text-muted-foreground">{t('admin.actUsersDesc')}</p>
                                </div>
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Launch readiness — what still blocks the pilot from working */}
            {readinessAvailable && (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('admin.launchReadiness')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="divide-y divide-border">
                        <li className="flex items-center justify-between gap-3 py-2.5">
                            <span className="flex items-center gap-2.5 text-sm">
                                {emailConfigured ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                                <span className="text-foreground">{t('admin.launchEmail')}</span>
                            </span>
                            <span className={`text-right text-sm font-medium ${emailConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {emailConfigured ? t('admin.launchEmailOn') : t('admin.launchEmailOff')}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-3 py-2.5">
                            <span className="flex items-center gap-2.5 text-sm">
                                {(scheduleRows ?? 0) > 0 ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                                <span className="text-foreground">{t('admin.launchSchedule')}</span>
                            </span>
                            {(scheduleRows ?? 0) > 0 ? (
                                <span className="text-sm font-medium text-emerald-600">{scheduleRows} {t('admin.launchLessonsUnit')}</span>
                            ) : (
                                <Link href="/schedule/manage" className="text-sm font-medium text-amber-600 hover:underline">{t('admin.launchScheduleEmpty')}</Link>
                            )}
                        </li>
                        <li className="flex items-center justify-between gap-3 py-2.5">
                            <span className="flex items-center gap-2.5 text-sm">
                                {(studentsNoClass ?? 0) === 0 ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                                <span className="text-foreground">{t('admin.launchNoClass')}</span>
                            </span>
                            {(studentsNoClass ?? 0) === 0 ? (
                                <span className="text-sm font-medium text-emerald-600">{t('admin.launchNoClassOk')}</span>
                            ) : isAdmin ? (
                                <Link href="/admin/users" className="text-sm font-medium text-amber-600 hover:underline">{studentsNoClass}</Link>
                            ) : (
                                <span className="text-sm font-medium text-amber-600">{studentsNoClass}</span>
                            )}
                        </li>
                        <li className="flex items-center justify-between gap-3 py-2.5">
                            <span className="flex items-center gap-2.5 text-sm">
                                {staffCount > 0 ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />}
                                <span className="text-foreground">{t('admin.launchStaff')}</span>
                            </span>
                            <span className={`text-sm font-medium ${staffCount > 0 ? 'text-foreground' : 'text-amber-600'}`}>
                                {staffCount > 0 ? staffCount : t('admin.launchStaffNone')}
                            </span>
                        </li>
                        <li className="flex items-center justify-between gap-3 py-2.5">
                            <span className="flex items-center gap-2.5 text-sm">
                                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="text-foreground">{t('admin.launchParents')}</span>
                            </span>
                            <span className="text-sm font-medium text-foreground">{familyBondsCount ?? 0}</span>
                        </li>
                    </ul>
                </CardContent>
            </Card>
            )}

            {/* Management Tabs */}
            <Tabs defaultValue="services" className="w-full">
                <TabsList className="w-full md:w-auto overflow-x-auto justify-start md:justify-center">
                    <TabsTrigger value="services" className="shrink-0">
                        {t('admin.tabServices')} {pendingServices && pendingServices.length > 0 && <Badge className="ml-2 bg-red-500">{pendingServices.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="events" className="shrink-0">
                        {t('admin.tabEvents')} {pendingEvents && pendingEvents.length > 0 && <Badge className="ml-2 bg-red-500">{pendingEvents.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="shrink-0">
                        {t('admin.tabMaterials')} {pendingMaterials && pendingMaterials.length > 0 && <Badge className="ml-2 bg-red-500">{pendingMaterials.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="all-services" className="shrink-0">{t('admin.tabAllServices')}</TabsTrigger>
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
                                            {(allServices as AdminServiceRow[]).map((service) => (
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
            </Tabs>
        </div>
    );
}
