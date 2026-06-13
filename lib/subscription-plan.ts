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
 * return the effective plan.
 *
 * Access lasts until the end of the paid period: a row counts as premium when
 * plan='premium' AND current_period_end is still in the future — EVEN IF the
 * status is 'canceled'. Cancel-at-period-end is the normal Stripe flow, and a
 * user who has paid through a period keeps premium until that period passes.
 * Once current_period_end is in the past (or absent), the plan is 'free'.
 */
export function resolvePlan(row: PlanRow, nowMs: number): SubscriptionPlan {
    if (!row) return 'free';
    if (row.plan !== 'premium') return 'free';
    if (!row.current_period_end) return 'free';
    const end = new Date(row.current_period_end).getTime();
    if (!Number.isFinite(end) || end <= nowMs) return 'free';
    return 'premium';
}
