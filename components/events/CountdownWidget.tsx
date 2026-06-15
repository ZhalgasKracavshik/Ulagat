"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, PartyPopper, Timer } from "lucide-react";
import Link from "next/link";
import { useT } from "@/hooks/useT";
import { holidayNameKey } from "@/lib/events-i18n";
import type { UpcomingHoliday } from "@/lib/events";

interface CountdownWidgetProps {
    /** Next ЕНТ date, ISO 'yyyy-MM-dd' (June 1 annually, computed server-side in Almaty time). */
    entDateIso: string;
    /** Next big holiday (computed server-side in Almaty time). */
    holiday: UpcomingHoliday;
    /** Nearest upcoming event with a registration deadline, if any. */
    nearestEvent: {
        id: string;
        title: string;
        /** ISO date 'yyyy-MM-dd' */
        registrationDeadline: string;
    } | null;
}

/** Whole days from now until Almaty midnight of the given ISO date (floored at 0). */
function daysUntil(isoDate: string, now: Date): number {
    const target = new Date(`${isoDate}T00:00:00+05:00`); // Almaty midnight
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / 86_400_000));
}

/** 'yyyy-MM-dd' → e.g. 'June 1, 2027' (timezone-independent), localized. */
function formatIsoDate(isoDate: string, locale: string): string {
    const [y, m, d] = isoDate.split("-").map(Number);
    const intlLocale = locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US";
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(intlLocale, {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function CountdownWidget({ entDateIso, holiday, nearestEvent }: CountdownWidgetProps) {
    const { t, locale } = useT();
    // Render counters only after mount to avoid SSR/client hydration mismatch.
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        const interval = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(interval);
    }, []);

    const entDays = now ? daysUntil(entDateIso, now) : null;
    const holidayDays = now ? daysUntil(holiday.dateIso, now) : null;
    const eventDays = now && nearestEvent ? daysUntil(nearestEvent.registrationDeadline, now) : null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-full text-violet-700 dark:text-violet-200 shrink-0">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-500">{t('events.countdownEnt')}</p>
                        <p className="text-2xl font-black text-violet-900 tabular-nums">
                            {entDays === null ? "—" : entDays === 0 ? t('events.today') : t('events.days', { n: entDays })}
                        </p>
                        <p className="text-[11px] text-violet-600">{formatIsoDate(entDateIso, locale)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-200 shrink-0">
                        <PartyPopper className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">{t('events.nextHoliday')}</p>
                        <p className="text-2xl font-black text-emerald-900 tabular-nums">
                            {holidayDays === null ? "—" : holidayDays === 0 ? t('events.today') : t('events.days', { n: holidayDays })}
                        </p>
                        <p className="text-[11px] text-emerald-600 truncate">
                            {t(holidayNameKey(holiday.name))} · {formatIsoDate(holiday.dateIso, locale)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 overflow-hidden sm:col-span-2 lg:col-span-1">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-200 shrink-0">
                        <Timer className="w-6 h-6" />
                    </div>
                    {nearestEvent ? (
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('events.registrationClosesIn')}</p>
                            <p className="text-2xl font-black text-blue-900 tabular-nums">
                                {eventDays === null ? "—" : eventDays === 0 ? t('events.today') : t('events.days', { n: eventDays })}
                            </p>
                            <Link
                                href={`/events/${nearestEvent.id}`}
                                className="text-[11px] text-blue-600 hover:underline truncate block"
                            >
                                {nearestEvent.title}
                            </Link>
                        </div>
                    ) : (
                        <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-500">{t('events.registrationDeadlines')}</p>
                            <p className="text-sm font-medium text-blue-800">{t('events.noDeadlines')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
