import { createClient } from '@/lib/supabase/server';
import type { SubscriptionPlan } from '@/types';
import { resolvePlan } from '@/lib/subscription-plan';

// Re-export the client-safe resolver/types so server-side callers can keep a
// single import site (the actual logic lives in lib/subscription-plan.ts,
// which has no server-only deps and is therefore client-bundle safe).
export { resolvePlan };
export type { PlanRow } from '@/lib/subscription-plan';

/**
 * Phase 14 — server-side plan resolution.
 *
 * The subscriptions table is the single source of truth for premium
 * access. It is written ONLY by the Stripe webhook (service role), so
 * reads here are trustworthy: a user cannot self-grant premium.
 *
 * A subscription counts as premium while plan='premium' and the
 * current_period_end is still in the future — even if it is canceled
 * (cancel-at-period-end keeps access until the paid period ends).
 * Otherwise we fall back to 'free' (no row, no/expired period).
 */
export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
    const supabase = await createClient();

    const { data } = await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle();

    return resolvePlan(data, Date.now());
}

/**
 * Convenience for server components / actions that want to gate premium
 * features. Returns the effective plan plus a boolean. AI features come
 * later — for now this is infrastructure callers can build on.
 *
 * If no userId is passed, resolves the current authenticated user.
 */
export async function requirePremium(
    userId?: string
): Promise<{ plan: SubscriptionPlan; isPremium: boolean }> {
    let resolvedId = userId;

    if (!resolvedId) {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return { plan: 'free', isPremium: false };
        }
        resolvedId = user.id;
    }

    const plan = await getUserPlan(resolvedId);
    return { plan, isPremium: plan === 'premium' };
}
