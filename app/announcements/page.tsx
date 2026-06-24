import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Pin, PlusCircle, Users } from "lucide-react";
import { CategoryBadge } from "@/components/announcements/CategoryBadge";
import { DeleteAnnouncementButton } from "@/components/announcements/DeleteAnnouncementButton";
import { EmptyState } from "@/components/EmptyState";
import { getViewerGrades, announcementGradeFilter } from "@/lib/announcements/visibility";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";
import type { Announcement } from "@/types";

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

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
    const gradesLabel = (targetGrades: number[] | null): string => {
        if (!targetGrades || targetGrades.length === 0) return t('announcements.allGrades');
        return t('announcements.grades', { grades: targetGrades.join(', ') });
    };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, grade')
        .eq('id', user.id)
        .single();

    const role = profile?.role ?? 'student';
    const isStaff = role === 'admin' || role === 'moderator';

    // Grades relevant to this viewer: own grade for students, children's grades
    // for parents; [] = no grade resolved (only school-wide announcements);
    // null = staff / teachers / parliament see everything (no filter).
    const viewerGrades = await getViewerGrades(supabase, user.id);

    // expires_at is an absolute instant (end of the chosen day in Asia/Almaty,
    // converted at creation time in createAnnouncement), so the current absolute
    // time is the correct comparison point — no wall-clock date math needed here.
    const nowIso = new Date().toISOString();

    let query = supabase
        .from('announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

    // Show school-wide announcements plus those targeting any relevant grade
    // (no filter for staff / teachers / parliament).
    const gradeFilter = announcementGradeFilter(viewerGrades);
    if (gradeFilter) {
        query = query.or(gradeFilter);
    }

    const { data: rows } = await query;
    const announcements = (rows ?? []) as Announcement[];

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <Megaphone className="w-8 h-8 text-indigo-600" />
                            {t('announcements.title')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('announcements.subtitle')}
                        </p>
                    </div>
                    {isStaff && (
                        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            <Link href="/announcements/new">
                                <PlusCircle className="w-4 h-4" />
                                {t('announcements.newAnnouncement')}
                            </Link>
                        </Button>
                    )}
                </div>

                {announcements.length === 0 ? (
                    <EmptyState
                        icon={Megaphone}
                        title={t('announcements.empty')}
                        tint="bg-indigo-50 dark:bg-indigo-950/40"
                        iconColor="text-indigo-400"
                    />
                ) : (
                    <div className="space-y-4">
                        {announcements.map((announcement) => (
                            <Card
                                key={announcement.id}
                                className={`border-0 shadow-md overflow-hidden ${announcement.pinned ? 'ring-2 ring-indigo-200' : ''}`}
                            >
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {announcement.pinned && (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-full">
                                                    <Pin className="w-3 h-3" /> {t('announcements.pinned')}
                                                </span>
                                            )}
                                            <CategoryBadge category={announcement.category} />
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                                <Users className="w-3 h-3" />
                                                {gradesLabel(announcement.target_grades)}
                                            </span>
                                        </div>
                                        {isStaff && <DeleteAnnouncementButton id={announcement.id} />}
                                    </div>

                                    <h2 className="text-xl font-bold text-foreground">{announcement.title}</h2>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {announcement.body}
                                    </p>

                                    <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                                        <span>{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                                        {announcement.expires_at && (
                                            <span>{t('announcements.visibleUntil', { date: format(new Date(announcement.expires_at), 'MMM d, yyyy') })}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
