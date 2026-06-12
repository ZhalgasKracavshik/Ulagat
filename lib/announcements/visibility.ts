import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the grades relevant to a viewer for announcement targeting.
 *
 * - `null`  → no filter: staff / teachers / parliament see every announcement.
 * - `[]`    → no grade resolved (student without a grade, parent without
 *             linked children / children without grades): the viewer sees
 *             ONLY school-wide announcements (target_grades IS NULL).
 * - `[n..]` → the student's own grade, or the parent's children's grades.
 */
export async function getViewerGrades(
    supabase: SupabaseClient,
    userId: string
): Promise<number[] | null> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, grade')
        .eq('id', userId)
        .single();

    const role = profile?.role ?? 'student';

    if (role === 'student') {
        return typeof profile?.grade === 'number' ? [profile.grade] : [];
    }

    if (role === 'parent') {
        const { data: bonds } = await supabase
            .from('family_bonds')
            .select('student_id')
            .eq('parent_id', userId);
        const childIds = (bonds ?? []).map((b) => b.student_id as string);
        if (childIds.length === 0) return [];

        const { data: children } = await supabase
            .from('profiles')
            .select('grade')
            .in('id', childIds);
        return Array.from(
            new Set(
                (children ?? [])
                    .map((c) => c.grade)
                    .filter((g): g is number => typeof g === 'number')
            )
        );
    }

    // Staff / teacher / parliament — no grade filter.
    return null;
}

/**
 * PostgREST `.or()` clause implementing the grade visibility rules above,
 * or `null` when no filter should be applied.
 */
export function announcementGradeFilter(viewerGrades: number[] | null): string | null {
    if (viewerGrades === null) return null;
    if (viewerGrades.length === 0) return 'target_grades.is.null';
    return `target_grades.is.null,target_grades.ov.{${viewerGrades.join(',')}}`;
}
