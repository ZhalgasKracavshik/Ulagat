"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Coffee, DoorOpen, MapPin, Moon, Sunrise, User } from "lucide-react";
import { getCurrentPeriod, getPeriodTime, type CurrentPeriodInfo } from "@/lib/schedule/bells";
import { almatyNow } from "@/lib/schedule/almaty-time";
import { SubstitutionBadge } from "./SubstitutionBadge";
import { effectiveLesson, type DayCell } from "./types";

type CurrentLessonWidgetProps = {
    /** Today's cells (periods 1-8) with substitutions already attached. Empty = no school today. */
    todayCells: DayCell[];
};

function findCell(cells: DayCell[], period: number): DayCell | null {
    return cells.find((c) => c.period === period) ?? null;
}

function LessonLine({ cell }: { cell: DayCell }) {
    const effective = effectiveLesson(cell);
    if (effective.cancelled) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">Lesson cancelled</span>
                {effective.subject && (
                    <span className="text-sm text-muted-foreground line-through">{effective.subject}</span>
                )}
            </div>
        );
    }
    if (!effective.subject) {
        return <span className="text-lg font-bold text-foreground">Free period</span>;
    }
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-lg font-bold text-foreground">{effective.subject}</span>
            {effective.room && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> Room {effective.room}
                </span>
            )}
            {effective.teacher && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="w-3.5 h-3.5" /> {effective.teacher}
                </span>
            )}
            {cell.substitution && cell.substitution.type !== 'cancellation' && (
                <SubstitutionBadge type={cell.substitution.type} />
            )}
        </div>
    );
}

export function CurrentLessonWidget({ todayCells }: CurrentLessonWidgetProps) {
    const [info, setInfo] = useState<CurrentPeriodInfo | null>(null);

    useEffect(() => {
        // Bell times are school wall-clock time (Asia/Almaty) — don't trust the device timezone.
        const update = () => setInfo(getCurrentPeriod(almatyNow()));
        update();
        const timer = setInterval(update, 30_000);
        return () => clearInterval(timer);
    }, []);

    let body: React.ReactNode;

    if (!info) {
        // Pre-hydration placeholder (avoids server/client clock mismatch)
        body = (
            <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="w-6 h-6 animate-pulse" />
                <span className="text-sm">Loading current lesson…</span>
            </div>
        );
    } else if (todayCells.length === 0) {
        body = (
            <div className="flex items-center gap-3">
                <Moon className="w-6 h-6 text-indigo-400" />
                <span className="text-lg font-bold text-foreground">No lessons today</span>
            </div>
        );
    } else if (info.status === 'after') {
        body = (
            <div className="flex items-center gap-3">
                <DoorOpen className="w-6 h-6 text-emerald-500" />
                <span className="text-lg font-bold text-foreground">School day is over</span>
            </div>
        );
    } else if (info.status === 'before') {
        const firstCell = findCell(todayCells, info.period);
        const time = getPeriodTime(info.period);
        body = (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <Sunrise className="w-4 h-4" />
                    School starts in {info.minutesLeft} min{time && <> ({time.start})</>}
                </div>
                {firstCell && <LessonLine cell={firstCell} />}
            </div>
        );
    } else if (info.status === 'break') {
        const nextCell = findCell(todayCells, info.period);
        const time = getPeriodTime(info.period);
        body = (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                    <Coffee className="w-4 h-4" />
                    Break — next lesson in {info.minutesLeft} min{time && <> ({time.start})</>}
                </div>
                {nextCell && <LessonLine cell={nextCell} />}
            </div>
        );
    } else {
        const cell = findCell(todayCells, info.period);
        const time = getPeriodTime(info.period);
        body = (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                    <Clock className="w-4 h-4" />
                    Lesson {info.period}{time && <> ({time.start}–{time.end})</>} — bell in {info.minutesLeft} min
                </div>
                {cell ? <LessonLine cell={cell} /> : <span className="text-lg font-bold text-foreground">Free period</span>}
            </div>
        );
    }

    return (
        <Card className="border-blue-100 dark:border-blue-950 bg-gradient-to-r from-blue-50/80 dark:from-blue-950/30 to-transparent shadow-sm">
            <CardContent className="py-4 px-5">{body}</CardContent>
        </Card>
    );
}
