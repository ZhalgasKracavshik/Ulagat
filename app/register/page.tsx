
import { createClient } from '@/lib/supabase/server'
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

    return <RegisterForm initialInviteCode={invite} />
}
