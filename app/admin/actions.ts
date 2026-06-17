
'use server'

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

// Check if current user is admin/moderator
async function checkPermission() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        throw new Error("Unauthorized");
    }
    return { supabase, user, role: profile.role };
}

export async function approveService(serviceId: string) {
    const { supabase } = await checkPermission();
    await supabase.from('services').update({ status: 'active', rejection_reason: null }).eq('id', serviceId);
    revalidatePath('/admin');
    revalidatePath('/services');
}

export async function rejectService(serviceId: string, reason: string) {
    const { supabase } = await checkPermission();
    await supabase.from('services').update({ status: 'rejected', rejection_reason: reason }).eq('id', serviceId);
    revalidatePath('/admin');
}

export async function approveEvent(eventId: string) {
    const { supabase } = await checkPermission();
    await supabase.from('events').update({ status: 'active', rejection_reason: null }).eq('id', eventId);
    revalidatePath('/admin');
    revalidatePath('/events');
}

export async function rejectEvent(eventId: string, reason: string) {
    const { supabase } = await checkPermission();
    await supabase.from('events').update({ status: 'rejected', rejection_reason: reason }).eq('id', eventId);
    revalidatePath('/admin');
}

export async function approveMaterial(materialId: string) {
    const { supabase } = await checkPermission();
    await supabase.from('study_materials').update({ status: 'active', rejection_reason: null }).eq('id', materialId);
    revalidatePath('/admin');
    revalidatePath('/olympiad');
}

export async function rejectMaterial(materialId: string, reason: string) {
    const { supabase } = await checkPermission();
    await supabase.from('study_materials').update({ status: 'rejected', rejection_reason: reason }).eq('id', materialId);
    revalidatePath('/admin');
}

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
    const { user, role: currentUserRole } = await checkPermission();

    // Only Admins can change roles. Moderators cannot.
    if (currentUserRole !== 'admin') {
        throw new Error("Only Admins can manage roles");
    }

    // Validate that newRole is one of the allowed values at runtime.
    const VALID_ROLES: UserRole[] = ['student', 'teacher', 'parent', 'parliament', 'moderator', 'admin'];
    if (!VALID_ROLES.includes(newRole)) {
        throw new Error("Invalid role value.");
    }

    // Prevent an admin from demoting their own account.
    if (user.id === targetUserId) {
        throw new Error("Cannot change your own role.");
    }

    // The live profiles UPDATE RLS policy is own-row only (auth.uid() = id), so
    // the request-scoped client updates 0 rows for OTHER users. The caller is
    // authorized as admin above; execute the write with the service-role client.
    const admin = createAdminClient();
    await admin.from('profiles').update({ role: newRole }).eq('id', targetUserId);
    revalidatePath('/admin');
}
