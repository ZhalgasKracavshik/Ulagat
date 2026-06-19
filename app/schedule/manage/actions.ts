"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeClassLetter } from "@/lib/schedule/class-letter";

export type UpsertScheduleCellInput = {
    grade: number;
    class_letter: string;
    day_of_week: number; // 1-6
    period: number; // 1-8
    subject: string;
    teacher_name: string;
    room: string;
    valid_from: string; // yyyy-MM-dd
    valid_until: string; // yyyy-MM-dd
};

export type ScheduleActionResult = {
    success: boolean;
    error?: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function requireStaff(): Promise<
    | { ok: true; userId: string }
    | { ok: false; error: string }
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not authenticated." };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
        return { ok: false, error: "Unauthorized: only moderators and admins can edit the timetable." };
    }
    return { ok: true, userId: user.id };
}

/**
 * Creates or updates one timetable cell, keyed on
 * (grade, class_letter, day_of_week, period, valid_from).
 * Moderator/admin only — verified server-side.
 */
export async function upsertScheduleCell(input: UpsertScheduleCellInput): Promise<ScheduleActionResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    // ---- Validation ----
    if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 11) {
        return { success: false, error: "Grade must be between 1 and 11." };
    }
    const classLetter = normalizeClassLetter(input.class_letter);
    if (!classLetter || classLetter.length > 3) {
        return { success: false, error: "Class letter is required (max 3 characters)." };
    }
    if (!Number.isInteger(input.day_of_week) || input.day_of_week < 1 || input.day_of_week > 6) {
        return { success: false, error: "Day of week must be between 1 (Mon) and 6 (Sat)." };
    }
    if (!Number.isInteger(input.period) || input.period < 1 || input.period > 8) {
        return { success: false, error: "Period must be between 1 and 8." };
    }
    const subject = input.subject?.trim();
    if (!subject) {
        return { success: false, error: "Subject is required." };
    }
    if (!ISO_DATE.test(input.valid_from) || !ISO_DATE.test(input.valid_until)) {
        return { success: false, error: "Valid from/until must be dates (yyyy-mm-dd)." };
    }
    if (input.valid_from > input.valid_until) {
        return { success: false, error: "'Valid from' must be before 'valid until'." };
    }

    const supabase = await createClient();

    // Guard against overlapping validity windows: a second row for the same slot
    // with a different valid_from but an overlapping date range would silently
    // shadow this one in week views. Make the moderator resolve it explicitly.
    const { data: overlapping, error: overlapError } = await supabase
        .from('schedule')
        .select('id, valid_from, valid_until')
        .eq('grade', input.grade)
        .eq('class_letter', classLetter)
        .eq('day_of_week', input.day_of_week)
        .eq('period', input.period)
        .neq('valid_from', input.valid_from)
        .lte('valid_from', input.valid_until) // existing starts before new ends
        .gte('valid_until', input.valid_from); // existing ends after new starts

    if (overlapError) {
        console.error("upsertScheduleCell overlap check error:", overlapError);
        return { success: false, error: "Failed to validate the lesson dates. Please try again." };
    }
    if (overlapping && overlapping.length > 0) {
        return {
            success: false,
            error: `This slot already has a version valid ${overlapping[0].valid_from} — ${overlapping[0].valid_until}. Delete it first or adjust its dates.`,
        };
    }

    const { error } = await supabase
        .from('schedule')
        .upsert(
            {
                grade: input.grade,
                class_letter: classLetter,
                day_of_week: input.day_of_week,
                period: input.period,
                subject,
                teacher_name: input.teacher_name?.trim() || null,
                room: input.room?.trim() || '',
                valid_from: input.valid_from,
                valid_until: input.valid_until,
                created_by: auth.userId,
            },
            { onConflict: 'grade,class_letter,day_of_week,period,valid_from' }
        );

    if (error) {
        console.error("upsertScheduleCell error:", error);
        return { success: false, error: "Failed to save the lesson." };
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/manage');
    return { success: true };
}

/** Deletes one timetable cell by id. Moderator/admin only — verified server-side. */
export async function deleteScheduleCell(id: string): Promise<ScheduleActionResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!id || typeof id !== 'string') {
        return { success: false, error: "Lesson id is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('schedule').delete().eq('id', id);

    if (error) {
        console.error("deleteScheduleCell error:", error);
        return { success: false, error: "Failed to delete the lesson." };
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/manage');
    return { success: true };
}
