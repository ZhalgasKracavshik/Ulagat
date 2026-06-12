/** Allowed event tags (Phase 3 — Школьная афиша). */
export const EVENT_TAGS = [
    'it',
    'sport',
    'science',
    'math',
    'art',
    'language',
    'olympiad',
    'holiday',
] as const;

export type EventTag = (typeof EVENT_TAGS)[number];

export function isEventTag(value: string): value is EventTag {
    return (EVENT_TAGS as readonly string[]).includes(value);
}

/** Roles allowed to create events (status stays 'pending' for moderation). */
export const EVENT_CREATOR_ROLES = ['teacher', 'admin', 'moderator', 'parliament'] as const;

// ------------------------------------------------------------------
// Countdown widget dates (Phase 3)
// ------------------------------------------------------------------

/** ЕНТ (Unified National Testing) is held annually on June 1. */
export function nextEntIso(todayIso: string): string {
    const year = Number(todayIso.slice(0, 4));
    const thisYearEnt = `${year}-06-01`;
    return todayIso <= thisYearEnt ? thisYearEnt : `${year + 1}-06-01`;
}

/** Big recurring holidays in Kazakhstan — static dates (month/day). */
export const HOLIDAYS = [
    { month: 1, day: 1, name: 'New Year' },
    { month: 3, day: 8, name: "Women's Day" },
    { month: 3, day: 21, name: 'Nauryz' },
    { month: 5, day: 1, name: 'Unity Day' },
    { month: 5, day: 7, name: "Defender's Day" },
    { month: 5, day: 9, name: 'Victory Day' },
    { month: 7, day: 6, name: 'Capital Day' },
    { month: 8, day: 30, name: 'Constitution Day' },
    { month: 10, day: 25, name: 'Republic Day' },
    { month: 12, day: 16, name: 'Independence Day' },
] as const;

export type UpcomingHoliday = { name: string; dateIso: string };

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/** The next big holiday on or after `todayIso` ('yyyy-MM-dd', Almaty date). */
export function nextHoliday(todayIso: string): UpcomingHoliday {
    const year = Number(todayIso.slice(0, 4));
    const candidates: UpcomingHoliday[] = [];
    for (const y of [year, year + 1]) {
        for (const h of HOLIDAYS) {
            const dateIso = `${y}-${pad2(h.month)}-${pad2(h.day)}`;
            if (dateIso >= todayIso) {
                candidates.push({ name: h.name, dateIso });
            }
        }
    }
    candidates.sort((a, b) => (a.dateIso < b.dateIso ? -1 : 1));
    return candidates[0];
}
