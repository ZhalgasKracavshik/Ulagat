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
 * (profiles don't store emails). Lookups run in parallel within chunks of 50
 * so large recipient sets don't hammer the auth admin API all at once.
 */
export async function resolveEmails(
    admin: SupabaseClient,
    recipientIds: Iterable<string>,
    logPrefix: string
): Promise<{ emails: string[]; failed: boolean }> {
    const ids = Array.from(new Set(recipientIds));
    const emails = new Set<string>();
    const failedIds: string[] = [];

    for (const batch of chunked(ids, 50)) {
        const lookups = await Promise.all(
            batch.map(async (id) => {
                try {
                    const { data, error } = await admin.auth.admin.getUserById(id);
                    if (error) return { id, email: null, failed: true };
                    return { id, email: data.user?.email ?? null, failed: false };
                } catch (error) {
                    console.error(`${logPrefix} getUserById threw for`, id, error);
                    return { id, email: null, failed: true };
                }
            })
        );
        for (const lookup of lookups) {
            if (lookup.failed) failedIds.push(lookup.id);
            if (lookup.email) emails.add(lookup.email);
        }
    }

    if (failedIds.length > 0) {
        console.error(`${logPrefix} failed to resolve ${failedIds.length} recipient(s):`, failedIds);
    }

    return { emails: Array.from(emails), failed: failedIds.length > 0 };
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
