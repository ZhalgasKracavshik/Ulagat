
'use client'

import { signup } from '@/app/login/actions'
import { SubmitButton } from '@/components/auth/submit-button'
import Link from 'next/link'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useT } from '@/hooks/useT'

interface RegisterFormProps {
    initialInviteCode?: string
}

export function RegisterForm({ initialInviteCode }: RegisterFormProps) {
    const { t } = useT()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [role, setRole] = useState<string>(initialInviteCode ? 'parent' : 'student')
    const [inviteCode, setInviteCode] = useState<string>(initialInviteCode || '')
    const [showPassword, setShowPassword] = useState(false)

    const isParent = role === 'parent'

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        const result = await signup(formData)

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-xl dark:bg-gray-800 border border-border dark:border-gray-700">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-4 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Ulagat
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-white">
                        {t('auth.createAccount')}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                        {t('auth.joinCommunity')}
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                {t('auth.fullNameLatin')}
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                pattern="[a-zA-Z\s]+"
                                title={t('auth.fullNameTitle')}
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder={t('auth.fullNamePlaceholder')}
                            />
                            <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-tight font-medium">{t('auth.fullNameHint')}</p>
                        </div>
                        <div>
                            <label htmlFor="role" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                {t('auth.iAm')}
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="student">{t('auth.roleStudent')}</option>
                                <option value="parent">{t('auth.roleParent')}</option>
                            </select>
                        </div>

                        {isParent && (
                            <div>
                                <label htmlFor="inviteCode" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                    {t('auth.inviteCode')}
                                </label>
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
                                    className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 tracking-widest text-center text-lg font-mono uppercase"
                                    placeholder="AB23CD45"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('auth.inviteCodeHint')}
                                </p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                {t('auth.emailAddress')}
                            </label>
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
                                className="block h-11 w-full rounded-lg border border-border bg-gray-50 px-3 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                {t('auth.password')}
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                    className="block h-11 w-full rounded-lg border border-border bg-gray-50 px-3 pr-11 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-lg"
                                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                                    aria-pressed={showPassword}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-400" role="alert">
                            <span className="font-medium">{t('auth.errorPrefix')}</span> {error}
                        </div>
                    )}

                    <SubmitButton>{t('auth.signUp')}</SubmitButton>
                </form>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-primary hover:underline dark:text-primary-400"
                    >
                        {t('auth.haveAccount')}
                    </Link>
                </div>
            </div>
        </div>
    )
}
