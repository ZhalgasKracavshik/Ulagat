import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
    try {
        // SIMULATION MODE: Skip Stripe for now.
        const origin = req.headers.get('origin');
        const successUrl = `${origin}/services?success=true`;

        return NextResponse.json({ url: successUrl });
    } catch (err: any) {
        console.error(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
