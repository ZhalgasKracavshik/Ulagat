'use server';

import { randomInt } from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Unambiguous alphabet (no 0/O, 1/I/L) for an 8-char token. 32^8 ≈ 1.1e12
// possibilities — far beyond enumeration, unlike the old 6-digit (9e5) code.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
    let out = '';
    for (let i = 0; i < 8; i++) {
        out += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
    }
    return out;
}

/**
 * Generate a one-time invite code for parent registration.
 * Only callable by users with role 'student' or 'parliament', for their own
 * account. Invalidates any prior unused codes so only one is active at a time
 * (shrinks the brute-force surface). Returns the generated code string.
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

    // Single active token: drop any prior unused codes for this student before
    // minting a new one (DELETE policy permits auth.uid() = student_id).
    await supabase
        .from('parent_invite_tokens')
        .delete()
        .eq('student_id', studentId)
        .is('used_at', null);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Try a few times in the unlikely event of a token collision.
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();
        const { error } = await supabase.from('parent_invite_tokens').insert({
            token: code,
            student_id: studentId,
            expires_at: expiresAt.toISOString(),
        });
        if (!error) return { code };
        if (error.code !== '23505') {
            return { error: 'Failed to generate invite code. Please try again.' };
        }
    }
    return { error: 'Failed to generate invite code. Please try again.' };
}
