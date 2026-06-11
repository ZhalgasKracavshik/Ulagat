import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CalendarDays, ClipboardEdit, Repeat, UserCog } from "lucide-react";
import { WeekGrid } from "@/components/schedule/WeekGrid";
import { ClassSelector, type ClassOption } from "@/components/schedule/ClassSelector";
import type { DayCell, DayColumn } from "@/components/schedule/types";
import type { ScheduleEntry, Substitution } from "@/types";

export const dynamic = 'force-dynamic';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ScheduleSearchParams = Promise<{ grade?: string; letter?: string }>;

function parseGrade(value: string | undefined): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 11 ? n : null;
}

export default async function SchedulePage({ searchParams }: { searchParams: ScheduleSearchParams }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, grade, class_letter')
        .eq('id', user.id)
        .single();

    const role: string = profile?.role ?? 'student';
    const isStaff = role === 'admin' || role === 'moderator';

    // ---- Resolve which class to show ----
    let targetGrade: number | null = null;
    let targetLetter: string | null = null;
    let parentWithoutChild = false;

    if (role === 'parent') {
        // Parent: use the first linked child's class
        const { data: bond } = await supabase
            .from('family_bonds')
            .select('student_id')
            .eq('parent_id', user.id)
            .limit(1)
            .maybeSingle();

        if (bond?.student_id) {
            const { data: child } = await supabase
                .from('profiles')
                .select('grade, class_letter')
                .eq('id', bond.student_id)
                .single();
            targetGrade = child?.grade ?? null;
            targetLetter = child?.class_letter ?? null;
        } else {
            parentWithoutChild = true;
        }
    } else {
        targetGrade = profile?.grade ?? null;
        targetLetter = profile?.class_letter ?? null;
    }

    // Staff can override via the class selector
    const classOptions: ClassOption[] = [];
    if (isStaff) {
        const params = await searchParams;
        const paramGrade = parseGrade(params.grade);
        const paramLetter = params.letter?.trim() || null;
        if (paramGrade !== null && paramLetter) {
            targetGrade = paramGrade;
            targetLetter = paramLetter;
        }

        // Distinct classes that have a published timetable
        const { data: classRows } = await supabase
            .from('schedule')
            .select('grade, class_letter')
            .limit(2000);
        const seen = new Set<string>();
        for (const row of classRows ?? []) {
            const key = `${row.grade}|${row.class_letter}`;
            if (!seen.has(key)) {
                seen.add(key);
                classOptions.push({ grade: row.grade as number, letter: row.class_letter as string });
            }
        }
        classOptions.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter));

        // Default to the first published class if nothing else is set
        if ((targetGrade === null || !targetLetter) && classOptions.length > 0) {
            targetGrade = classOptions[0].grade;
            targetLetter = classOptions[0].letter;
        }
    }

    // ---- Header (shared by all branches) ----
    const header = (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-sky-500/10 to-transparent p-6 rounded-2xl border border-sky-500/10">
            <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                    <CalendarDays className="w-8 h-8 text-sky-500" />
                    Schedule
                </h1>
                <p className="text-muted-foreground">
                    {targetGrade !== null && targetLetter
                        ? `Class ${targetGrade}${targetLetter} — current week`
                        : 'Weekly timetable with live substitutions'}
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {isStaff && classOptions.length > 0 && (
                    <ClassSelector
                        classes={classOptions}
                        selectedGrade={targetGrade}
                        selectedLetter={targetLetter}
                    />
                )}
                {isStaff && (
                    <>
                        <Link href="/schedule/manage">
                            <Button variant="outline" className="gap-2">
                                <ClipboardEdit className="w-4 h-4" />
                                Manage Timetable
                            </Button>
                        </Link>
                        <Link href="/schedule/substitutions">
                            <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
                                <Repeat className="w-4 h-4" />
                                Substitutions
                            </Button>
                        </Link>
                    </>
                )}
            </div>
        </div>
    );

    // ---- No class resolved: friendly guidance ----
    if (targetGrade === null || !targetLetter) {
        return (
            <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
                {header}
                <Card className="max-w-lg mx-auto text-center p-8 space-y-4 border-dashed">
                    <div className="mx-auto w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center">
                        <UserCog className="w-8 h-8 text-sky-400" />
                    </div>
                    {parentWithoutChild ? (
                        <>
                            <CardTitle className="text-xl">No linked child found</CardTitle>
                            <p className="text-slate-600 text-sm">
                                Ask your child to send you a parent invite so we can show you their class schedule.
                            </p>
                        </>
                    ) : isStaff ? (
                        <>
                            <CardTitle className="text-xl">No timetables published yet</CardTitle>
                            <p className="text-slate-600 text-sm">
                                Create the first class timetable to get started.
                            </p>
                            <Button asChild className="mt-2">
                                <Link href="/schedule/manage">Manage Timetable</Link>
                            </Button>
                        </>
                    ) : (
                        <>
                            <CardTitle className="text-xl">Set your class first</CardTitle>
                            <p className="text-slate-600 text-sm">
                                Set your grade and class letter in profile settings to see your schedule.
                            </p>
                            <Button asChild className="mt-2">
                                <Link href="/profile/edit">Open Profile Settings</Link>
                            </Button>
                        </>
                    )}
                </Card>
            </div>
        );
    }

    // ---- Load the current week's data ----
    const now = new Date();
    const monday = startOfWeek(now, { weekStartsOn: 1 });
    const weekDates = Array.from({ length: 6 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
    const mondayIso = weekDates[0];
    const saturdayIso = weekDates[5];
    const todayIso = format(now, 'yyyy-MM-dd');

    const [{ data: lessonRows }, { data: subRows }] = await Promise.all([
        supabase
            .from('schedule')
            .select('*')
            .eq('grade', targetGrade)
            .eq('class_letter', targetLetter)
            .lte('valid_from', saturdayIso)
            .gte('valid_until', mondayIso),
        supabase
            .from('substitutions')
            .select('*')
            .eq('grade', targetGrade)
            .eq('class_letter', targetLetter)
            .gte('date', mondayIso)
            .lte('date', saturdayIso),
    ]);

    const lessons = (lessonRows ?? []) as ScheduleEntry[];
    const substitutions = (subRows ?? []) as Substitution[];

    const days: DayColumn[] = weekDates.map((date, i) => {
        const dayOfWeek = i + 1;
        const cells: DayCell[] = Array.from({ length: 8 }, (_, p) => {
            const period = p + 1;
            const lesson = lessons.find(
                (l) =>
                    l.day_of_week === dayOfWeek &&
                    l.period === period &&
                    l.valid_from <= date &&
                    l.valid_until >= date
            );
            const sub = substitutions.find((s) => s.date === date && s.period === period);
            return {
                period,
                lesson: lesson
                    ? { subject: lesson.subject, teacher: lesson.teacher_name, room: lesson.room }
                    : null,
                substitution: sub
                    ? {
                        type: sub.type,
                        newSubject: sub.subject,
                        newTeacher: sub.substitute_teacher_name,
                        newRoom: sub.room,
                        note: sub.note,
                    }
                    : null,
            };
        });
        return { dayOfWeek, date, label: DAY_LABELS[i], cells };
    });

    return (
        <div className="container mx-auto py-8 space-y-6 px-4 md:px-6">
            {header}
            <WeekGrid days={days} todayIso={todayIso} />
        </div>
    );
}
