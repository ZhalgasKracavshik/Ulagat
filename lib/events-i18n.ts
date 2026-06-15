/**
 * i18n key mappings for event tags and holiday names.
 *
 * Event tags and holiday names are stored as English slugs/strings in the data
 * layer (lib/events.ts). These helpers map them to dictionary dot-paths so both
 * server components (via resolveKey) and client components (via useT) can render
 * localized labels without duplicating the lookup tables.
 */
import type { EventTag } from "./events";

/** Dictionary key for an event tag slug (e.g. 'it' → 'events.tagIt'). */
export function eventTagKey(tag: EventTag | string): string {
    const map: Record<string, string> = {
        it: "events.tagIt",
        sport: "events.tagSport",
        science: "events.tagScience",
        math: "events.tagMath",
        art: "events.tagArt",
        language: "events.tagLanguage",
        olympiad: "events.tagOlympiad",
        holiday: "events.tagHoliday",
    };
    return map[tag] ?? tag;
}

/** Dictionary key for a holiday name (as stored in lib/events HOLIDAYS). */
export function holidayNameKey(name: string): string {
    const map: Record<string, string> = {
        "New Year": "events.holidayNewYear",
        "Women's Day": "events.holidayWomensDay",
        Nauryz: "events.holidayNauryz",
        "Unity Day": "events.holidayUnityDay",
        "Defender's Day": "events.holidayDefendersDay",
        "Victory Day": "events.holidayVictoryDay",
        "Capital Day": "events.holidayCapitalDay",
        "Constitution Day": "events.holidayConstitutionDay",
        "Republic Day": "events.holidayRepublicDay",
        "Independence Day": "events.holidayIndependenceDay",
    };
    return map[name] ?? name;
}
