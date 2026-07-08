"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CalendarDays,
    Megaphone,
    Pin,
    Repeat,
    MapPin,
    User as UserIcon,
    ArrowRight,
    Moon,
} from "lucide-react";
import { CurrentLessonWidget } from "@/components/schedule/CurrentLessonWidget";
import { CategoryBadge } from "@/components/announcements/CategoryBadge";
import { effectiveLesson, type DayCell } from "@/components/schedule/types";
import { getPeriodTime } from "@/lib/schedule/bells";
import { useT } from "@/hooks/useT";
import type { Announcement } from "@/types";

export type ExpressData = {
    firstName: string;
    /** Resolved class label, e.g. "10A", or null if none set. */
    classLabel: string | null;
    /** Today's 8 period cells with substitutions attached. Empty = no school today. */
    todayCells: DayCell[];
    /** Whether the user has any lesson today at all. */
    hasSchoolToday: boolean;
    /** Pinned / latest announcements (1-3). */
    announcements: Announcement[];
};

function SubstitutionPill({ cell }: { cell: DayCell }) {
    const { t } = useT();
    if (!cell.substitution) return null;
    const labelKey: Record<string, string> = {
        substitution: "home.subSub",
        cancellation: "home.subCancelled",
        room_change: "home.subRoom",
    };
    return (
        <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-0 text-[10px] gap-1">
            <Repeat className="w-3 h-3" />
            {t(labelKey[cell.substitution.type] ?? "home.subSub")}
        </Badge>
    );
}

export function ExpressDashboard({ data }: { data: ExpressData }) {
    const { t } = useT();
    const { firstName, classLabel, todayCells, hasSchoolToday, announcements } = data;

    // Only show slots that actually have a lesson (or a substitution overlay).
    const activeCells = todayCells.filter(
        (c) => c.lesson !== null || c.substitution !== null
    );

    const substitutionCount = todayCells.filter((c) => c.substitution !== null).length;

    return (
        <div className="mx-auto w-full max-w-md px-4 py-5 space-y-5">
            {/* Greeting */}
            <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                    {t("express.goodMorning", { name: firstName })}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {classLabel
                        ? `${t("home.classLabel", { label: classLabel })} · ${t("express.todayGlance")}`
                        : t("express.todayGlance")}
                </p>
            </div>

            {/* Current lesson (reuses the shared bell widget) */}
            <CurrentLessonWidget todayCells={todayCells} />

            {/* Substitutions banner */}
            {substitutionCount > 0 && (
                <Link href="/schedule">
                    <div className="flex items-center gap-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 px-4 py-3 text-orange-800 active:scale-[0.99] transition-transform">
                        <Repeat className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-semibold">
                            {t(substitutionCount > 1 ? "home.changesTodayPlural" : "home.changesToday", { count: substitutionCount })}
                        </span>
                        <ArrowRight className="w-4 h-4 ml-auto shrink-0" />
                    </div>
                </Link>
            )}

            {/* Today's schedule */}
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-sky-500" />
                        {t("common.today")}
                    </h2>
                    <Link
                        href="/schedule"
                        className="text-xs font-medium text-sky-600 flex items-center gap-1"
                    >
                        {t("express.fullWeek")} <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {!classLabel ? (
                    /* No class set — onboarding prompt instead of a misleading "no lessons" */
                    <Card className="border-dashed border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/30">
                        <CardContent className="py-6 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm text-muted-foreground">{t("home.setClassPrompt")}</p>
                            <Link
                                href="/settings"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                            >
                                {t("home.setClassCta")} <ArrowRight className="h-4 w-4" />
                            </Link>
                        </CardContent>
                    </Card>
                ) : !hasSchoolToday || activeCells.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                            <Moon className="w-7 h-7" />
                            <span className="text-sm font-medium">{t("home.noLessonsToday")}</span>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {activeCells.map((cell) => {
                            const eff = effectiveLesson(cell);
                            const time = getPeriodTime(cell.period);
                            return (
                                <Card key={cell.period} className="shadow-sm">
                                    <CardContent className="p-3 flex items-center gap-3">
                                        <div className="flex flex-col items-center justify-center w-12 shrink-0 text-center">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                                #{cell.period}
                                            </span>
                                            {time && (
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    {time.start}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {eff.cancelled ? (
                                                <span className="font-bold text-red-600 line-through">
                                                    {eff.subject ?? t("schedule.lessonCancelled")}
                                                </span>
                                            ) : (
                                                <>
                                                    <p className="font-bold text-foreground truncate">
                                                        {eff.subject ?? t("home.freePeriod")}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                        {eff.room && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" /> {eff.room}
                                                            </span>
                                                        )}
                                                        {eff.teacher && (
                                                            <span className="flex items-center gap-1 truncate">
                                                                <UserIcon className="w-3 h-3" /> {eff.teacher}
                                                            </span>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <SubstitutionPill cell={cell} />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Pinned / latest announcements */}
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-indigo-500" />
                        {t("home.announcements")}
                    </h2>
                    <Link
                        href="/announcements"
                        className="text-xs font-medium text-indigo-600 flex items-center gap-1"
                    >
                        {t("home.viewAll")} <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {announcements.length > 0 ? (
                    <div className="space-y-2">
                        {announcements.map((a) => (
                            <Link key={a.id} href="/announcements">
                                <Card className="shadow-sm active:scale-[0.99] transition-transform">
                                    <CardContent className="p-3 flex items-start gap-2">
                                        {a.pinned && (
                                            <Pin className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                                                {a.title}
                                            </p>
                                            <div className="mt-1">
                                                <CategoryBadge category={a.category} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="py-6 text-center text-sm text-muted-foreground">
                            {t("express.nothingNew")}
                        </CardContent>
                    </Card>
                )}
            </section>

            <p className="text-center text-[11px] text-muted-foreground pt-1">
                {t("express.switchHint")}
            </p>
        </div>
    );
}
