'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// P0-1: Only these roles may be self-registered via the public signup form.
const SELF_REGISTERABLE_ROLES = ['student', 'teacher', 'parent'] as const;
type SelfRegisterableRole = typeof SELF_REGISTERABLE_ROLES[number];

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

    // P0-1: Reject any role that is not on the allowlist (prevents admin/moderator/parliament self-registration).
    if (!SELF_REGISTERABLE_ROLES.includes(role as SelfRegisterableRole)) {
        return { error: 'Invalid role.' }
    }

    // If role is parent, validate invite code first (P1-4: save student_id here, reuse later)
    let validatedStudentId: string | null = null
    if (role === 'parent') {
        if (!inviteCode || inviteCode.trim().length === 0) {
            return { error: 'An invite code is required to register as a parent.' }
        }

        // P2-4: Use admin client for this SELECT since anon users cannot read tokens after RLS fix.
        const adminClient = createAdminClient()
        const { data: tokenData, error: tokenError } = await adminClient
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

        // P1-4: Store student_id from initial validation — do NOT re-fetch later.
        validatedStudentId = tokenData.student_id
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

    // P1-2: Handle email confirmation path — user may be null when email confirmation is required.
    if (!signUpData.user) {
        return {
            message: 'Registration successful! Please check your email to confirm your account. Your parent link will be activated after confirmation.',
        }
    }

    // If parent registration with valid invite, atomically claim token and create family bond.
    if (role === 'parent' && inviteCode && validatedStudentId) {
        const adminClient = createAdminClient()

        // P0-2 + P0-4: Atomic conditional UPDATE — only succeeds if used_at IS NULL (prevents race condition / double-use).
        // Uses service-role client because the RLS UPDATE policy now restricts to service_role only (P0-4).
        const { data: claimedToken, error: claimError } = await adminClient
            .from('parent_invite_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token', inviteCode.trim())
            .is('used_at', null)
            .select('student_id')
            .single()

        if (claimError || !claimedToken) {
            // Token was already claimed by a concurrent request.
            return { error: 'Invite code was already used. Please ask the student to generate a new one.' }
        }

        // P0-3: Use service-role client for family_bonds INSERT since RLS now restricts to service_role only.
        // P1-3: Check bondError and log rather than silently discard.
        const { error: bondError } = await adminClient.from('family_bonds').insert({
            parent_id: signUpData.user.id,
            student_id: claimedToken.student_id,
        })

        if (bondError) {
            console.error('Failed to create family bond:', bondError)
            // Do not fail the whole registration — user is registered as parent but without a bond.
            // An admin can create the bond manually.
        }
    }

    revalidatePath('/', 'layout')
    redirect('/services')
}
