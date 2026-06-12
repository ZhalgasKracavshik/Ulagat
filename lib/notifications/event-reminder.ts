import type { SupabaseClient } from '@supabase/supabase-js';
import {
    escapeHtml,
    resolveEmails,
    sendBatchEmails,
    type NotifyResult,
} from '@/lib/notifications/shared';

export type ReminderEvent = {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
};

function buildReminderHtml(event: ReminderEvent): string {
    const whenRu = new Date(event.event_date).toLocaleString('ru-RU', {
        timeZone: 'Asia/Almaty',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin-bottom:4px;">
            Напоминание о мероприятии
        </p>
        <h2 style="color:#1e3a8a; margin-top:0;">${escapeHtml(event.title)}</h2>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            Напоминаем: завтра состоится мероприятие, на которое вы зарегистрированы.
        </p>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            <strong>Когда:</strong> ${escapeHtml(whenRu)} (время Астаны)<br />
            <strong>Где:</strong> ${escapeHtml(event.location || 'Школа BINOM')}
        </p>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
            Это автоматическое напоминание платформы Ulagat (школа BINOM).
        </p>
    </div>`;
}

/**
 * Emails every registered participant of `event` a Russian reminder that the
 * event takes place tomorrow. One email per recipient (KZ privacy law) via
 * the shared Resend batch helper. `admin` must be a service-role client —
 * the cron job has no user session.
 */
export async function notifyEventReminder(
    admin: SupabaseClient,
    event: ReminderEvent
): Promise<NotifyResult> {
    const { data: regs, error: regsError } = await admin
        .from('event_registrations')
        .select('user_id')
        .eq('event_id', event.id);

    if (regsError) {
        console.error('[event-reminder] failed to load registrations:', event.id, regsError);
        return { sent: 0, skipped: false, failed: true };
    }

    const recipientIds = new Set((regs ?? []).map((r) => r.user_id as string));
    if (recipientIds.size === 0) {
        console.log(`[event-reminder] no registrations for "${event.title}" — nothing to send`);
        return { sent: 0, skipped: false, failed: false };
    }

    const resolved = await resolveEmails(admin, recipientIds, '[event-reminder]');
    if (resolved.emails.length === 0) {
        console.log(`[event-reminder] no resolvable emails for "${event.title}"`);
        return { sent: 0, skipped: false, failed: resolved.failed };
    }

    const subject = `Напоминание: завтра ${event.title}`;
    const html = buildReminderHtml(event);

    const sendResult = await sendBatchEmails(resolved.emails, subject, html, '[event-reminder]');
    return { ...sendResult, failed: resolved.failed || sendResult.failed };
}
