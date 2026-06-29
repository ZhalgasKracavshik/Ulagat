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

export type BulkScheduleRow = {
    grade: number;
    class_letter: string;
    day_of_week: number;
    period: number;
    subject: string;
    teacher_name: string;
    room: string;
};

export type BulkScheduleResult = {
    success: boolean;
    inserted?: number;
    error?: string;
    /** 1-based row numbers (as pasted) that failed validation, with a reason. */
    rowErrors?: { row: number; reason: string }[];
};

type ScheduleInsertRow = {
    grade: number;
    class_letter: string;
    day_of_week: number;
    period: number;
    subject: string;
    teacher_name: string | null;
    room: string;
    valid_from: string;
    valid_until: string;
    created_by: string;
};

/**
 * Bulk creates/updates timetable cells from a pasted block, all sharing one
 * validity window (a term). All-or-nothing: if any row fails validation nothing
 * is written, so a paste error never half-fills the timetable. Moderator/admin
 * only. Same conflict key as the single-cell editor, so re-importing updates.
 */
export async function bulkUpsertSchedule(
    rows: BulkScheduleRow[],
    valid_from: string,
    valid_until: string
): Promise<BulkScheduleResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!ISO_DATE.test(valid_from) || !ISO_DATE.test(valid_until)) {
        return { success: false, error: "Term dates must be valid (yyyy-mm-dd)." };
    }
    if (valid_from > valid_until) {
        return { success: false, error: "'Valid from' must be on or before 'valid until'." };
    }
    if (!Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: "Nothing to import." };
    }
    if (rows.length > 2000) {
        return { success: false, error: "Too many rows at once (max 2000)." };
    }

    const rowErrors: { row: number; reason: string }[] = [];
    const seen = new Set<string>();
    const clean: ScheduleInsertRow[] = [];

    rows.forEach((r, i) => {
        const n = i + 1;
        if (!Number.isInteger(r.grade) || r.grade < 1 || r.grade > 11) {
            rowErrors.push({ row: n, reason: "grade must be 1-11" });
            return;
        }
        const classLetter = normalizeClassLetter(r.class_letter);
        if (!classLetter) {
            rowErrors.push({ row: n, reason: "class letter is required" });
            return;
        }
        if (!Number.isInteger(r.day_of_week) || r.day_of_week < 1 || r.day_of_week > 6) {
            rowErrors.push({ row: n, reason: "day must be 1-6" });
            return;
        }
        if (!Number.isInteger(r.period) || r.period < 1 || r.period > 8) {
            rowErrors.push({ row: n, reason: "period must be 1-8" });
            return;
        }
        const subject = (r.subject ?? '').trim();
        if (!subject) {
            rowErrors.push({ row: n, reason: "subject is required" });
            return;
        }
        const key = `${r.grade}|${classLetter}|${r.day_of_week}|${r.period}`;
        if (seen.has(key)) {
            rowErrors.push({ row: n, reason: "duplicate slot in this paste" });
            return;
        }
        seen.add(key);
        clean.push({
            grade: r.grade,
            class_letter: classLetter,
            day_of_week: r.day_of_week,
            period: r.period,
            subject,
            teacher_name: (r.teacher_name ?? '').trim() || null,
            room: (r.room ?? '').trim() || '',
            valid_from,
            valid_until,
            created_by: auth.userId,
        });
    });

    if (rowErrors.length > 0) {
        return {
            success: false,
            error: "Some rows could not be read. Fix them and import again.",
            rowErrors,
        };
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from('schedule')
        .upsert(clean, { onConflict: 'grade,class_letter,day_of_week,period,valid_from' });

    if (error) {
        console.error("bulkUpsertSchedule error:", error);
        return { success: false, error: "Failed to import the timetable." };
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/manage');
    return { success: true, inserted: clean.length };
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
