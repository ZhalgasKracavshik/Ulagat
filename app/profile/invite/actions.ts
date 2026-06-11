'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Generate a 6-digit invite code for parent registration.
 * Only callable by users with role 'student' or 'parliament'.
 * Returns the generated code string.
 */
export async function generateInviteCode(studentId: string): Promise<{ code: string } | { error: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // Verify caller is the student or parliament role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !['student', 'parliament'].includes(profile.role)) {
        return { error: 'Only students or parliament members can generate invite codes' };
    }

    // The caller must be generating for their own profile
    if (user.id !== studentId) {
        return { error: 'You can only generate invite codes for your own account' };
    }

    // Generate a random 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error } = await supabase.from('parent_invite_tokens').insert({
        token: code,
        student_id: studentId,
        expires_at: expiresAt.toISOString(),
    });

    if (error) {
        // If there is a uniqueness conflict, retry once
        if (error.code === '23505') {
            const retryCode = Math.floor(100000 + Math.random() * 900000).toString();
            const { error: retryError } = await supabase.from('parent_invite_tokens').insert({
                token: retryCode,
                student_id: studentId,
                expires_at: expiresAt.toISOString(),
            });
            if (retryError) return { error: 'Failed to generate invite code. Please try again.' };
            return { code: retryCode };
        }
        return { error: 'Failed to generate invite code. Please try again.' };
    }

    return { code };
}

/**
 * Validate a parent invite token.
 * Returns the student_id if the token is valid, not expired, and not used.
 */
export async function validateInviteToken(token: string): Promise<{ studentId: string } | { error: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('parent_invite_tokens')
        .select('student_id, expires_at, used_at')
        .eq('token', token)
        .single();

    if (error || !data) {
        return { error: 'Invalid invite code' };
    }

    if (data.used_at) {
        return { error: 'This invite code has already been used' };
    }

    if (new Date(data.expires_at) < new Date()) {
        return { error: 'This invite code has expired' };
    }

    return { studentId: data.student_id };
}
