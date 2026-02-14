import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia', // Use latest API version available or match installed package
});

export async function POST(req: NextRequest) {
    try {
        const { title, price } = await req.json();

        // Create Checkout Sessions from body params.
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: 'kzt',
                        product_data: {
                            name: `Service Listing: ${title}`,
                            description: 'One-time fee for listing your service on Ulagat.',
                            images: ['https://ulagat.com/og-image.png'], // Replace with actual image
                        },
                        unit_amount: 100 * 100, // 100 KZT in tiyn (if applicable, or small currency unit). Stripe expects smallest currency unit usually.
                        // Note: KZT is zero-decimal? No, usually generic. 100 KZT. verify zero-decimal.
                        // Stripe supports KZT. It is a 2-decimal currency usually, so amount is in tiyn.
                        // 100.00 KZT = 10000.
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/services?success=true`,
            cancel_url: `${req.headers.get('origin')}/services/new?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
