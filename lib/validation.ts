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
