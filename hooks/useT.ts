"use client";

import { useT as useLocaleContext } from "@/contexts/LocaleContext";

/**
 * Convenience hook for the lightweight i18n system.
 *
 * Returns `{ t, locale, setLocale }` from the LocaleContext (wired in
 * app/layout.tsx). `t(path)` resolves a dot-path key against the active
 * dictionary, falling back to English and finally to the key itself.
 *
 * This is a thin re-export of the context hook so call sites can import from
 * `@/hooks/useT` (mirroring `@/hooks/useUIPhase`) without reaching into the
 * context module directly.
 */
export function useT() {
    return useLocaleContext();
}
