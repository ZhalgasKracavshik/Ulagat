
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
    await supabase.from('services').update({ status: 'active' }).eq('id', serviceId);

    // Evaluate if we should award reputation points here
    // const { data: service } = await supabase.from('services').select('owner_id').eq('id', serviceId).single();
    // if(service) await mineBlock(service.owner_id, 'service_approved', 10);

    revalidatePath('/admin');
    revalidatePath('/services');
}

export async function rejectService(serviceId: string) {
    const { supabase } = await checkPermission();
    await supabase.from('services').update({ status: 'archived' }).eq('id', serviceId);
    revalidatePath('/admin');
}

export async function updateUserRole(targetUserId: string, newRole: 'student' | 'teacher' | 'moderator' | 'admin') {
    const { supabase, role: currentUserRole } = await checkPermission();

    // Only Admins can change roles. Moderators cannot.
    if (currentUserRole !== 'admin') {
        throw new Error("Only Admins can manage roles");
    }

    await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
    revalidatePath('/admin');
}
