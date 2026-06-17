"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isEntProfileSubject } from "@/data/universities";
import { ENT_SCORE_KEYS, type EntScoreKey } from "@/lib/career";
import type { EntScores } from "@/types";
import { UUID_RE } from "@/lib/validation";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_PER_SUBJECT = 40;
const MAX_TOTAL = 140;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Resolve a translator bound to the caller's cookie locale. Server actions
 * cannot use the client-only useT hook, so we read the dictionary directly
 * (same pattern as the server components).
 */
async function getTranslator(): Promise<(key: string, vars?: Record<string, string | number>) => string> {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    return (key: string, vars?: Record<string, string | number>) => {
        let value = resolveKey(dict, key);
        if (vars) {
            for (const [name, replacement] of Object.entries(vars)) {
                value = value.replaceAll(`{${name}}`, String(replacement));
            }
        }
        return value;
    };
}

/** Localized label for a mandatory subject; profile subjects use their slug. */
const MANDATORY_LABEL_KEYS: Partial<Record<EntScoreKey, string>> = {
    math_literacy: "career.entMathLiteracy",
    reading: "career.entReadingLiteracy",
    history: "career.entHistory",
};

/**
 * A user-facing validation failure. Thrown internally so a single try/catch in
 * each action can convert it into an inline error (redirect param or return
 * value) rather than letting it bubble to the error boundary.
 */
class ValidationError extends Error {}

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
function parseSubjectScore(
    raw: FormDataEntryValue | null,
    label: string,
    t: (key: string, vars?: Record<string, string | number>) => string,
): number | undefined {
    const value = ((raw as string) || '').trim();
    if (value === '') return undefined;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > MAX_PER_SUBJECT) {
        throw new ValidationError(
            t("careerErrors.subjectRange", { label, max: MAX_PER_SUBJECT }),
        );
    }
    return n;
}

/**
 * Upserts the caller's own career tracker row: profile subjects, the five
 * ҰБТ subject scores, target total and notes. Ownership is enforced by
 * user_id = auth.uid() (and the RLS policy / DB guard trigger).
 *
 * User-facing validation failures are surfaced inline on /career/edit via an
 * `error` query param (matching the /profile/edit pattern) instead of throwing
 * past the error boundary.
 */
export async function upsertCareerTracker(formData: FormData) {
    const { supabase, userId } = await requireUser();
    const t = await getTranslator();

    try {
        // ---- Profile subjects (optional, must be from the allowed list) ----
        const rawSubject1 = ((formData.get('profile_subject_1') as string) || '').trim();
        const rawSubject2 = ((formData.get('profile_subject_2') as string) || '').trim();

        let profileSubject1: string | null = null;
        let profileSubject2: string | null = null;

        // Subjects come from a fixed <select>; an invalid value means the form
        // was tampered with — treat as an impossible error (bubbles up).
        if (rawSubject1) {
            if (!isEntProfileSubject(rawSubject1)) throw new Error("Invalid profile subject 1.");
            profileSubject1 = rawSubject1;
        }
        if (rawSubject2) {
            if (!isEntProfileSubject(rawSubject2)) throw new Error("Invalid profile subject 2.");
            profileSubject2 = rawSubject2;
        }
        if (profileSubject1 && profileSubject2 && profileSubject1 === profileSubject2) {
            throw new ValidationError(t("careerErrors.subjectsSame"));
        }

        // ---- ҰБТ subject scores ----
        const labelFor = (key: EntScoreKey): string => {
            const dictKey = MANDATORY_LABEL_KEYS[key];
            if (dictKey) return t(dictKey);
            if (key === 'subject_1') return profileSubject1 || t("careerEdit.profileSubject1");
            return profileSubject2 || t("careerEdit.profileSubject2");
        };

        const scores: EntScores = {};
        let total = 0;
        for (const key of ENT_SCORE_KEYS) {
            const parsed = parseSubjectScore(formData.get(`score_${key}`), labelFor(key), t);
            if (parsed !== undefined) {
                scores[key] = parsed;
                total += parsed;
            }
        }
        if (total > MAX_TOTAL) {
            throw new ValidationError(t("careerErrors.totalTooHigh", { max: MAX_TOTAL, total }));
        }

        // ---- Target score (optional) ----
        let targetScore: number | null = null;
        const rawTarget = ((formData.get('target_score') as string) || '').trim();
        if (rawTarget !== '') {
            const n = Number(rawTarget);
            if (!Number.isInteger(n) || n < 0 || n > MAX_TOTAL) {
                throw new ValidationError(t("careerErrors.targetRange", { max: MAX_TOTAL }));
            }
            targetScore = n;
        }

        // ---- Notes (optional) ----
        const notes = ((formData.get('notes') as string) || '').trim();
        if (notes.length > 2000) throw new ValidationError(t("careerErrors.notesTooLong"));

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
            // DB failure isn't the user's fault — let it reach the error boundary.
            throw new Error("Failed to save your ҰБТ scores.");
        }
    } catch (e: unknown) {
        if (e instanceof ValidationError) {
            redirect(`/career/edit?error=${encodeURIComponent(e.message)}`);
        }
        throw e;
    }

    revalidatePath('/career');
    redirect('/career');
}

/**
 * Adds a target university/specialty for the caller. Ownership is forced —
 * the row is always written with user_id = auth.uid().
 *
 * Returns `{ error }` for user-facing validation failures so the dialog can
 * surface them inline; returns `{ ok: true }` on success.
 */
export async function addCareerTarget(
    formData: FormData,
): Promise<{ ok: true } | { error: string }> {
    const { supabase, userId } = await requireUser();
    const t = await getTranslator();

    const university = ((formData.get('university') as string) || '').trim();
    const specialty = ((formData.get('specialty') as string) || '').trim();
    if (!university) return { error: t("careerErrors.universityRequired") };
    if (university.length > 200) return { error: t("careerErrors.universityTooLong") };
    if (!specialty) return { error: t("careerErrors.specialtyRequired") };
    if (specialty.length > 200) return { error: t("careerErrors.specialtyTooLong") };

    let cutoffScore: number | null = null;
    const rawCutoff = ((formData.get('cutoff_score') as string) || '').trim();
    if (rawCutoff !== '') {
        const n = Number(rawCutoff);
        if (!Number.isInteger(n) || n < 0 || n > MAX_TOTAL) {
            return { error: t("careerErrors.cutoffRange", { max: MAX_TOTAL }) };
        }
        cutoffScore = n;
    }

    let grantDeadline: string | null = null;
    const rawDeadline = ((formData.get('grant_deadline') as string) || '').trim();
    if (rawDeadline !== '') {
        if (!ISO_DATE_RE.test(rawDeadline)) return { error: t("careerErrors.invalidDeadline") };
        // Reject impossible dates like 2026-13-40.
        const parsed = new Date(rawDeadline + 'T00:00:00Z');
        if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== rawDeadline) {
            return { error: t("careerErrors.invalidDeadline") };
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
        // DB failure isn't the user's fault — let it reach the error boundary.
        throw new Error("Failed to add the target university.");
    }

    revalidatePath('/career');
    return { ok: true };
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
