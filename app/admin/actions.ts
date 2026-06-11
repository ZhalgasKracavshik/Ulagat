
'use server'

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function updateUserRole(targetUserId: string, newRole: 'student' | 'teacher' | 'moderator' | 'admin' | 'parent' | 'parliament') {
    const { supabase, role: currentUserRole } = await checkPermission();

    // Only Admins can change roles. Moderators cannot.
    if (currentUserRole !== 'admin') {
        throw new Error("Only Admins can manage roles");
    }

    await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
    revalidatePath('/admin');
}
