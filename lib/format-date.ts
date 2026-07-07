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
