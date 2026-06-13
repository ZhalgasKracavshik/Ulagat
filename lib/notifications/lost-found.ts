import { createAdminClient } from '@/lib/supabase/admin';
import {
    escapeHtml,
    resolveEmails,
    sendBatchEmails,
    type NotifyResult,
} from '@/lib/notifications/shared';
import type { LostItem } from '@/types';

function buildEmailHtml(item: LostItem): string {
    const titleHtml = escapeHtml(item.title);
    const locationHtml = item.location ? escapeHtml(item.location) : null;

    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin-bottom:4px;">
            Бюро находок · Ulagat
        </p>
        <h2 style="color:#1e3a8a; margin-top:0;">Найдена вещь по вашему запросу</h2>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            Вещь, на которую вы оставили заявку — <strong>${titleHtml}</strong> — отмечена как найденная.
            ${locationHtml ? `Место: ${locationHtml}.` : ''}
        </p>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            Модератор свяжется с вами для подтверждения и передачи. Пожалуйста, подойдите в бюро находок школы.
        </p>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
            Это автоматическое уведомление школы BINOM, отправленное через платформу Ulagat.
        </p>
    </div>`;
}

/**
 * Notifies every user who registered a claim on an item (via the
 * "This is mine!" button) that the item has been marked as found. One
 * email per recipient (KZ privacy law — addresses are never exposed to
 * each other). Gracefully no-ops when RESEND_API_KEY is not configured.
 */
export async function notifyItemFound(itemId: string): Promise<NotifyResult> {
    const admin = createAdminClient();

    // 1. Load the item.
    const { data: row, error: loadError } = await admin
        .from('lost_items')
        .select('*')
        .eq('id', itemId)
        .single();

    if (loadError || !row) {
        console.error('[notify-lost-found] item not found:', itemId, loadError);
        return { sent: 0, skipped: false, failed: true };
    }
    const item = row as LostItem;

    // 2. Every claimant for this item.
    const { data: claims, error: claimsError } = await admin
        .from('lost_item_claims')
        .select('claimant_id')
        .eq('item_id', itemId);

    if (claimsError) {
        console.error('[notify-lost-found] failed to load claims:', claimsError);
        return { sent: 0, skipped: false, failed: true };
    }

    const recipientIds = new Set((claims ?? []).map((c) => c.claimant_id as string));
    if (recipientIds.size === 0) {
        console.log(`[notify-lost-found] no claimants for item "${item.title}"`);
        return { sent: 0, skipped: false, failed: false };
    }

    // 3. Resolve emails via the auth admin API (profiles don't store emails).
    const resolved = await resolveEmails(admin, recipientIds, '[notify-lost-found]');
    if (resolved.emails.length === 0) {
        console.log('[notify-lost-found] claimants found but none has an email address');
        return { sent: 0, skipped: false, failed: resolved.failed };
    }

    const subject = `Найдена вещь по вашему запросу — ${item.title}`;
    const html = buildEmailHtml(item);

    const sendResult = await sendBatchEmails(resolved.emails, subject, html, '[notify-lost-found]');
    return { ...sendResult, failed: resolved.failed || sendResult.failed };
}
