'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/services')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const role = formData.get('role') as string
    const inviteCode = formData.get('inviteCode') as string | null

    // If role is parent, validate invite code first
    if (role === 'parent') {
        if (!inviteCode || inviteCode.trim().length === 0) {
            return { error: 'An invite code is required to register as a parent.' }
        }

        const { data: tokenData, error: tokenError } = await supabase
            .from('parent_invite_tokens')
            .select('id, student_id, expires_at, used_at')
            .eq('token', inviteCode.trim())
            .single()

        if (tokenError || !tokenData) {
            return { error: 'Invalid invite code. Please ask your child for a new code.' }
        }
        if (tokenData.used_at) {
            return { error: 'This invite code has already been used.' }
        }
        if (new Date(tokenData.expires_at) < new Date()) {
            return { error: 'This invite code has expired. Please ask your child for a new code.' }
        }
    }

    // Check name uniqueness first
    const { data: existingName } = await supabase
        .from('profiles')
        .select('id')
        .eq('full_name', fullName)
        .single()

    if (existingName) {
        return { error: "This name is already taken. Please choose another one." }
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role,
            },
        },
    })

    if (signUpError) {
        return { error: signUpError.message }
    }

    // If parent registration with valid invite, create family bond and mark token used
    if (role === 'parent' && inviteCode && signUpData.user) {
        const { data: tokenData } = await supabase
            .from('parent_invite_tokens')
            .select('id, student_id')
            .eq('token', inviteCode.trim())
            .single()

        if (tokenData) {
            // Mark token as used
            await supabase
                .from('parent_invite_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('id', tokenData.id)

            // Create family bond
            await supabase.from('family_bonds').insert({
                parent_id: signUpData.user.id,
                student_id: tokenData.student_id,
            })
        }
    }

    revalidatePath('/', 'layout')
    redirect('/services')
}
