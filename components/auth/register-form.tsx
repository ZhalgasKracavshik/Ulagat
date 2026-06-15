
'use client'

import { signup } from '@/app/login/actions'
import { SubmitButton } from '@/components/auth/submit-button'
import Link from 'next/link'
import { useState } from 'react'

interface RegisterFormProps {
    initialInviteCode?: string
}

export function RegisterForm({ initialInviteCode }: RegisterFormProps) {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [role, setRole] = useState<string>(initialInviteCode ? 'parent' : 'student')
    const [inviteCode, setInviteCode] = useState<string>(initialInviteCode || '')

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
                        Create an account
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                        Join the school community today
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                Full Name (Latin letters only)
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                required
                                pattern="[a-zA-Z\s]+"
                                title="Please use only Latin letters and spaces (A-Z, a-z)"
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="Zhalgas Danil"
                            />
                            <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Names must be unique and in English</p>
                        </div>
                        <div>
                            <label htmlFor="role" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                I am a...
                            </label>
                            <select
                                id="role"
                                name="role"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="parent">Parent / Guardian</option>
                            </select>
                        </div>

                        {isParent && (
                            <div>
                                <label htmlFor="inviteCode" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                    Invite Code (from your child)
                                </label>
                                <input
                                    id="inviteCode"
                                    name="inviteCode"
                                    type="text"
                                    required={isParent}
                                    maxLength={6}
                                    minLength={6}
                                    pattern="\d{6}"
                                    title="Enter the 6-digit invite code from your child"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 tracking-widest text-center text-lg font-mono"
                                    placeholder="123456"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Ask your child to generate an invite code from their profile page.
                                </p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground dark:text-white">
                                Email Address
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
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={6}
                                className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-400" role="alert">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <SubmitButton>Sign Up</SubmitButton>
                </form>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-primary hover:underline dark:text-primary-400"
                    >
                        Already have an account? Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
