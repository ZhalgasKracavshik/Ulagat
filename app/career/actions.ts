"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isEntProfileSubject } from "@/data/universities";
import { ENT_SCORE_KEYS, type EntScoreKey } from "@/lib/career";
import type { EntScores } from "@/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_PER_SUBJECT = 40;
const MAX_TOTAL = 140;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Authenticated user, or throws. Career data is always self-owned. */
async function requireUser(): Promise<{ supabase: ServerSupabase; userId: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: you must be signed in.");
    return { supabase, userId: user.id };
}

/**
 * Parses one subject score field from the form. Empty → undefined (left
 * blank). Otherwise must be an integer 0..40.
 */
function parseSubjectScore(raw: FormDataEntryValue | null, label: string): number | undefined {
    const value = ((raw as string) || '').trim();
    if (value === '') return undefined;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > MAX_PER_SUBJECT) {
        throw new Error(`${label} must be a whole number between 0 and ${MAX_PER_SUBJECT}.`);
    }
    return n;
}

/**
 * Upserts the caller's own career tracker row: profile subjects, the five
 * ЕНТ subject scores, target total and notes. Ownership is enforced by
 * user_id = auth.uid() (and the RLS policy / DB guard trigger).
 */
export async function upsertCareerTracker(formData: FormData) {
    const { supabase, userId } = await requireUser();

    // ---- Profile subjects (optional, must be from the allowed list) ----
    const rawSubject1 = ((formData.get('profile_subject_1') as string) || '').trim();
    const rawSubject2 = ((formData.get('profile_subject_2') as string) || '').trim();

    let profileSubject1: string | null = null;
    let profileSubject2: string | null = null;

    if (rawSubject1) {
        if (!isEntProfileSubject(rawSubject1)) throw new Error("Invalid profile subject 1.");
        profileSubject1 = rawSubject1;
    }
    if (rawSubject2) {
        if (!isEntProfileSubject(rawSubject2)) throw new Error("Invalid profile subject 2.");
        profileSubject2 = rawSubject2;
    }
    if (profileSubject1 && profileSubject2 && profileSubject1 === profileSubject2) {
        throw new Error("Your two profile subjects must be different.");
    }

    // ---- ЕНТ subject scores ----
    const labels: Record<EntScoreKey, string> = {
        math_literacy: 'Mathematics literacy',
        reading: 'Reading literacy',
        history: 'History of Kazakhstan',
        subject_1: profileSubject1 || 'Profile subject 1',
        subject_2: profileSubject2 || 'Profile subject 2',
    };

    const scores: EntScores = {};
    let total = 0;
    for (const key of ENT_SCORE_KEYS) {
        const parsed = parseSubjectScore(formData.get(`score_${key}`), labels[key]);
        if (parsed !== undefined) {
            scores[key] = parsed;
            total += parsed;
        }
    }
    if (total > MAX_TOTAL) {
        throw new Error(`Total ЕНТ score cannot exceed ${MAX_TOTAL} (you entered ${total}).`);
    }

    // ---- Target score (optional) ----
    let targetScore: number | null = null;
    const rawTarget = ((formData.get('target_score') as string) || '').trim();
    if (rawTarget !== '') {
        const n = Number(rawTarget);
        if (!Number.isInteger(n) || n < 0 || n > MAX_TOTAL) {
            throw new Error(`Target score must be a whole number between 0 and ${MAX_TOTAL}.`);
        }
        targetScore = n;
    }

    // ---- Notes (optional) ----
    const notes = ((formData.get('notes') as string) || '').trim();
    if (notes.length > 2000) throw new Error("Notes are too long (max 2000 characters).");

    const { error } = await supabase
        .from('career_tracker')
        .upsert(
            {
                user_id: userId,
                profile_subject_1: profileSubject1,
                profile_subject_2: profileSubject2,
                ent_scores: scores,
                target_score: targetScore,
                notes: notes || null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
        );

    if (error) {
        console.error("[upsertCareerTracker] upsert failed:", error);
        throw new Error("Failed to save your ЕНТ scores.");
    }

    revalidatePath('/career');
}

/**
 * Adds a target university/specialty for the caller. Ownership is forced —
 * the row is always written with user_id = auth.uid().
 */
export async function addCareerTarget(formData: FormData) {
    const { supabase, userId } = await requireUser();

    const university = ((formData.get('university') as string) || '').trim();
    const specialty = ((formData.get('specialty') as string) || '').trim();
    if (!university) throw new Error("University name is required.");
    if (university.length > 200) throw new Error("University name is too long (max 200 characters).");
    if (!specialty) throw new Error("Specialty is required.");
    if (specialty.length > 200) throw new Error("Specialty is too long (max 200 characters).");

    let cutoffScore: number | null = null;
    const rawCutoff = ((formData.get('cutoff_score') as string) || '').trim();
    if (rawCutoff !== '') {
        const n = Number(rawCutoff);
        if (!Number.isInteger(n) || n < 0 || n > MAX_TOTAL) {
            throw new Error(`Cutoff score must be a whole number between 0 and ${MAX_TOTAL}.`);
        }
        cutoffScore = n;
    }

    let grantDeadline: string | null = null;
    const rawDeadline = ((formData.get('grant_deadline') as string) || '').trim();
    if (rawDeadline !== '') {
        if (!ISO_DATE_RE.test(rawDeadline)) throw new Error("Grant deadline must be a valid date.");
        // Reject impossible dates like 2026-13-40.
        const parsed = new Date(rawDeadline + 'T00:00:00Z');
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== rawDeadline) {
            throw new Error("Grant deadline must be a valid date.");
        }
        grantDeadline = rawDeadline;
    }

    const { error } = await supabase
        .from('career_targets')
        .insert({
            user_id: userId,
            university,
            specialty,
            cutoff_score: cutoffScore,
            grant_deadline: grantDeadline,
        });

    if (error) {
        console.error("[addCareerTarget] insert failed:", error);
        throw new Error("Failed to add the target university.");
    }

    revalidatePath('/career');
}

/** Deletes one of the caller's own target universities. */
export async function deleteCareerTarget(formData: FormData) {
    const { supabase, userId } = await requireUser();

    const targetId = ((formData.get('target_id') as string) || '').trim();
    if (!UUID_RE.test(targetId)) throw new Error("Invalid target id.");

    const { error } = await supabase
        .from('career_targets')
        .delete()
        .eq('id', targetId)
        .eq('user_id', userId); // ownership double-check on top of RLS

    if (error) {
        console.error("[deleteCareerTarget] delete failed:", error);
        throw new Error("Failed to remove the target university.");
    }

    revalidatePath('/career');
}
