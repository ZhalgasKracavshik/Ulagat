/**
 * Shared input validation helpers.
 *
 * UUID_RE matches the canonical 36-char UUID form. Use isUuid() to validate any
 * client-supplied id BEFORE interpolating it into a PostgREST filter string
 * (e.g. `.or(...)`), since PostgREST treats those filters as a mini query
 * language and an unvalidated value could alter the filter's meaning.
 */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
    return typeof v === "string" && UUID_RE.test(v);
}

/**
 * Returns a trimmed URL only if it is a plain http(s) link, otherwise null.
 *
 * User-supplied URLs (achievement image_url, olympiad material url, …) get
 * rendered into anchor hrefs. Without this guard a value like
 * `javascript:fetch(...)` becomes a clickable link that runs script in the
 * clicker's session (stored XSS). Use at BOTH write time (reject/normalize
 * before insert) and render time (defense in depth) — pass any stored value
 * through this before putting it in an href.
 */
export function safeHttpUrl(v: unknown): string | null {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (!trimmed) return null;
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return trimmed;
}
