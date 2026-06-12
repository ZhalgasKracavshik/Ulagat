import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { almatyTodayIso, addDaysIso } from '@/lib/schedule/almaty-time';
import { notifyEventReminder, type ReminderEvent } from '@/lib/notifications/event-reminder';

export const dynamic = 'force-dynamic';

/**
 * Daily cron (see vercel.json — 05:00 UTC = 10:00 Almaty): finds active
 * events happening TOMORROW (Almaty date) that have not been reminded yet,
 * and emails every registered participant. `reminded_at` is set per event to
 * prevent double-sending if the cron ever runs twice.
 *
 * Protected by CRON_SECRET (Authorization: Bearer <secret>) — Vercel Cron
 * sends this header automatically when the env var is configured.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[event-reminders] CRON_SECRET is not configured');
        return NextResponse.json({ error: 'Cron not configured' }, { status: 500 });
    }
    if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Tomorrow in Almaty wall-clock time → UTC window [00:00, 24:00) +05:00.
    const tomorrowIso = addDaysIso(almatyTodayIso(), 1);
    const windowStart = new Date(`${tomorrowIso}T00:00:00+05:00`).toISOString();
    const windowEnd = new Date(`${addDaysIso(tomorrowIso, 1)}T00:00:00+05:00`).toISOString();

    const { data: events, error } = await admin
        .from('events')
        .select('id, title, event_date, location')
        .eq('status', 'active')
        .is('reminded_at', null)
        .gte('event_date', windowStart)
        .lt('event_date', windowEnd);

    if (error) {
        console.error('[event-reminders] failed to load events:', error);
        return NextResponse.json({ error: 'Failed to load events' }, { status: 500 });
    }

    const results: { id: string; title: string; sent: number; failed: boolean }[] = [];

    for (const event of (events ?? []) as ReminderEvent[]) {
        const result = await notifyEventReminder(admin, event);

        // Mark the event as reminded even on partial failure — a retry the
        // next day would be too late anyway, and re-running the same day
        // must not double-email the recipients that did get the reminder.
        const { error: markError } = await admin
            .from('events')
            .update({ reminded_at: new Date().toISOString() })
            .eq('id', event.id);
        if (markError) {
            console.error('[event-reminders] failed to set reminded_at:', event.id, markError);
        }

        results.push({ id: event.id, title: event.title, sent: result.sent, failed: result.failed });
    }

    console.log(`[event-reminders] processed ${results.length} event(s) for ${tomorrowIso}`);
    return NextResponse.json({ date: tomorrowIso, events: results });
}
