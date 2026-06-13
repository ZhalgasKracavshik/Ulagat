import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Phase 14 — Stripe webhook.
 *
 * Handles the freemium subscription lifecycle:
 *   - checkout.session.completed (mode=subscription) → activate premium
 *   - customer.subscription.updated                  → sync status/period
 *   - customer.subscription.deleted                  → downgrade to free
 *
 * All writes go through the service-role admin client (RLS-bypassing), which
 * is the ONLY path allowed to write public.subscriptions. The subscription
 * row is the single source of truth for premium access.
 *
 * NOTE: earlier phases ran this endpoint in "simulation mode" (service
 * postings were made free in Phase 5), so there is no one-time-payment
 * fulfilment to preserve here — only the no-secret short-circuit below keeps
 * local/dev environments safe.
 */

// Map a Stripe subscription status onto our narrower set.
function mapStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' {
    switch (stripeStatus) {
        case 'active':
        case 'trialing':
            return 'active';
        case 'past_due':
        case 'unpaid':
            return 'past_due';
        default:
            // canceled, incomplete, incomplete_expired, paused, …
            return 'canceled';
    }
}

type SubscriptionUpsert = {
    user_id: string;
    plan: 'free' | 'premium';
    status: 'active' | 'canceled' | 'past_due';
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    updated_at: string;
};

function userIdFromSubscription(sub: Stripe.Subscription): string | null {
    const fromMeta = sub.metadata?.user_id;
    return typeof fromMeta === 'string' && fromMeta.length > 0 ? fromMeta : null;
}

async function upsertFromSubscription(sub: Stripe.Subscription, fallbackUserId?: string) {
    const admin = createAdminClient();
    const userId = userIdFromSubscription(sub) ?? fallbackUserId ?? null;

    const status = mapStatus(sub.status);
    const canceled = status === 'canceled';
    // In the current Stripe API (Basil / v20 SDK) the billing period lives on
    // the subscription items, not the subscription object. Use the first item.
    const periodEndUnix = sub.items?.data?.[0]?.current_period_end ?? null;
    const periodEnd = periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null;

    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;

    const row: SubscriptionUpsert = {
        // user_id is filled below; placeholder keeps the type honest.
        user_id: userId ?? '',
        plan: canceled ? 'free' : 'premium',
        status,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
    };

    if (userId) {
        // Preferred path: we know the app user → upsert on the unique user_id.
        await admin.from('subscriptions').upsert(row, { onConflict: 'user_id' });
        return;
    }

    // No user_id in metadata (e.g. an updated/deleted event for a sub created
    // out-of-band). Fall back to matching an existing row by Stripe ids.
    const { data: existing } = await admin
        .from('subscriptions')
        .select('user_id')
        .or(
            `stripe_subscription_id.eq.${sub.id}` +
            (customerId ? `,stripe_customer_id.eq.${customerId}` : '')
        )
        .maybeSingle();

    if (existing?.user_id) {
        row.user_id = existing.user_id;
        await admin.from('subscriptions').upsert(row, { onConflict: 'user_id' });
    } else {
        console.warn('[stripe webhook] subscription event without resolvable user', sub.id);
    }
}

export async function POST(req: NextRequest) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Simulation / unconfigured environments: acknowledge without processing
    // so local Stripe-less runs and the build don't error.
    if (!webhookSecret) {
        return NextResponse.json({ received: true, simulated: true });
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid signature';
        console.error('[stripe webhook] signature verification failed:', message);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode !== 'subscription' || !session.subscription) break;

                const subscriptionId =
                    typeof session.subscription === 'string'
                        ? session.subscription
                        : session.subscription.id;
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const fallbackUserId =
                    session.client_reference_id ??
                    (typeof session.metadata?.user_id === 'string'
                        ? session.metadata.user_id
                        : undefined);
                await upsertFromSubscription(sub, fallbackUserId);
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                await upsertFromSubscription(sub);
                break;
            }
            default:
                // Ignore unrelated events.
                break;
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Handler error';
        console.error('[stripe webhook] handler error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
