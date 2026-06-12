import { createAdminClient } from '@/lib/supabase/admin';
import { getPeriodTime } from '@/lib/schedule/bells';
import { escapeHtml, resolveEmails, sendBatchEmails, type NotifyResult } from '@/lib/notifications/shared';
import type { ScheduleEntry, Substitution } from '@/types';

const TYPE_LABELS: Record<Substitution['type'], string> = {
    substitution: 'Замена урока',
    cancellation: 'Отмена урока',
    room_change: 'Смена кабинета',
};

export type { NotifyResult };

function formatDateRu(isoDate: string): string {
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
    ];
    const d = new Date(isoDate + 'T00:00:00');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function buildEmailHtml(substitution: Substitution, lesson: ScheduleEntry | null): string {
    const time = getPeriodTime(substitution.period);
    const timeRange = time ? ` (${time.start}–${time.end})` : '';
    const className = `${substitution.grade}${substitution.class_letter}`;

    const rows: string[] = [];
    rows.push(`<tr><td><strong>Дата</strong></td><td>${formatDateRu(substitution.date)}</td></tr>`);
    rows.push(`<tr><td><strong>Класс</strong></td><td>${escapeHtml(className)}</td></tr>`);
    rows.push(`<tr><td><strong>Урок</strong></td><td>${substitution.period} урок${timeRange}</td></tr>`);

    if (lesson) {
        const teacher = lesson.teacher_name ? `, ${escapeHtml(lesson.teacher_name)}` : '';
        const room = lesson.room ? `, каб. ${escapeHtml(lesson.room)}` : '';
        rows.push(`<tr><td><strong>По расписанию</strong></td><td>${escapeHtml(lesson.subject)}${teacher}${room}</td></tr>`);
    }

    if (substitution.type === 'cancellation') {
        rows.push(`<tr><td><strong>Изменение</strong></td><td style="color:#dc2626;"><strong>Урок отменён</strong></td></tr>`);
    } else {
        if (substitution.subject) {
            rows.push(`<tr><td><strong>Новый предмет</strong></td><td>${escapeHtml(substitution.subject)}</td></tr>`);
        }
        if (substitution.substitute_teacher_name) {
            rows.push(`<tr><td><strong>Новый учитель</strong></td><td>${escapeHtml(substitution.substitute_teacher_name)}</td></tr>`);
        }
        if (substitution.room) {
            rows.push(`<tr><td><strong>Новый кабинет</strong></td><td>${escapeHtml(substitution.room)}</td></tr>`);
        }
    }

    if (substitution.note) {
        rows.push(`<tr><td><strong>Комментарий</strong></td><td>${escapeHtml(substitution.note)}</td></tr>`);
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color:#1e3a8a;">${TYPE_LABELS[substitution.type]}</h2>
        <table cellpadding="6" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:14px;">
            ${rows.join('\n')}
        </table>
        <p style="color:#64748b; font-size:12px; margin-top:24px;">
            Это автоматическое уведомление платформы Ulagat (школа BINOM).
        </p>
    </div>`;
}

/**
 * Sends an email about a substitution to every affected student of the class
 * and their linked parents. Gracefully no-ops (console.warn) when RESEND_API_KEY
 * is not configured, so local development works without an email provider.
 */
export async function notifySubstitution(substitutionId: string): Promise<NotifyResult> {
    const admin = createAdminClient();

    // 1. Load the substitution
    const { data: subRow, error: subError } = await admin
        .from('substitutions')
        .select('*')
        .eq('id', substitutionId)
        .single();

    if (subError || !subRow) {
        console.error('[notify-substitution] substitution not found:', substitutionId, subError);
        return { sent: 0, skipped: false, failed: true };
    }
    const substitution = subRow as Substitution;

    // 2. The originally scheduled lesson (for context in the email)
    const jsDay = new Date(substitution.date + 'T00:00:00').getDay(); // 0 = Sunday
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;
    const { data: lessonRow } = await admin
        .from('schedule')
        .select('*')
        .eq('grade', substitution.grade)
        .eq('class_letter', substitution.class_letter)
        .eq('day_of_week', dayOfWeek)
        .eq('period', substitution.period)
        .lte('valid_from', substitution.date)
        .gte('valid_until', substitution.date)
        .limit(1)
        .maybeSingle();
    const lesson = (lessonRow as ScheduleEntry | null) ?? null;

    // 3. All students of the affected class
    const { data: students, error: studentsError } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('grade', substitution.grade)
        .eq('class_letter', substitution.class_letter);

    if (studentsError) {
        console.error('[notify-substitution] failed to load students:', studentsError);
        return { sent: 0, skipped: false, failed: true };
    }

    // Tracks partial failures (recipient lookup / delivery) so callers can warn the moderator.
    let failed = false;

    const studentIds = (students ?? []).map((s) => s.id as string);

    // 4. Their parents via family_bonds
    let parentIds: string[] = [];
    if (studentIds.length > 0) {
        const { data: bonds, error: bondsError } = await admin
            .from('family_bonds')
            .select('parent_id')
            .in('student_id', studentIds);

        if (bondsError) {
            console.error('[notify-substitution] failed to load family bonds:', bondsError);
            failed = true; // parents would silently miss the notification
        } else {
            parentIds = (bonds ?? []).map((b) => b.parent_id as string);
        }
    }

    const recipientIds = new Set([...studentIds, ...parentIds]);

    if (recipientIds.size === 0) {
        console.log(
            `[notify-substitution] no recipients for ${substitution.grade}${substitution.class_letter} on ${substitution.date}`
        );
        return { sent: 0, skipped: false, failed };
    }

    // 5. Resolve emails via the auth admin API (profiles don't store emails).
    const resolved = await resolveEmails(admin, recipientIds, '[notify-substitution]');
    failed = failed || resolved.failed;

    if (resolved.emails.length === 0) {
        console.log('[notify-substitution] recipients found but none has an email address');
        return { sent: 0, skipped: false, failed };
    }

    const subject = `Изменение в расписании — ${formatDateRu(substitution.date)}`;
    const html = buildEmailHtml(substitution, lesson);

    const sendResult = await sendBatchEmails(resolved.emails, subject, html, '[notify-substitution]');
    return { ...sendResult, failed: failed || sendResult.failed };
}
