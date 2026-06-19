"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifySubstitution } from "@/lib/notifications/substitution";
import { normalizeClassLetter } from "@/lib/schedule/class-letter";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import type { SubstitutionType } from "@/types";

export type CreateSubstitutionInput = {
    date: string; // yyyy-MM-dd
    grade: number;
    class_letter: string;
    period: number;
    type: SubstitutionType;
    subject: string;
    substitute_teacher_name: string;
    room: string;
    note: string;
};

export type CreateSubstitutionResult = {
    success: boolean;
    error?: string;
    emailsSent?: number;
    emailsSkipped?: boolean;
    /** True when the substitution was saved but email notification (partially) failed. */
    emailsFailed?: boolean;
};

export type DeleteSubstitutionResult = { error: string } | { success: true };

/** Defensive trim: returns '' for anything that is not a string. */
function safeTrim(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SUB_TYPES: SubstitutionType[] = ['substitution', 'cancellation', 'room_change'];

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
        return { ok: false, error: "Unauthorized: only moderators and admins can manage substitutions." };
    }
    return { ok: true, userId: user.id };
}

/** ISO day of week 1 (Mon) … 7 (Sun) for a yyyy-MM-dd string. */
function isoDayOfWeek(date: string): number {
    const day = new Date(date + 'T00:00:00').getDay(); // 0 = Sunday
    return day === 0 ? 7 : day;
}

/**
 * Creates a substitution, emails every affected student + their parents,
 * and stamps notified_at. Moderator/admin only — verified server-side.
 */
export async function createSubstitution(input: CreateSubstitutionInput): Promise<CreateSubstitutionResult> {
    const auth = await requireStaff();
    if (!auth.ok) return { success: false, error: auth.error };

    // ---- Validation (defensive: malformed input returns an error, never throws) ----
    if (typeof input.date !== 'string' || !ISO_DATE.test(input.date)) {
        return { success: false, error: "Date is required (yyyy-mm-dd)." };
    }
    // Reject past dates (Almaty wall-clock) — emailing about a lesson that has
    // already happened is almost always a typo (e.g. wrong year/month).
    if (input.date < almatyTodayIso()) {
        return { success: false, error: "The date is in the past. Pick today or a future date." };
    }
    if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 11) {
        return { success: false, error: "Grade must be between 1 and 11." };
    }
    const classLetter = normalizeClassLetter(input.class_letter);
    if (!classLetter || classLetter.length > 3) {
        return { success: false, error: "Class letter is required (max 3 characters)." };
    }
    if (!Number.isInteger(input.period) || input.period < 1 || input.period > 8) {
        return { success: false, error: "Period must be between 1 and 8." };
    }
    if (!SUB_TYPES.includes(input.type)) {
        return { success: false, error: "Invalid substitution type." };
    }
    if (isoDayOfWeek(input.date) === 7) {
        return { success: false, error: "Sunday is not a school day." };
    }
    const subject = safeTrim(input.subject);
    const substituteTeacherName = safeTrim(input.substitute_teacher_name);
    const room = safeTrim(input.room);
    const note = safeTrim(input.note);
    if (input.type === 'room_change' && !room) {
        return { success: false, error: "New room is required for a room change." };
    }
    if (input.type === 'substitution' && !subject && !substituteTeacherName) {
        return { success: false, error: "Enter the new subject and/or teacher for the substitution." };
    }

    const supabase = await createClient();

    // ---- Insert the substitution ----
    const { data: inserted, error: insertError } = await supabase
        .from('substitutions')
        .insert({
            date: input.date,
            grade: input.grade,
            class_letter: classLetter,
            period: input.period,
            type: input.type,
            subject: subject || null,
            substitute_teacher_name: substituteTeacherName || null,
            room: room || null,
            note: note || null,
            created_by: auth.userId,
        })
        .select('id')
        .single();

    if (insertError || !inserted) {
        if (insertError?.code === '23505') {
            return {
                success: false,
                error: "A substitution already exists for this class, date and period. Delete it first to change it.",
            };
        }
        console.error("createSubstitution insert error:", insertError);
        return { success: false, error: "Failed to save the substitution." };
    }

    // ---- Notify students + parents, stamp notified_at ----
    let emailsSent = 0;
    let emailsSkipped = false;
    let emailsFailed = false;
    try {
        const result = await notifySubstitution(inserted.id as string);
        emailsSent = result.sent;
        emailsSkipped = result.skipped;
        emailsFailed = result.failed;

        if (result.sent > 0) {
            await supabase
                .from('substitutions')
                .update({ notified_at: new Date().toISOString() })
                .eq('id', inserted.id as string);
        }
    } catch (error) {
        // Substitution is saved even if email delivery fails — the schedule page still shows it.
        console.error("createSubstitution notification error:", error);
        emailsFailed = true;
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/substitutions');
    return { success: true, emailsSent, emailsSkipped, emailsFailed };
}

/** Deletes a substitution (e.g. entered by mistake). Moderator/admin only. */
export async function deleteSubstitution(id: string): Promise<DeleteSubstitutionResult> {
    const auth = await requireStaff();
    if (!auth.ok) {
        return { error: auth.error };
    }

    if (typeof id !== 'string' || !id.trim()) {
        return { error: "Substitution id is required." };
    }

    const supabase = await createClient();
    const { error } = await supabase.from('substitutions').delete().eq('id', id);
    if (error) {
        console.error("deleteSubstitution error:", error);
        return { error: "Failed to delete the substitution." };
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/substitutions');
    return { success: true };
}
