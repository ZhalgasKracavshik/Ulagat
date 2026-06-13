import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedClass = {
    grade: number | null;
    letter: string | null;
    /** True for a parent whose account has no linked child yet. */
    parentWithoutChild: boolean;
};

/**
 * Resolve which class (grade + letter) a user's schedule should show.
 *
 * - Students/teachers/staff: their own profile grade + class_letter.
 * - Parents: the first linked child's class via family_bonds.
 *
 * Mirrors the logic in app/schedule/page.tsx so the Express dashboard and
 * the full schedule page agree on the target class.
 */
export async function resolveUserClass(
    supabase: SupabaseClient,
    userId: string,
    profile: { role: string; grade?: number | null; class_letter?: string | null } | null
): Promise<ResolvedClass> {
    const role = profile?.role ?? "student";

    if (role === "parent") {
        const { data: bond } = await supabase
            .from("family_bonds")
            .select("student_id")
            .eq("parent_id", userId)
            .limit(1)
            .maybeSingle();

        if (!bond?.student_id) {
            return { grade: null, letter: null, parentWithoutChild: true };
        }

        const { data: child } = await supabase
            .from("profiles")
            .select("grade, class_letter")
            .eq("id", bond.student_id)
            .single();

        return {
            grade: child?.grade ?? null,
            letter: child?.class_letter ?? null,
            parentWithoutChild: false,
        };
    }

    return {
        grade: profile?.grade ?? null,
        letter: profile?.class_letter ?? null,
        parentWithoutChild: false,
    };
}
