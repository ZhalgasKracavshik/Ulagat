"use client";

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    resolveKey,
    type Locale,
} from "@/lib/i18n";

/** Translate function: resolves a dot-path against the active dictionary. */
export type TranslateFn = (
    key: string,
    vars?: Record<string, string | number>,
) => string;

type LocaleContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: TranslateFn;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Locale provider. The initial locale is resolved server-side from the
 * `ulagat-locale` cookie and passed in via `initialLocale`, so the very first
 * client render matches SSR (no hydration mismatch). `setLocale` writes the
 * cookie (1-year, path=/) and updates state, so the UI re-renders instantly
 * without a full reload.
 */
export function LocaleProvider({
    initialLocale,
    children,
}: {
    initialLocale: Locale;
    children: ReactNode;
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale);

    const setLocale = useCallback((next: Locale) => {
        try {
            // 1-year cookie, site-wide. SameSite=Lax is fine for a UI pref.
            const maxAge = 60 * 60 * 24 * 365;
            document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${maxAge}; SameSite=Lax`;
        } catch {
            // Cookie write can fail in rare sandboxed contexts — the in-memory
            // value below still updates the UI for this session.
        }
        setLocaleState(next);
    }, []);

    const t = useMemo<TranslateFn>(() => {
        const dict = getDictionary(locale);
        const enDict = getDictionary("en");
        return (key, vars) => {
            // Active locale → English fallback → the key itself. The English
            // fallback prevents raw dot-paths from leaking to ru/kk users if a
            // future key exists only in en.
            let value = resolveKey(dict, key);
            if (value === key && dict !== enDict) {
                value = resolveKey(enDict, key);
            }
            if (vars) {
                for (const [name, replacement] of Object.entries(vars)) {
                    value = value.replace(`{${name}}`, String(replacement));
                }
            }
            return value;
        };
    }, [locale]);

    const value = useMemo<LocaleContextValue>(
        () => ({ locale, setLocale, t }),
        [locale, setLocale, t],
    );

    return (
        <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    );
}

/**
 * Access the active locale and translate function. Must be used within a
 * <LocaleProvider>. Outside a provider (e.g. an isolated test) it falls back
 * to the default locale so components never crash.
 */
export function useT(): LocaleContextValue {
    const ctx = useContext(LocaleContext);
    if (ctx) return ctx;

    // Defensive fallback — should not happen in the running app since the
    // provider wraps the whole tree in app/layout.tsx.
    const dict = getDictionary(DEFAULT_LOCALE);
    const enDict = getDictionary("en");
    return {
        locale: DEFAULT_LOCALE,
        setLocale: () => {},
        t: (key, vars) => {
            let value = resolveKey(dict, key);
            if (value === key && dict !== enDict) {
                value = resolveKey(enDict, key);
            }
            if (vars) {
                for (const [name, replacement] of Object.entries(vars)) {
                    value = value.replace(`{${name}}`, String(replacement));
                }
            }
            return value;
        },
    };
}
