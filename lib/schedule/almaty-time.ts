// School timezone: Asia/Almaty (UTC+5, no DST).
//
// Vercel servers run in UTC, so naive `new Date()` + local getters would be
// wrong between 00:00–05:00 Almaty time (today/week boundaries off by a day).
//
// Approach: shift the epoch by +5h. The returned Date's **UTC** fields then
// represent the current wall-clock time in Almaty.
//
// IMPORTANT: only read the result with UTC accessors (getUTCDay, getUTCHours,
// toISOString, …). Do NOT pass it to APIs that use local getters (date-fns
// startOfWeek/format, getDay, getHours) — those would re-apply the runtime's
// own timezone offset and break on non-UTC machines.
const ALMATY_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

const DAY_MS = 86_400_000;

/**
 * Returns a Date whose UTC fields represent the current wall-clock time in
 * Asia/Almaty. Read it with getUTC* accessors or toISOString() only.
 */
export function almatyNow(): Date {
  return new Date(Date.now() + ALMATY_UTC_OFFSET_MS);
}

/** 'yyyy-MM-dd' of today in Asia/Almaty. */
export function almatyTodayIso(): string {
  return almatyNow().toISOString().slice(0, 10);
}

/** ISO day of week in Almaty: 1 = Monday … 7 = Sunday. */
export function almatyDayOfWeek(): number {
  const d = almatyNow().getUTCDay(); // 0=Sun..6=Sat
  return d === 0 ? 7 : d;
}

/** 'yyyy-MM-dd' of Monday of the current week in Asia/Almaty. */
export function almatyWeekMondayIso(): string {
  const now = almatyNow();
  const dow = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  const monday = new Date(now.getTime() - (dow - 1) * DAY_MS);
  return monday.toISOString().slice(0, 10);
}

/** Adds `days` (may be negative) to a 'yyyy-MM-dd' string, calendar-safe. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
