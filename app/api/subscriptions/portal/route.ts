import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Phase 14 — Stripe billing portal.
 *
 * Returns a one-off Stripe Customer Portal URL so a premium user can manage
 * (cancel / update payment method) their subscription. Requires the user to
 * already have a stripe_customer_id stored from a prior checkout.
 */
export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: sub } = await admin
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!sub?.stripe_customer_id) {
        return NextResponse.json(
            { error: 'No billing account found. Upgrade to Premium first.' },
            { status: 404 }
        );
    }

    const origin =
        req.headers.get('origin') ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        new URL(req.url).origin;

    try {
        const portal = await stripe.billingPortal.sessions.create({
            customer: sub.stripe_customer_id,
            return_url: `${origin}/pricing`,
        });
        return NextResponse.json({ url: portal.url });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Portal failed';
        console.error('[subscriptions/portal]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
