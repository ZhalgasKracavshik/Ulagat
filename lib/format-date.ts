/**
 * Locale-aware date formatting in the school timezone (Asia/Almaty).
 *
 * Pages previously used date-fns `format(d, 'MMM d, yyyy')`, which always
 * renders English month names — so Russian/Kazakh users saw "Jul 7, 2026".
 * Intl.DateTimeFormat with the viewer's locale fixes that without a heavy
 * locale-bundle dependency.
 */

const LOCALE_TAG: Record<string, string> = {
    ru: "ru-RU",
    kk: "kk-KZ",
    en: "en-US",
};

const ALMATY_TZ = "Asia/Almaty";

function tag(locale: string): string {
    return LOCALE_TAG[locale] ?? "ru-RU";
}

/** e.g. "7 июл. 2026 г." (ru) / "Jul 7, 2026" (en), in Almaty time. */
export function formatDateLocalized(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(tag(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: ALMATY_TZ,
    }).format(new Date(iso));
}

/** Date + time, e.g. "7 июл. 2026 г., 14:30" — for events/claims with a time. */
export function formatDateTimeLocalized(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(tag(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: ALMATY_TZ,
    }).format(new Date(iso));
}

/** Day + month only, e.g. "7 июл." — for compact chips/rows. */
export function formatDayMonthLocalized(iso: string, locale: string): string {
    return new Intl.DateTimeFormat(tag(locale), {
        day: "numeric",
        month: "short",
        timeZone: ALMATY_TZ,
    }).format(new Date(iso));
}

/**
 * Locale-aware "time ago" ("2 часа назад" / "2 hours ago"), replacing date-fns
 * `formatDistanceToNow`, which always rendered English. Uses Intl.RelativeTimeFormat
 * (no locale bundle) and picks the coarsest sensible unit.
 */
export function formatRelativeLocalized(iso: string, locale: string, now: number = Date.now()): string {
    const rtf = new Intl.RelativeTimeFormat(tag(locale), { numeric: "auto" });
    const diffMs = new Date(iso).getTime() - now; // negative = in the past
    const abs = Math.abs(diffMs);

    const MIN = 60_000;
    const HOUR = 60 * MIN;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;

    const at = (unit: Intl.RelativeTimeFormatUnit, ms: number) => rtf.format(Math.round(diffMs / ms), unit);

    if (abs < MIN) return at("second", 1000);
    if (abs < HOUR) return at("minute", MIN);
    if (abs < DAY) return at("hour", HOUR);
    if (abs < WEEK) return at("day", DAY);
    if (abs < MONTH) return at("week", WEEK);
    if (abs < YEAR) return at("month", MONTH);
    return at("year", YEAR);
}
