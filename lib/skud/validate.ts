import type { SkudDirection } from "@/types";

export const SKUD_DIRECTIONS: SkudDirection[] = ["in", "out"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Validates and normalizes a SKUD event timestamp. Accepts an ISO string or
 * undefined (= now). Rejects the future (>5 min skew) and anything older than
 * 7 days — a replayed or misconfigured feed must not rewrite history.
 */
export function normalizeRecordedAt(raw: unknown): { iso: string } | { error: string } {
    if (raw === undefined || raw === null || raw === "") {
        return { iso: new Date().toISOString() };
    }
    if (typeof raw !== "string") return { error: "recorded_at must be an ISO string." };
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return { error: "recorded_at is not a valid timestamp." };
    const now = Date.now();
    if (ts > now + 5 * 60 * 1000) return { error: "recorded_at is in the future." };
    if (ts < now - WEEK_MS) return { error: "recorded_at is older than 7 days." };
    return { iso: new Date(ts).toISOString() };
}

/** Card id: non-empty, printable, max 64 chars. */
export function normalizeCardId(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const v = raw.trim();
    if (!v || v.length > 64) return null;
    return v;
}

/** Gate label: optional, max 64 chars. */
export function normalizeGate(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const v = raw.trim();
    return v ? v.slice(0, 64) : null;
}
