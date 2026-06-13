import type { SubscriptionPlan } from '@/types';

/**
 * Client-safe plan resolution.
 *
 * Kept in its own module (no server-only imports like next/headers) so it can
 * be shared by both server code (lib/subscription.ts) and client components
 * (the navbar). Importing the server helper from a client component would pull
 * next/headers into the browser bundle and break the build.
 */

/** The subset of a subscriptions row needed to decide the effective plan. */
export type PlanRow = {
    plan: string | null;
    status: string | null;
    current_period_end: string | null;
} | null;

/**
 * Pure resolver: given a subscriptions row (or null) and the current epoch ms,
 * return the effective plan. Premium only when plan='premium', status='active'
 * and not past current_period_end.
 */
export function resolvePlan(row: PlanRow, nowMs: number): SubscriptionPlan {
    if (!row) return 'free';
    if (row.plan !== 'premium') return 'free';
    if (row.status !== 'active') return 'free';
    if (row.current_period_end) {
        const end = new Date(row.current_period_end).getTime();
        if (Number.isFinite(end) && end <= nowMs) return 'free';
    }
    return 'premium';
}
