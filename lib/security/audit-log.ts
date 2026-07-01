import { createHash } from "crypto";

/**
 * Structured security event logging for SIEM/WAF ingestion.
 *
 * Emits one-line JSON to stdout (Vercel collects it via Log Drains). Never log
 * PII, secrets, tokens, passwords, full emails or message bodies — only stable
 * ids and salted hashes, so the stream is safe to forward off-platform.
 */

export type SecurityEventType =
    | "auth_login_failed"
    | "auth_rate_limited"
    | "role_change"
    | "email_change_attempt"
    | "privilege_denied"
    | "invite_redeem_failed"
    | "suspicious_input"
    | "admin_action";

export type SecurityOutcome = "success" | "denied" | "flagged" | "error";

export interface SecurityEvent {
    event: SecurityEventType;
    outcome: SecurityOutcome;
    /** Acting user id (never email). Omit for anonymous. */
    actorId?: string;
    actorRole?: string;
    /** Target entity/user id for actions on others (role change, etc.). */
    targetId?: string;
    reason?: string;
    ip?: string;
    /** Raw user-agent — hashed before logging, never stored verbatim. */
    userAgent?: string;
    requestId?: string;
    /** Extra low-cardinality, non-PII fields only. */
    meta?: Record<string, string | number | boolean>;
}

/** One-way hash so a value is correlatable across events but not reversible. */
function shortHash(value: string): string {
    const salt = process.env.LOG_HASH_SALT ?? "ulagat";
    return createHash("sha256").update(salt).update(value).digest("hex").slice(0, 16);
}

/**
 * Emit a security event. Call from server actions / route handlers only.
 * Fire-and-forget; never throws (logging must not break the request path).
 */
export function logSecurityEvent(e: SecurityEvent): void {
    try {
        const record = {
            ts: new Date().toISOString(),
            level: e.outcome === "denied" || e.outcome === "flagged" ? "warn" : "info",
            type: "security",
            event: e.event,
            outcome: e.outcome,
            actor_id: e.actorId,
            actor_role: e.actorRole,
            target_id: e.targetId,
            reason: e.reason,
            ip: e.ip,
            ua_hash: e.userAgent ? shortHash(e.userAgent) : undefined,
            request_id: e.requestId,
            ...e.meta,
        };
        // One compact JSON line per event — SIEM/WAF friendly.
        console.log(JSON.stringify(record));
    } catch {
        // Never let logging failure affect the request.
    }
}
