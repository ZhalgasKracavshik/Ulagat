import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MailCheck, ShieldAlert } from "lucide-react";
import { SubstitutionForm } from "@/components/schedule/SubstitutionForm";
import { SubstitutionBadge } from "@/components/schedule/SubstitutionBadge";
import { DeleteSubstitutionButton } from "@/components/schedule/DeleteSubstitutionButton";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";
import type { Substitution } from "@/types";

export const dynamic = 'force-dynamic';

function describeChange(sub: Substitution, t: (key: string) => string): string {
    if (sub.type === 'cancellation') return t('substitutions.lessonCancelled');
    const parts: string[] = [];
    if (sub.subject) parts.push(sub.subject);
    if (sub.substitute_teacher_name) parts.push(sub.substitute_teacher_name);
    if (sub.room) parts.push(`${t('substitutions.room')} ${sub.room}`);
    return parts.length > 0 ? parts.join(' · ') : '—';
}

export default async function SubstitutionsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('substitutions.accessDenied')}</CardTitle>
                    <p className="text-muted-foreground">{t('substitutions.accessDeniedBody')}</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/schedule">{t('substitutions.backToSchedule')}</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    // "Today" in school wall-clock time (Asia/Almaty) — the server may run in UTC.
    const todayIso = almatyTodayIso();

    // Known classes for the picker: union of classes that have students and
    // classes that have a published timetable. Sourcing the substitution target
    // from real data (instead of free text) guarantees the email matches actual
    // students and avoids Latin/Cyrillic/Kazakh letter mix-ups (e.g. A vs А vs Ә).
    const [{ data: subRows }, { data: studentClasses }, { data: schedClasses }] = await Promise.all([
        supabase
            .from('substitutions')
            .select('*')
            .gte('date', todayIso)
            .order('date', { ascending: true })
            .order('period', { ascending: true }),
        supabase
            .from('profiles')
            .select('grade, class_letter')
            .eq('role', 'student')
            .not('grade', 'is', null)
            .not('class_letter', 'is', null),
        supabase.from('schedule_classes').select('grade, class_letter'),
    ]);

    const upcoming = (subRows ?? []) as Substitution[];

    const classMap = new Map<string, { grade: number; letter: string }>();
    for (const row of [...(studentClasses ?? []), ...(schedClasses ?? [])]) {
        const grade = row.grade as number | null;
        const letter = ((row.class_letter as string | null) ?? '').trim().toUpperCase();
        if (grade == null || !letter) continue;
        const key = `${grade}|${letter}`;
        if (!classMap.has(key)) classMap.set(key, { grade, letter });
    }
    const classes = Array.from(classMap.values()).sort(
        (a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter)
    );

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('substitutions.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('substitutions.subtitle')}
                    </p>
                </div>

                <Card className="border-0 shadow-xl shadow-orange-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">{t('substitutions.detailsTitle')}</CardTitle>
                        <CardDescription>
                            {t('substitutions.detailsHint')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SubstitutionForm classes={classes} />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl shadow-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">{t('substitutions.upcomingTitle')}</CardTitle>
                        <CardDescription>
                            {t('substitutions.upcomingHint')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcoming.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                {t('substitutions.empty')}
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('substitutions.colDate')}</TableHead>
                                        <TableHead>{t('substitutions.colClass')}</TableHead>
                                        <TableHead>{t('substitutions.colPeriod')}</TableHead>
                                        <TableHead>{t('substitutions.colType')}</TableHead>
                                        <TableHead>{t('substitutions.colChange')}</TableHead>
                                        <TableHead className="text-right">{t('substitutions.colActions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upcoming.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="whitespace-nowrap font-medium">
                                                {format(new Date(sub.date + 'T00:00:00'), 'MMM d')}
                                            </TableCell>
                                            <TableCell className="font-bold">{sub.grade}{sub.class_letter}</TableCell>
                                            <TableCell>{sub.period}</TableCell>
                                            <TableCell>
                                                <SubstitutionBadge type={sub.type} />
                                            </TableCell>
                                            <TableCell className="max-w-[220px]">
                                                <span className="block truncate">{describeChange(sub, t)}</span>
                                                {sub.notified_at && (
                                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                                        <MailCheck className="w-3 h-3" /> {t('substitutions.notified')}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DeleteSubstitutionButton id={sub.id} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
