'use client'

import { signup } from '@/app/login/actions'
import { SubmitButton } from '@/components/auth/submit-button'
import { AuthShell } from '@/components/auth/AuthShell'
import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@/hooks/useT'

interface RegisterFormProps {
    initialInviteCode?: string
}

const INPUT =
    'block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30'
const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700'

export function RegisterForm({ initialInviteCode }: RegisterFormProps) {
    const { t } = useT()
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)
    const [role, setRole] = useState<string>(initialInviteCode ? 'parent' : 'student')
    const [inviteCode, setInviteCode] = useState<string>((initialInviteCode || '').toUpperCase())
    const [showPassword, setShowPassword] = useState(false)

    const isParent = role === 'parent'

    async function handleSubmit(formData: FormData) {
        setError(null)
        setMessage(null)
        const result = await signup(formData)
        if (result?.error) setError(result.error)
        else if (result?.message) setMessage(result.message)
    }

    return (
        <AuthShell>
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('auth.createAccount')}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('auth.joinCommunity')}</p>
            </div>

            <form action={handleSubmit} className="mt-7 space-y-5">
                <div>
                    <label htmlFor="fullName" className={LABEL}>{t('auth.fullNameLatin')}</label>
                    <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        pattern="[a-zA-Z\s]+"
                        title={t('auth.fullNameTitle')}
                        autoComplete="name"
                        className={INPUT}
                        placeholder={t('auth.fullNamePlaceholder')}
                    />
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-tight text-slate-400">{t('auth.fullNameHint')}</p>
                </div>

                <div>
                    <label htmlFor="role" className={LABEL}>{t('auth.iAm')}</label>
                    <select
                        id="role"
                        name="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={INPUT}
                    >
                        <option value="student">{t('auth.roleStudent')}</option>
                        <option value="parent">{t('auth.roleParent')}</option>
                    </select>
                </div>

                {isParent && (
                    <div>
                        <label htmlFor="inviteCode" className={LABEL}>{t('auth.inviteCode')}</label>
                        <input
                            id="inviteCode"
                            name="inviteCode"
                            type="text"
                            required={isParent}
                            maxLength={8}
                            minLength={8}
                            pattern="[A-Za-z0-9]{8}"
                            title={t('auth.inviteCodeTitle')}
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                            className={`${INPUT} text-center text-lg font-mono uppercase tracking-[0.3em]`}
                            placeholder="AB23CD45"
                        />
                        <p className="mt-1 text-xs text-slate-500">{t('auth.inviteCodeHint')}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="email" className={LABEL}>{t('auth.emailAddress')}</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                        className={INPUT}
                        placeholder="name@company.com"
                    />
                </div>

                <div>
                    <label htmlFor="password" className={LABEL}>{t('auth.password')}</label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            minLength={6}
                            className={`${INPUT} pr-11`}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                            aria-pressed={showPassword}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                        <span className="font-semibold">{t('auth.errorPrefix')}</span> {error}
                    </div>
                )}
                {message && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700" role="status">
                        {message}
                    </div>
                )}

                <SubmitButton>{t('auth.signUp')}</SubmitButton>
            </form>

            <div className="mt-6 text-center">
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    {t('auth.haveAccount')}
                </Link>
            </div>
        </AuthShell>
    )
}
