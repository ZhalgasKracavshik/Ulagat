'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeClassLetter } from '@/lib/schedule/class-letter'
import { z } from 'zod'

// P0-1 / audit3 #6: the role enum below is the self-registration allowlist.
// Only 'student' and 'parent' may be self-registered via the public form.
// teacher/parliament/moderator/admin are ASSIGNED by an admin (per the PRD),
// so 'teacher' is intentionally NOT here. The handle_new_user DB trigger
// enforces the same allowlist defensively at the database layer.
const signupSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    fullName: z.string()
        .min(2, "Name must be at least 2 characters")
        .regex(/^[a-zA-Z\s]+$/, "Please use only Latin letters and spaces"),
    role: z.enum(["student", "parent"], {
        message: "Invalid role selected",
    }),
})

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

    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        role: formData.get('role'),
    }

    const validatedFields = signupSchema.safeParse(rawData)

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message }
    }

    const { email, password, fullName, role } = validatedFields.data
    const inviteCode = formData.get('inviteCode') as string | null

    // Students must provide grade + class so the schedule view and substitution
    // emails reach them immediately (targeting matches on exact grade +
    // class_letter). Carried into user_metadata and stored by handle_new_user.
    let studentGrade: number | null = null
    let studentClassLetter: string | null = null
    if (role === 'student') {
        const rawGrade = formData.get('grade')
        const parsedGrade = typeof rawGrade === 'string' ? parseInt(rawGrade, 10) : NaN
        const rawLetter = formData.get('class_letter')
        const letter = normalizeClassLetter(typeof rawLetter === 'string' ? rawLetter : '')
        if (!Number.isInteger(parsedGrade) || parsedGrade < 1 || parsedGrade > 11) {
            return { error: 'Please select your grade.' }
        }
        if (!letter) {
            return { error: 'Please select your class.' }
        }
        studentGrade = parsedGrade
        studentClassLetter = letter
    }

    // If role is parent, pre-validate the invite code for an immediate, friendly
    // error before we create the account. The actual atomic token-claim + family
    // bond is performed by the handle_new_user DB trigger (see below), so the
    // link is created on BOTH the immediate and email-confirmation signup paths.
    if (role === 'parent') {
        if (!inviteCode || inviteCode.trim().length === 0) {
            return { error: 'An invite code is required to register as a parent.' }
        }

        // Anon users cannot read tokens under RLS — use the service-role client.
        const adminClient = createAdminClient()
        const { data: tokenData } = await adminClient
            .from('parent_invite_tokens')
            .select('id, student_id, expires_at, used_at')
            .eq('token', inviteCode.trim())
            .maybeSingle()

        if (!tokenData) {
            return { error: 'Invalid invite code. Please ask your child for a new code.' }
        }
        if (tokenData.used_at) {
            return { error: 'This invite code has already been used.' }
        }
        if (new Date(tokenData.expires_at) < new Date()) {
            return { error: 'This invite code has expired. Please ask your child for a new code.' }
        }
    }

    // Check name uniqueness via the service-role client. The profiles SELECT
    // policy is restricted to authenticated users (audit3 #2) and the signup
    // request is still anonymous, so a normal client cannot read profiles here.
    // maybeSingle avoids the PGRST116 error that .single() raises on zero rows.
    const nameClient = createAdminClient()
    const { data: existingName } = await nameClient
        .from('profiles')
        .select('id')
        .eq('full_name', fullName)
        .maybeSingle()

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
                // Stored on the profile by the handle_new_user DB trigger so the
                // student is reachable by schedule + substitution emails at once.
                ...(role === 'student' && studentGrade && studentClassLetter
                    ? { grade: String(studentGrade), class_letter: studentClassLetter }
                    : {}),
                // Consumed by the handle_new_user DB trigger, which atomically
                // claims the token and creates the family_bond at account-insert
                // time (works even when email confirmation is pending).
                ...(role === 'parent' && inviteCode ? { invite_code: inviteCode.trim() } : {}),
            },
        },
    })

    if (signUpError) {
        return { error: signUpError.message }
    }

    // The handle_new_user trigger has already created the profile and, for a
    // parent with a valid invite_code, claimed the token + created the bond at
    // account-insert time. Email-confirmation path: no session yet, so show a
    // confirmation message instead of redirecting into a login loop.
    if (!signUpData.user) {
        return {
            message: 'Registration successful! Please check your email to confirm your account.',
        }
    }

    revalidatePath('/', 'layout')
    redirect('/services')
}
