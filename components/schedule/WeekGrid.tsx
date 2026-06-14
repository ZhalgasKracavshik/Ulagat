"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { BELL_SCHEDULE } from "@/lib/schedule/bells";
import { CurrentLessonWidget } from "./CurrentLessonWidget";
import { SubstitutionBadge } from "./SubstitutionBadge";
import type { DayCell, DayColumn } from "./types";

type WeekGridProps = {
    days: DayColumn[]; // Monday..Saturday of the current week
    todayIso: string; // yyyy-MM-dd
};

function CellContent({ cell }: { cell: DayCell }) {
    const { lesson, substitution } = cell;

    if (!lesson && !substitution) {
        return <span className="text-muted-foreground/50">—</span>;
    }

    if (!substitution) {
        return (
            <div className="space-y-0.5">
                <p className="font-semibold text-foreground leading-tight">{lesson!.subject}</p>
                <p className="text-xs text-muted-foreground">
                    {lesson!.room && <span>Room {lesson!.room}</span>}
                    {lesson!.room && lesson!.teacher && <span> · </span>}
                    {lesson!.teacher && <span>{lesson!.teacher}</span>}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            <SubstitutionBadge type={substitution.type} />

            {substitution.type === 'cancellation' && (
                <div className="space-y-0.5">
                    {lesson && <p className="font-semibold text-muted-foreground line-through leading-tight">{lesson.subject}</p>}
                    <p className="text-xs font-semibold text-red-600">Lesson cancelled</p>
                </div>
            )}

            {substitution.type === 'room_change' && (
                <div className="space-y-0.5">
                    {lesson && <p className="font-semibold text-foreground leading-tight">{lesson.subject}</p>}
                    <p className="text-xs text-muted-foreground">
                        {lesson?.room && <span className="line-through mr-1">Room {lesson.room}</span>}
                        <span className="font-semibold text-blue-700">Room {substitution.newRoom ?? '?'}</span>
                    </p>
                    {lesson?.teacher && <p className="text-xs text-muted-foreground">{lesson.teacher}</p>}
                </div>
            )}

            {substitution.type === 'substitution' && (
                <div className="space-y-0.5">
                    {lesson && (
                        <p className="text-xs text-muted-foreground line-through leading-tight">
                            {lesson.subject}{lesson.teacher ? ` · ${lesson.teacher}` : ''}
                        </p>
                    )}
                    <p className="font-semibold text-orange-700 leading-tight">
                        {substitution.newSubject ?? lesson?.subject ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {(substitution.newRoom ?? lesson?.room) && <span>Room {substitution.newRoom ?? lesson?.room}</span>}
                        {(substitution.newRoom ?? lesson?.room) && substitution.newTeacher && <span> · </span>}
                        {substitution.newTeacher && <span>{substitution.newTeacher}</span>}
                    </p>
                </div>
            )}

            {substitution.note && (
                <p className="text-[11px] italic text-muted-foreground">{substitution.note}</p>
            )}
        </div>
    );
}

function formatDayDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function WeekGrid({ days, todayIso }: WeekGridProps) {
    const todayColumn = days.find((d) => d.date === todayIso) ?? null;
    const [mobileDay, setMobileDay] = useState<number>(todayColumn?.dayOfWeek ?? 1);

    const hasAnyLesson = days.some((d) => d.cells.some((c) => c.lesson || c.substitution));
    const selectedDay = days.find((d) => d.dayOfWeek === mobileDay) ?? days[0];

    return (
        <div className="space-y-6">
            <CurrentLessonWidget todayCells={todayColumn?.cells ?? []} />

            {!hasAnyLesson ? (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-3">
                        <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center">
                            <CalendarDays className="w-8 h-8 text-blue-300" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No timetable published yet</h3>
                        <p className="text-sm text-muted-foreground">
                            The schedule for this class and week has not been published.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Mobile: single day with switcher */}
                    <div className="md:hidden space-y-4">
                        <div className="grid grid-cols-6 gap-1">
                            {days.map((d) => (
                                <Button
                                    key={d.dayOfWeek}
                                    variant={d.dayOfWeek === mobileDay ? 'default' : 'outline'}
                                    size="sm"
                                    className={`flex flex-col h-auto py-1.5 px-0 ${d.date === todayIso && d.dayOfWeek !== mobileDay ? 'border-blue-400 text-blue-600' : ''}`}
                                    onClick={() => setMobileDay(d.dayOfWeek)}
                                >
                                    <span className="text-xs font-bold">{d.label}</span>
                                    <span className="text-[10px] opacity-70">{formatDayDate(d.date)}</span>
                                </Button>
                            ))}
                        </div>

                        <Card>
                            <CardContent className="p-0 divide-y">
                                {selectedDay.cells.map((cell) => {
                                    const bell = BELL_SCHEDULE.find((b) => b.period === cell.period);
                                    return (
                                        <div key={cell.period} className="flex gap-3 px-4 py-3">
                                            <div className="w-14 shrink-0 text-center">
                                                <p className="text-sm font-bold text-foreground">{cell.period}</p>
                                                {bell && (
                                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                                        {bell.start}<br />{bell.end}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CellContent cell={cell} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desktop: full week grid */}
                    <div className="hidden md:block overflow-x-auto rounded-xl border bg-card shadow-sm">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-muted">
                                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-24 border-b">Period</th>
                                    {days.map((d) => (
                                        <th
                                            key={d.dayOfWeek}
                                            className={`px-3 py-2 text-left font-semibold border-b ${d.date === todayIso ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 'text-foreground'}`}
                                        >
                                            {d.label} <span className="font-normal text-xs text-muted-foreground">{formatDayDate(d.date)}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {BELL_SCHEDULE.map((bell) => (
                                    <tr key={bell.period} className="border-b last:border-b-0">
                                        <td className="px-3 py-2 align-top border-r bg-muted">
                                            <p className="font-bold text-foreground">{bell.period}</p>
                                            <p className="text-[11px] text-muted-foreground">{bell.start}–{bell.end}</p>
                                        </td>
                                        {days.map((d) => {
                                            const cell = d.cells.find((c) => c.period === bell.period) ?? {
                                                period: bell.period,
                                                lesson: null,
                                                substitution: null,
                                            };
                                            return (
                                                <td
                                                    key={d.dayOfWeek}
                                                    className={`px-3 py-2 align-top ${d.date === todayIso ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}`}
                                                >
                                                    <CellContent cell={cell} />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
