"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { notifySubstitution } from "@/lib/notifications/substitution";
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
};

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

    // ---- Validation ----
    if (!ISO_DATE.test(input.date)) {
        return { success: false, error: "Date is required (yyyy-mm-dd)." };
    }
    if (!Number.isInteger(input.grade) || input.grade < 1 || input.grade > 11) {
        return { success: false, error: "Grade must be between 1 and 11." };
    }
    const classLetter = input.class_letter?.trim();
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
    if (input.type === 'room_change' && !input.room.trim()) {
        return { success: false, error: "New room is required for a room change." };
    }
    if (input.type === 'substitution' && !input.subject.trim() && !input.substitute_teacher_name.trim()) {
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
            subject: input.subject.trim() || null,
            substitute_teacher_name: input.substitute_teacher_name.trim() || null,
            room: input.room.trim() || null,
            note: input.note.trim() || null,
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
    try {
        const result = await notifySubstitution(inserted.id as string);
        emailsSent = result.sent;
        emailsSkipped = result.skipped;

        if (result.sent > 0) {
            await supabase
                .from('substitutions')
                .update({ notified_at: new Date().toISOString() })
                .eq('id', inserted.id as string);
        }
    } catch (error) {
        // Substitution is saved even if email delivery fails — the schedule page still shows it.
        console.error("createSubstitution notification error:", error);
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/substitutions');
    return { success: true, emailsSent, emailsSkipped };
}

/** Deletes a substitution (e.g. entered by mistake). Moderator/admin only. */
export async function deleteSubstitution(formData: FormData): Promise<void> {
    const auth = await requireStaff();
    if (!auth.ok) {
        throw new Error(auth.error);
    }

    const id = formData.get('id');
    if (typeof id !== 'string' || !id) {
        throw new Error("Substitution id is required.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from('substitutions').delete().eq('id', id);
    if (error) {
        console.error("deleteSubstitution error:", error);
        throw new Error("Failed to delete the substitution.");
    }

    revalidatePath('/schedule');
    revalidatePath('/schedule/substitutions');
}
