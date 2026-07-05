'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { isUuid } from '@/lib/validation';
import { mfaStepUpRequired, MFA_REQUIRED_ERROR } from '@/lib/security/mfa';
import { SKUD_DIRECTIONS, normalizeRecordedAt } from '@/lib/skud/validate';
import type { SkudDirection } from '@/types';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Not authenticated.' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    if (profile?.role !== 'admin') return { ok: false, error: 'Admin access required.' };
    if (await mfaStepUpRequired(supabase)) return { ok: false, error: MFA_REQUIRED_ERROR };
    return { ok: true };
}

export type RecordSkudEventResult = { success: true } | { success: false; error: string };

/**
 * Manual test/demo entry — writes through the service role because the
 * skud_events table deliberately has no INSERT policy. Admin + MFA only.
 */
export async function recordSkudEvent(
    studentId: string,
    direction: SkudDirection,
    recordedAt?: string,
): Promise<RecordSkudEventResult> {
    const auth = await requireAdmin();
    if (!auth.ok) return { success: false, error: auth.error };

    if (!isUuid(studentId)) return { success: false, error: 'Invalid student id.' };
    if (!SKUD_DIRECTIONS.includes(direction)) {
        return { success: false, error: 'Direction must be in/out.' };
    }
    const recorded = normalizeRecordedAt(recordedAt);
    if ('error' in recorded) return { success: false, error: recorded.error };

    const admin = createAdminClient();
    const { data: student } = await admin
        .from('profiles')
        .select('id, external_skud_id')
        .eq('id', studentId)
        .maybeSingle();
    if (!student) return { success: false, error: 'Student not found.' };

    const { error } = await admin.from('skud_events').insert({
        user_id: student.id,
        external_id: student.external_skud_id ?? 'MANUAL',
        direction,
        gate: 'manual-test',
        recorded_at: recorded.iso,
    });
    if (error) {
        console.error('recordSkudEvent insert error:', error);
        return { success: false, error: 'Failed to record the event.' };
    }
    revalidatePath('/admin/users');
    return { success: true };
}
