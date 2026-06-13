import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Phase 14 — Premium subscription checkout.
 *
 * Creates a Stripe Checkout Session in `subscription` mode for the Premium
 * plan and returns its URL. The browser then redirects to Stripe Checkout.
 * On success/cancel Stripe redirects back to /pricing with a status flag; the
 * actual plan flip happens in the webhook (never trust the redirect).
 *
 * Requires the STRIPE_PREMIUM_PRICE_ID env var (a recurring price). If it is
 * not configured we return a clear, actionable error instead of a 500.
 */
export async function POST(req: NextRequest) {
    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
        return NextResponse.json(
            { error: 'Premium plan not configured yet. Set STRIPE_PREMIUM_PRICE_ID.' },
            { status: 503 }
        );
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const origin =
        req.headers.get('origin') ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        new URL(req.url).origin;

    try {
        // Reuse an existing Stripe customer if the user already has a row, so
        // repeated upgrades / portal sessions stay attached to one customer.
        const admin = createAdminClient();
        const { data: existing } = await admin
            .from('subscriptions')
            .select('stripe_customer_id, plan, status')
            .eq('user_id', user.id)
            .maybeSingle();

        // Already premium and active → nothing to buy.
        if (existing?.plan === 'premium' && existing?.status === 'active') {
            return NextResponse.json(
                { error: 'You already have an active Premium subscription.' },
                { status: 409 }
            );
        }

        const customerId = existing?.stripe_customer_id ?? undefined;

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/pricing?status=success`,
            cancel_url: `${origin}/pricing?status=cancel`,
            ...(customerId
                ? { customer: customerId }
                : { customer_email: user.email ?? undefined }),
            // Carry the app user id through Stripe so the webhook can map the
            // resulting customer/subscription back to a profile reliably.
            client_reference_id: user.id,
            metadata: { user_id: user.id },
            subscription_data: { metadata: { user_id: user.id } },
        });

        if (!session.url) {
            return NextResponse.json(
                { error: 'Could not create checkout session.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ url: session.url });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Checkout failed';
        console.error('[subscriptions/checkout]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
