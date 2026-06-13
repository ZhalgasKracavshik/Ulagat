import type { Dictionary, Locale } from "./types";
import { en } from "./en";
import { ru } from "./ru";
import { kk } from "./kk";

export type { Dictionary, Locale } from "./types";
export { LOCALE_COOKIE } from "./types";

/**
 * The school is Kazakhstani, so Russian is the default interface language.
 * Used both server-side (cookie fallback) and client-side (initial state).
 */
export const DEFAULT_LOCALE: Locale = "ru";

/** Ordered list of locales with their native display names. */
export const LOCALES: { code: Locale; name: string }[] = [
    { code: "en", name: "English" },
    { code: "ru", name: "Русский" },
    { code: "kk", name: "Қазақша" },
];

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, kk };

/** Narrow an arbitrary string to a supported Locale, or null if unsupported. */
export function isLocale(value: string | undefined | null): value is Locale {
    return value === "en" || value === "ru" || value === "kk";
}

/** Resolve a Locale to its dictionary (falls back to the default locale). */
export function getDictionary(locale: Locale): Dictionary {
    return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Resolve a dot-path (e.g. "nav.schedule") against a dictionary. Returns the
 * matched string, or the key itself if the path is missing / not a leaf — a
 * safe, visible fallback rather than throwing.
 */
export function resolveKey(dict: Dictionary, key: string): string {
    const parts = key.split(".");
    let current: string | Dictionary = dict;
    for (const part of parts) {
        if (typeof current !== "object" || current === null) return key;
        const next: string | Dictionary | undefined = current[part];
        if (next === undefined) return key;
        current = next;
    }
    return typeof current === "string" ? current : key;
}
