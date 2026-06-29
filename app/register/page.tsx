
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/register-form'

interface RegisterPageProps {
    searchParams: Promise<{ invite?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        redirect('/home')
    }

    const { invite } = await searchParams

    // The classes that actually exist in the timetable. A registering student
    // picks their class from this list so their (grade, class_letter) is an
    // exact match for substitution emails. Read with the service-role client
    // because the schedule SELECT policy is authenticated-only and registration
    // is anonymous. Falls back to a manual grade+letter picker when empty.
    let classOptions: { grade: number; letter: string }[] = []
    try {
        const admin = createAdminClient()
        const { data: rows } = await admin.from('schedule').select('grade, class_letter')
        const seen = new Set<string>()
        for (const r of rows ?? []) {
            const grade = r.grade as number | null
            const letter = ((r.class_letter as string | null) ?? '').trim()
            if (grade == null || !letter) continue
            const key = `${grade}|${letter}`
            if (seen.has(key)) continue
            seen.add(key)
            classOptions.push({ grade, letter })
        }
        classOptions.sort((a, b) => a.grade - b.grade || a.letter.localeCompare(b.letter, 'kk'))
    } catch {
        classOptions = []
    }

    return <RegisterForm initialInviteCode={invite} classOptions={classOptions} />
}
