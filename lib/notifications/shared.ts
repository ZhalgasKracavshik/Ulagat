import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NotifyResult = {
    /** Number of emails handed to Resend. */
    sent: number;
    /** True when RESEND_API_KEY is not configured and sending was skipped. */
    skipped: boolean;
    /** True when recipient lookup or email delivery (partially) failed — distinct from "no recipients". */
    failed: boolean;
};

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function chunked<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

/**
 * Resolves email addresses for a set of profile ids via the auth admin API
 * (profiles don't store emails). Pages through `listUsers` (1000 users per
 * call, ~10x cheaper than per-id `getUserById` lookups) and collects the
 * users whose id is in the recipient set — 1-2 API calls for a whole school
 * instead of thousands. Stops early once every recipient is found.
 */
export async function resolveEmails(
    admin: SupabaseClient,
    recipientIds: Iterable<string>,
    logPrefix: string
): Promise<{ emails: string[]; failed: boolean }> {
    const wanted = new Set(recipientIds);
    if (wanted.size === 0) return { emails: [], failed: false };

    const emails = new Set<string>();
    const found = new Set<string>();
    let failed = false;

    const PER_PAGE = 1000;
    const MAX_PAGES = 10; // safety cap: 10k users is far beyond one school

    for (let page = 1; page <= MAX_PAGES; page++) {
        let users;
        try {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
            if (error) {
                console.error(`${logPrefix} listUsers error on page ${page}:`, error);
                failed = true;
                break;
            }
            users = data.users;
        } catch (error) {
            console.error(`${logPrefix} listUsers threw on page ${page}:`, error);
            failed = true;
            break;
        }

        for (const user of users) {
            if (wanted.has(user.id)) {
                found.add(user.id);
                if (user.email) emails.add(user.email);
            }
        }

        if (found.size === wanted.size) break; // all recipients resolved — stop early
        if (users.length < PER_PAGE) break; // last page
    }

    if (!failed && found.size < wanted.size) {
        const missing = Array.from(wanted).filter((id) => !found.has(id));
        console.error(`${logPrefix} failed to resolve ${missing.length} recipient(s):`, missing);
        failed = true;
    }

    return { emails: Array.from(emails), failed };
}

/**
 * Sends one email per recipient (KZ privacy law: addresses must never be
 * exposed to each other) via Resend's batch API in chunks of 100.
 * Gracefully no-ops (console.warn) when RESEND_API_KEY is not configured,
 * so local development works without an email provider.
 */
export async function sendBatchEmails(
    emails: string[],
    subject: string,
    html: string,
    logPrefix: string
): Promise<NotifyResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn(
            `${logPrefix} RESEND_API_KEY not set — skipping email send. ` +
            `Would have notified ${emails.length} recipient(s): "${subject}"`
        );
        return { sent: 0, skipped: true, failed: false };
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    let sent = 0;
    let failed = false;
    // Resend batch API accepts up to 100 emails per call.
    // One email object per recipient — never multiple addresses in one `to`.
    for (const batch of chunked(emails, 100)) {
        const { error } = await resend.batch.send(
            batch.map((to) => ({ from, to: [to], subject, html }))
        );
        if (error) {
            console.error(`${logPrefix} Resend batch error:`, error);
            failed = true;
        } else {
            sent += batch.length;
        }
    }

    console.log(`${logPrefix} sent ${sent}/${emails.length} emails for "${subject}"`);
    return { sent, skipped: false, failed };
}
