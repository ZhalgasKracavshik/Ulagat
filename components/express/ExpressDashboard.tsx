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
import { effectiveLesson, type DayCell } from "@/components/schedule/types";
import { getPeriodTime } from "@/lib/schedule/bells";
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
    if (!cell.substitution) return null;
    const labels: Record<string, string> = {
        substitution: "Substitution",
        cancellation: "Cancelled",
        room_change: "Room change",
    };
    return (
        <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] gap-1">
            <Repeat className="w-3 h-3" />
            {labels[cell.substitution.type] ?? "Change"}
        </Badge>
    );
}

export function ExpressDashboard({ data }: { data: ExpressData }) {
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
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    Good morning, {firstName}
                </h1>
                <p className="text-sm text-slate-500">
                    {classLabel ? `Class ${classLabel} · Today at a glance` : "Today at a glance"}
                </p>
            </div>

            {/* Current lesson (reuses the shared bell widget) */}
            <CurrentLessonWidget todayCells={todayCells} />

            {/* Substitutions banner */}
            {substitutionCount > 0 && (
                <Link href="/schedule">
                    <div className="flex items-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-4 py-3 text-orange-800 active:scale-[0.99] transition-transform">
                        <Repeat className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-semibold">
                            {substitutionCount} change{substitutionCount > 1 ? "s" : ""} to today&apos;s schedule
                        </span>
                        <ArrowRight className="w-4 h-4 ml-auto shrink-0" />
                    </div>
                </Link>
            )}

            {/* Today's schedule */}
            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-sky-500" />
                        Today
                    </h2>
                    <Link
                        href="/schedule"
                        className="text-xs font-medium text-sky-600 flex items-center gap-1"
                    >
                        Full week <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {!hasSchoolToday || activeCells.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="py-8 flex flex-col items-center gap-2 text-slate-400">
                            <Moon className="w-7 h-7" />
                            <span className="text-sm font-medium">No lessons today</span>
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
                                            <span className="text-[10px] font-bold uppercase text-slate-400">
                                                #{cell.period}
                                            </span>
                                            {time && (
                                                <span className="text-xs font-semibold text-slate-600">
                                                    {time.start}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {eff.cancelled ? (
                                                <span className="font-bold text-red-600 line-through">
                                                    {eff.subject ?? "Lesson"} cancelled
                                                </span>
                                            ) : (
                                                <>
                                                    <p className="font-bold text-slate-900 truncate">
                                                        {eff.subject ?? "Free period"}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
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
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-indigo-500" />
                        Announcements
                    </h2>
                    <Link
                        href="/announcements"
                        className="text-xs font-medium text-indigo-600 flex items-center gap-1"
                    >
                        All <ArrowRight className="w-3 h-3" />
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
                                            <p className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                                                {a.title}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5 capitalize">
                                                {a.category}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="py-6 text-center text-sm text-slate-400">
                            Nothing new.
                        </CardContent>
                    </Card>
                )}
            </section>

            <p className="text-center text-[11px] text-slate-400 pt-1">
                Switch to Full mode (moon icon) for everything else.
            </p>
        </div>
    );
}
