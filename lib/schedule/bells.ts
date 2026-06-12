/**
 * BINOM bell schedule (standard KZ school bells).
 * Times are local school time. Adjust here if the school changes its bells.
 * 10-minute breaks, with a bigger 20-minute break after period 3.
 */
export const BELL_SCHEDULE = [
    { period: 1, start: '08:00', end: '08:45' },
    { period: 2, start: '08:55', end: '09:40' },
    { period: 3, start: '09:50', end: '10:35' },
    { period: 4, start: '10:55', end: '11:40' },
    { period: 5, start: '11:50', end: '12:35' },
    { period: 6, start: '12:45', end: '13:30' },
    { period: 7, start: '13:40', end: '14:25' },
    { period: 8, start: '14:35', end: '15:20' },
] as const;

export type BellPeriod = (typeof BELL_SCHEDULE)[number];

export type PeriodStatus = 'lesson' | 'break' | 'before' | 'after';

export type CurrentPeriodInfo = {
    /** During a lesson: the period in progress. During a break / before school: the upcoming period. After school: the last period. */
    period: number;
    status: PeriodStatus;
    /** Minutes until the next bell: lesson → until it ends; break/before → until the next lesson starts; after → 0. */
    minutesLeft: number;
};

function toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function nowMinutes(now: Date): number {
    // UTC accessors on purpose: callers pass `almatyNow()` (a shifted-epoch
    // Date whose UTC fields hold Almaty wall-clock time). See almaty-time.ts.
    return now.getUTCHours() * 60 + now.getUTCMinutes();
}

/** Start/end times (HH:mm) for a period number (1-8), or undefined for unknown periods. */
export function getPeriodTime(period: number): { start: string; end: string } | undefined {
    const bell = BELL_SCHEDULE.find((b) => b.period === period);
    return bell ? { start: bell.start, end: bell.end } : undefined;
}

/**
 * Where we are inside the school day right now.
 * `now` must be an `almatyNow()` shifted-epoch Date (UTC fields = Almaty wall clock).
 */
export function getCurrentPeriod(now: Date): CurrentPeriodInfo {
    const minutes = nowMinutes(now);

    const current = BELL_SCHEDULE.find(
        (p) => minutes >= toMinutes(p.start) && minutes < toMinutes(p.end)
    );
    if (current) {
        return {
            period: current.period,
            status: 'lesson',
            minutesLeft: toMinutes(current.end) - minutes,
        };
    }

    const next = BELL_SCHEDULE.find((p) => minutes < toMinutes(p.start));
    if (!next) {
        return {
            period: BELL_SCHEDULE[BELL_SCHEDULE.length - 1].period,
            status: 'after',
            minutesLeft: 0,
        };
    }

    return {
        period: next.period,
        status: next.period === BELL_SCHEDULE[0].period ? 'before' : 'break',
        minutesLeft: toMinutes(next.start) - minutes,
    };
}
