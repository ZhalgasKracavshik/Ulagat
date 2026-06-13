/**
 * Lightweight, cookie-persisted i18n for the Ulagat shell.
 *
 * Three locales are supported. The school is Kazakhstani, so Russian is the
 * default (see DEFAULT_LOCALE in ./index). There is intentionally no
 * [locale] route segment — the active locale lives in a cookie and a client
 * context, so switching is instant and the URL space stays flat.
 */
export type Locale = "en" | "ru" | "kk";

/**
 * A dictionary is a nested record of translation strings. Leaves are strings;
 * branches are nested groups (e.g. nav.schedule, settings.title). The same
 * shape is shared by every locale so `t('a.b.c')` resolves consistently.
 */
export type Dictionary = {
    [key: string]: string | Dictionary;
};

/** Cookie name that persists the chosen locale (1-year, path=/). */
export const LOCALE_COOKIE = "ulagat-locale";
