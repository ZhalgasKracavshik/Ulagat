import { createAdminClient } from '@/lib/supabase/admin';
import {
    chunked,
    escapeHtml,
    resolveEmails,
    sendBatchEmails,
    type NotifyResult,
} from '@/lib/notifications/shared';
import type { Announcement, AnnouncementCategory } from '@/types';

const CATEGORY_LABELS_RU: Record<AnnouncementCategory, string> = {
    medical: 'Медосмотр',
    assembly: 'Линейка',
    important: 'Важное',
    general: 'Общее',
};

function buildEmailHtml(announcement: Announcement): string {
    const gradesLabel =
        announcement.target_grades && announcement.target_grades.length > 0
            ? `${announcement.target_grades.join(', ')} классы`
            : 'Все классы';

    // Preserve the author's line breaks in the plain-text body.
    const bodyHtml = escapeHtml(announcement.body).replace(/\r?\n/g, '<br />');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; margin-bottom:4px;">
            ${CATEGORY_LABELS_RU[announcement.category]} · ${escapeHtml(gradesLabel)}
        </p>
        <h2 style="color:#1e3a8a; margin-top:0;">${escapeHtml(announcement.title)}</h2>
        <p style="font-size:14px; color:#0f172a; line-height:1.6;">${bodyHtml}</p>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
            Это официальное объявление администрации школы BINOM, отправленное через платформу Ulagat.
        </p>
    </div>`;
}

/**
 * Sends an email about an official announcement to every targeted student
 * (all students when target_grades is NULL) and their linked parents.
 * Gracefully no-ops (console.warn) when RESEND_API_KEY is not configured,
 * so local development works without an email provider.
 */
export async function notifyAnnouncement(announcementId: string): Promise<NotifyResult> {
    const admin = createAdminClient();

    // 1. Load the announcement
    const { data: row, error: loadError } = await admin
        .from('announcements')
        .select('*')
        .eq('id', announcementId)
        .single();

    if (loadError || !row) {
        console.error('[notify-announcement] announcement not found:', announcementId, loadError);
        return { sent: 0, skipped: false, failed: true };
    }
    const announcement = row as Announcement;

    // 2. Targeted students (all students when target_grades is NULL)
    let studentsQuery = admin
        .from('profiles')
        .select('id')
        .eq('role', 'student');
    if (announcement.target_grades && announcement.target_grades.length > 0) {
        studentsQuery = studentsQuery.in('grade', announcement.target_grades);
    }
    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
        console.error('[notify-announcement] failed to load students:', studentsError);
        return { sent: 0, skipped: false, failed: true };
    }

    // Tracks partial failures (recipient lookup / delivery) so callers can warn the moderator.
    let failed = false;

    const studentIds = (students ?? []).map((s) => s.id as string);

    // 3. Their parents via family_bonds (chunked — the student list can be the whole school)
    const parentIds: string[] = [];
    for (const batch of chunked(studentIds, 200)) {
        const { data: bonds, error: bondsError } = await admin
            .from('family_bonds')
            .select('parent_id')
            .in('student_id', batch);

        if (bondsError) {
            console.error('[notify-announcement] failed to load family bonds:', bondsError);
            failed = true; // parents would silently miss the notification
        } else {
            for (const bond of bonds ?? []) {
                parentIds.push(bond.parent_id as string);
            }
        }
    }

    const recipientIds = new Set([...studentIds, ...parentIds]);

    if (recipientIds.size === 0) {
        console.log(`[notify-announcement] no recipients for announcement "${announcement.title}"`);
        return { sent: 0, skipped: false, failed };
    }

    // 4. Resolve emails via the auth admin API (profiles don't store emails).
    const resolved = await resolveEmails(admin, recipientIds, '[notify-announcement]');
    failed = failed || resolved.failed;

    if (resolved.emails.length === 0) {
        console.log('[notify-announcement] recipients found but none has an email address');
        return { sent: 0, skipped: false, failed };
    }

    const subject = `Объявление администрации — ${announcement.title}`;
    const html = buildEmailHtml(announcement);

    const sendResult = await sendBatchEmails(resolved.emails, subject, html, '[notify-announcement]');
    return { ...sendResult, failed: failed || sendResult.failed };
}
