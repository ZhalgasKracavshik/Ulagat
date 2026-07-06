import { createAdminClient } from '@/lib/supabase/admin';
import {
    escapeHtml,
    resolveEmails,
    sendBatchEmails,
    type NotifyResult,
} from '@/lib/notifications/shared';
import { sendPushToUsers } from '@/lib/push/send';
import type { Certificate, CertificateType } from '@/types';

const TYPE_LABEL: Record<CertificateType, string> = {
    enrollment: 'с места учёбы',
    grades: 'об успеваемости',
    attendance: 'о посещаемости',
    character: 'характеристика',
};

function buildReadyHtml(cert: Certificate): string {
    const typeLabel = escapeHtml(TYPE_LABEL[cert.type] ?? cert.type);
    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin-bottom:4px;">
            Справки · Ulagat
        </p>
        <h2 style="color:#1e3a8a; margin-top:0;">Ваша справка готова</h2>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            Запрошенная вами справка (${typeLabel}) подготовлена и подписана администрацией школы.
            Скачать PDF можно в разделе «Справки» на платформе Ulagat.
        </p>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
            Это автоматическое уведомление школы BINOM, отправленное через платформу Ulagat.
        </p>
    </div>`;
}

function buildRejectedHtml(cert: Certificate): string {
    const typeLabel = escapeHtml(TYPE_LABEL[cert.type] ?? cert.type);
    const reasonHtml = cert.rejection_reason ? escapeHtml(cert.rejection_reason) : null;
    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin-bottom:4px;">
            Справки · Ulagat
        </p>
        <h2 style="color:#9f1239; margin-top:0;">Запрос справки отклонён</h2>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            К сожалению, ваш запрос справки (${typeLabel}) отклонён администрацией.
            ${reasonHtml ? `Причина: <strong>${reasonHtml}</strong>.` : ''}
        </p>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">
            Вы можете подать новый запрос, уточнив данные, или обратиться в администрацию школы.
        </p>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
            Это автоматическое уведомление школы BINOM, отправленное через платформу Ulagat.
        </p>
    </div>`;
}

/**
 * Notifies the certificate requester that their request was processed
 * (status 'ready' or 'rejected'). One recipient only — the requester.
 * Gracefully no-ops when RESEND_API_KEY is not configured.
 */
export async function notifyCertificateProcessed(certificateId: string): Promise<NotifyResult> {
    const admin = createAdminClient();

    const { data: row, error: loadError } = await admin
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

    if (loadError || !row) {
        console.error('[notify-certificate] certificate not found:', certificateId, loadError);
        return { sent: 0, skipped: false, failed: true };
    }
    const cert = row as Certificate;

    if (cert.status !== 'ready' && cert.status !== 'rejected') {
        console.log('[notify-certificate] status not final, skipping:', cert.status);
        return { sent: 0, skipped: false, failed: false };
    }

    // Web push to the requester — independent of email, never throws.
    const typeLabel = TYPE_LABEL[cert.type] ?? cert.type;
    await sendPushToUsers([cert.user_id], {
        title: cert.status === 'ready' ? 'Справка готова' : 'Запрос справки отклонён',
        body:
            cert.status === 'ready'
                ? `Справка (${typeLabel}) готова — скачайте в разделе «Справки».`
                : `Запрос справки (${typeLabel}) отклонён.`,
        url: '/certificates',
    });

    const resolved = await resolveEmails(admin, new Set([cert.user_id]), '[notify-certificate]');
    if (resolved.emails.length === 0) {
        console.log('[notify-certificate] requester has no email address');
        return { sent: 0, skipped: false, failed: resolved.failed };
    }

    const subject =
        cert.status === 'ready'
            ? 'Ваша справка готова — Ulagat'
            : 'Запрос справки отклонён — Ulagat';
    const html = cert.status === 'ready' ? buildReadyHtml(cert) : buildRejectedHtml(cert);

    const sendResult = await sendBatchEmails(resolved.emails, subject, html, '[notify-certificate]');
    return { ...sendResult, failed: resolved.failed || sendResult.failed };
}
