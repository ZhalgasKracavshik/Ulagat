import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

/**
 * Edge-safe rate limiting for authentication surfaces, backed by Upstash Redis
 * (pure REST — works in any runtime).
 *
 * Behaviour contract:
 * - No env vars (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) →
 *   limiting is OFF and every check allows. The app must never break because
 *   the Redis account does not exist yet.
 * - Upstash errors/timeouts → fail OPEN (allow). Availability of the school
 *   platform beats strictness; the limiter is an abuse brake, not an auth gate.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

/**
 * Auth surfaces (login / register / password reset): 10 attempts per minute
 * per IP. Sliding window smooths bursts at the boundary. Generous enough for
 * a shared school NAT, tight enough to make credential stuffing impractical
 * (Supabase GoTrue also rate-limits upstream as a second layer).
 */
const authLimiter = redis
    ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(10, "60 s"),
          prefix: "rl:auth",
      })
    : null;

/** True when the limiter is configured (env present). */
export function rateLimitEnabled(): boolean {
    return authLimiter !== null;
}

/** Client IP for keying. On Vercel, x-forwarded-for's first hop is the client. */
export function clientIp(request: NextRequest): string {
    const fwd = request.headers.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return request.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitVerdict = {
    allowed: boolean;
    /** Seconds until the window resets (only meaningful when blocked). */
    retryAfterSeconds: number;
};

/**
 * Checks the auth-surface limit for this request's IP. Never throws.
 */
export async function checkAuthRateLimit(request: NextRequest): Promise<RateLimitVerdict> {
    if (!authLimiter) return { allowed: true, retryAfterSeconds: 0 };
    try {
        const { success, reset } = await authLimiter.limit(clientIp(request));
        return {
            allowed: success,
            retryAfterSeconds: success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
        };
    } catch (err) {
        // Fail open: an Upstash outage must not lock the school out.
        console.error("[rate-limit] check failed, allowing request:", err);
        return { allowed: true, retryAfterSeconds: 0 };
    }
}
