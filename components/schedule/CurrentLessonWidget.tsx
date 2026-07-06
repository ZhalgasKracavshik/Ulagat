"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Coffee, DoorOpen, MapPin, Moon, Sunrise, User } from "lucide-react";
import { getCurrentPeriod, getPeriodTime, type CurrentPeriodInfo } from "@/lib/schedule/bells";
import { almatyNow } from "@/lib/schedule/almaty-time";
import { useT } from "@/hooks/useT";
import { SubstitutionBadge } from "./SubstitutionBadge";
import { effectiveLesson, type DayCell } from "./types";

type CurrentLessonWidgetProps = {
    /** Today's cells (periods 1-8) with substitutions already attached. Empty = no school today. */
    todayCells: DayCell[];
};

function findCell(cells: DayCell[], period: number): DayCell | null {
    return cells.find((c) => c.period === period) ?? null;
}

/** Thin progress bar showing how far through the current lesson/break we are. */
function PhaseProgress({ info, colorClass }: { info: CurrentPeriodInfo; colorClass: string }) {
    if (!info.totalMinutes || info.totalMinutes <= 0) return null;
    const elapsed = info.totalMinutes - info.minutesLeft;
    const pct = Math.max(0, Math.min(100, (elapsed / info.totalMinutes) * 100));
    return (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

/** Compact "next: <subject>" preview for the lesson after the current one. */
function NextUp({ cells, period }: { cells: DayCell[]; period: number }) {
    const { t } = useT();
    const nextCell = findCell(cells, period + 1);
    if (!nextCell) return null;
    const effective = effectiveLesson(nextCell);
    if (!effective.subject || effective.cancelled) return null;
    return (
        <p className="mt-1.5 text-xs text-muted-foreground">
            {t('schedule.nextUp')}: <span className="font-semibold text-foreground">{effective.subject}</span>
            {effective.room ? ` · ${t('schedule.room')} ${effective.room}` : ''}
        </p>
    );
}

function LessonLine({ cell }: { cell: DayCell }) {
    const { t } = useT();
    const effective = effectiveLesson(cell);
    if (effective.cancelled) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-600">{t('schedule.lessonCancelled')}</span>
                {effective.subject && (
                    <span className="text-sm text-muted-foreground line-through">{effective.subject}</span>
                )}
            </div>
        );
    }
    if (!effective.subject) {
        return <span className="text-lg font-bold text-foreground">{t('schedule.freePeriod')}</span>;
    }
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-lg font-bold text-foreground">{effective.subject}</span>
            {effective.room && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {t('schedule.room')} {effective.room}
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
    const { t } = useT();
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
                <span className="text-sm">{t('schedule.loadingLesson')}</span>
            </div>
        );
    } else if (todayCells.length === 0) {
        body = (
            <div className="flex items-center gap-3">
                <Moon className="w-6 h-6 text-indigo-400" />
                <span className="text-lg font-bold text-foreground">{t('schedule.noLessonsToday')}</span>
            </div>
        );
    } else if (info.status === 'after') {
        body = (
            <div className="flex items-center gap-3">
                <DoorOpen className="w-6 h-6 text-emerald-500" />
                <span className="text-lg font-bold text-foreground">{t('schedule.schoolOver')}</span>
            </div>
        );
    } else if (info.status === 'before') {
        const firstCell = findCell(todayCells, info.period);
        const time = getPeriodTime(info.period);
        body = (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                    <Sunrise className="w-4 h-4" />
                    {t('schedule.schoolStartsIn', { min: info.minutesLeft })}{time && <> ({time.start})</>}
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
                    {t('schedule.breakNext', { min: info.minutesLeft })}{time && <> ({time.start})</>}
                </div>
                {nextCell && <LessonLine cell={nextCell} />}
                <PhaseProgress info={info} colorClass="bg-emerald-500" />
            </div>
        );
    } else {
        const cell = findCell(todayCells, info.period);
        const time = getPeriodTime(info.period);
        body = (
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
                    <Clock className="w-4 h-4" />
                    {t('schedule.lessonN', { n: info.period })}{time && <> ({time.start}–{time.end})</>} — {t('schedule.bellIn', { min: info.minutesLeft })}
                </div>
                {cell ? <LessonLine cell={cell} /> : <span className="text-lg font-bold text-foreground">{t('schedule.freePeriod')}</span>}
                <PhaseProgress info={info} colorClass="bg-blue-500" />
                <NextUp cells={todayCells} period={info.period} />
            </div>
        );
    }

    return (
        <Card className="border-blue-100 dark:border-blue-950 bg-gradient-to-r from-blue-50/80 dark:from-blue-950/30 to-transparent shadow-sm">
            <CardContent className="py-4 px-5">{body}</CardContent>
        </Card>
    );
}
