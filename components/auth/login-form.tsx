
'use client'

import { login } from '@/app/login/actions'
import { SubmitButton } from '@/components/auth/submit-button'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/hooks/useT'

export function LoginForm() {
    const { t } = useT()
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        const result = await login(formData)

        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        } else {
            // Success is handled by redirect in action, but we can stop loading
            // effectively redirects so loading state persists until unmount
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
                        {t('auth.welcomeBack')}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                        {t('auth.signInSubtitle')}
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                {t('auth.emailAddress')}
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                {t('auth.password')}
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                minLength={6}
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-xs font-medium text-primary hover:underline"
                        >
                            {t('auth.forgotPassword')}
                        </Link>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-400" role="alert">
                            <span className="font-medium">{t('auth.errorPrefix')}</span> {error}
                        </div>
                    )}

                    <SubmitButton>{t('auth.signIn')}</SubmitButton>
                </form>

                <div className="text-center">
                    <Link
                        href="/register"
                        className="text-sm font-medium text-primary hover:underline dark:text-primary-400"
                    >
                        {t('auth.noAccount')}
                    </Link>
                </div>
            </div>
        </div>
    )
}
