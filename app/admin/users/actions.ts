'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { UserRole } from '@/types';

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        throw new Error('Admin access required');
    }
    return { supabase, user };
}

export async function updateUserRole(
    userId: string,
    newRole: UserRole
): Promise<{ error?: string }> {
    try {
        const { user } = await requireAdmin();

        // P0-5: Validate that newRole is one of the allowed values at runtime.
        const VALID_ROLES: UserRole[] = ['student', 'teacher', 'parent', 'parliament', 'moderator', 'admin'];
        if (!VALID_ROLES.includes(newRole)) {
            return { error: 'Invalid role value.' };
        }

        // P2-3: Prevent an admin from demoting their own account.
        if (user.id === userId) {
            return { error: 'Cannot change your own role.' };
        }

        // The live profiles UPDATE RLS policy is own-row only (auth.uid() = id),
        // so the request-scoped client updates 0 rows for OTHER users. The caller
        // is already authorized as admin above; execute the write with the
        // service-role client to bypass RLS for this admin-only operation.
        const admin = createAdminClient();
        const { error } = await admin
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) return { error: error.message };

        revalidatePath('/admin/users');
        revalidatePath('/admin');
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
}

export async function updateUserSkudId(
    userId: string,
    skudId: string
): Promise<{ error?: string }> {
    try {
        // Authorize the caller as admin with the request-scoped client, then
        // execute the write with the service-role client (the live profiles
        // UPDATE RLS policy is own-row only, so the request client would update
        // 0 rows for OTHER users).
        await requireAdmin();

        const admin = createAdminClient();
        const { error } = await admin
            .from('profiles')
            .update({ external_skud_id: skudId.trim() || null })
            .eq('id', userId);

        if (error) return { error: error.message };

        revalidatePath('/admin/users');
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
