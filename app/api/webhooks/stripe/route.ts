
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // SIMULATION MODE: Webhook disabled.
    return NextResponse.json({ received: true });
}
