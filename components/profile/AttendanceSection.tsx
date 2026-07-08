"use client";

import { LogIn, LogOut, DoorOpen } from "lucide-react";
import { useT } from "@/hooks/useT";
import type { SkudEvent } from "@/types";

const ALMATY_TZ = "Asia/Almaty";
const LOCALE_TAG: Record<string, string> = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };

// Stable day bucket key — locale-independent (never shown to the user).
function dayKey(iso: string): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: ALMATY_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(iso));
}

function timeLabel(iso: string, tag: string): string {
    return new Intl.DateTimeFormat(tag, {
        timeZone: ALMATY_TZ, hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
}

function dayLabel(key: string, tag: string): string {
    return new Intl.DateTimeFormat(tag, {
        timeZone: ALMATY_TZ, weekday: "short", day: "numeric", month: "long",
    }).format(new Date(`${key}T12:00:00+05:00`));
}

/** Parents-only view of the child's turnstile history (last 14 days). */
export function AttendanceSection({ events }: { events: SkudEvent[] }) {
    const { t, locale } = useT();
    const tag = LOCALE_TAG[locale] ?? "ru-RU";

    if (events.length === 0) {
        return (
            <div className="rounded-xl border border-dashed bg-muted py-10 text-center">
                <DoorOpen className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("skud.empty")}</p>
            </div>
        );
    }

    const byDay = new Map<string, SkudEvent[]>();
    for (const e of events) {
        const key = dayKey(e.recorded_at);
        const list = byDay.get(key);
        if (list) list.push(e);
        else byDay.set(key, [e]);
    }

    return (
        <div className="space-y-4">
            {[...byDay.entries()].map(([day, list]) => (
                <div key={day} className="rounded-xl border border-border bg-card p-4">
                    <h4 className="mb-2 text-sm font-semibold capitalize text-foreground">
                        {dayLabel(day, tag)}
                    </h4>
                    <ul className="space-y-1.5">
                        {list
                            .slice()
                            .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
                            .map((e) => (
                                <li key={e.id} className="flex items-center gap-2 text-sm">
                                    {e.direction === "in" ? (
                                        <LogIn className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <LogOut className="h-4 w-4 text-orange-500" />
                                    )}
                                    <span className="font-medium tabular-nums">
                                        {timeLabel(e.recorded_at, tag)}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {e.direction === "in" ? t("skud.in") : t("skud.out")}
                                    </span>
                                    {e.gate && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {e.gate}
                                        </span>
                                    )}
                                </li>
                            ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
