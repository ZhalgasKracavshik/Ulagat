import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) throw new Error('Missing signature or secret');
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;

            // Here we would match the session to the service listing created earlier
            // For now, we assume the metadata contains the service ID or we create it here

            // Example:
            // const serviceId = session.metadata?.serviceId;
            // if (serviceId) {
            //   const supabase = await createClient();
            //   await supabase.from('services').update({ status: 'active', payment_status: 'paid' }).eq('id', serviceId);
            // }

            console.log('Payment successful for session:', session.id);
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
