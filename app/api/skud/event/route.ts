import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    SKUD_DIRECTIONS,
    normalizeCardId,
    normalizeGate,
    normalizeRecordedAt,
} from "@/lib/skud/validate";
import type { SkudDirection } from "@/types";

export const runtime = "nodejs"; // node:crypto for the timing-safe compare

const MAX_BODY_BYTES = 1024;

/** Constant-time secret check (length mismatch returns early — length is not secret). */
function secretMatches(header: string | null, expected: string): boolean {
    if (!header) return false;
    const a = Buffer.from(header);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

/**
 * SKUD push endpoint. Server-to-server only: authenticated by the shared
 * secret in `x-skud-secret`. Unknown cards return 202 so a probing caller
 * cannot use response codes as a card-validity oracle.
 */
export async function POST(request: Request) {
    const expected = process.env.SKUD_WEBHOOK_SECRET;
    if (!expected) {
        // Not configured yet — the integration is off, don't accept anything.
        return NextResponse.json({ error: "SKUD integration is not configured." }, { status: 503 });
    }
    if (!secretMatches(request.headers.get("x-skud-secret"), expected)) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "Body too large." }, { status: 413 });
    }
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const cardId = normalizeCardId(body.card_id);
    if (!cardId) {
        return NextResponse.json({ error: "card_id is required (max 64 chars)." }, { status: 400 });
    }
    const direction = body.direction as SkudDirection;
    if (!SKUD_DIRECTIONS.includes(direction)) {
        return NextResponse.json({ error: "direction must be 'in' or 'out'." }, { status: 400 });
    }
    const recorded = normalizeRecordedAt(body.recorded_at);
    if ("error" in recorded) {
        return NextResponse.json({ error: recorded.error }, { status: 400 });
    }
    const gate = normalizeGate(body.gate);

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("external_skud_id", cardId)
        .maybeSingle();
    if (!profile) {
        // Accepted but unmapped: identical response for any unknown card, and
        // the card value itself is never logged.
        console.warn("[skud] event for unmapped card");
        return NextResponse.json({ ok: true, mapped: false }, { status: 202 });
    }

    const { error } = await admin.from("skud_events").insert({
        user_id: profile.id,
        external_id: cardId,
        direction,
        gate,
        recorded_at: recorded.iso,
    });
    if (error) {
        console.error("[skud] insert failed:", error);
        return NextResponse.json({ error: "Failed to record the event." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, mapped: true });
}
