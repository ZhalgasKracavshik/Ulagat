'use client'

import { login } from '@/app/login/actions'
import { SubmitButton } from '@/components/auth/submit-button'
import { AuthShell } from '@/components/auth/AuthShell'
import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@/hooks/useT'

const INPUT =
    'block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30'
const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700'

export function LoginForm() {
    const { t } = useT()
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(formData: FormData) {
        setError(null)
        const result = await login(formData)
        if (result?.error) setError(result.error)
    }

    return (
        <AuthShell>
            <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('auth.welcomeBack')}</h1>
                <p className="mt-2 text-sm text-slate-500">{t('auth.signInSubtitle')}</p>
            </div>

            <form action={handleSubmit} className="mt-7 space-y-5">
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
                            autoComplete="current-password"
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
                    <div className="mt-2 flex justify-end">
                        <Link href="/forgot-password" className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline">
                            {t('auth.forgotPassword')}
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                        <span className="font-semibold">{t('auth.errorPrefix')}</span> {error}
                    </div>
                )}

                <SubmitButton>{t('auth.signIn')}</SubmitButton>
            </form>

            <div className="mt-6 text-center">
                <Link href="/register" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                    {t('auth.noAccount')}
                </Link>
            </div>
        </AuthShell>
    )
}
