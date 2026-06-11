'use server';

import { createClient } from '@/lib/supabase/server';
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
        const { supabase } = await requireAdmin();

        const { error } = await supabase
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
        const { supabase } = await requireAdmin();

        const { error } = await supabase
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
