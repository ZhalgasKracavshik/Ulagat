'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Button } from '@/components/ui/button' // Placeholder import, will use standard HTML for now if button not created
import { ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Quick Button component for this file if not exists
function SubmitButton({ children, isLoading }: { children: React.ReactNode, isLoading: boolean }) {
    return (
        <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-8 py-2.5 text-center text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 transition-all shadow-md"
        >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {children}
        </button>
    )
}

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        // We bind the FormData to the action
        const action = isLogin ? login : signup
        const result = await action(formData)

        // If result is returned, it's an error (redirect throws)
        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="text-center">
                    <Link href="/" className="inline-block mb-4 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                        Ulagat
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {isLogin ? 'Welcome back' : 'Create an account'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? 'Sign in to access your dashboard' : 'Join the school community today'}
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        {!isLogin && (
                            <>
                                <div>
                                    <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                                        Full Name
                                    </label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        required
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="role" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                                        I am a...
                                    </label>
                                    <select
                                        id="role"
                                        name="role"
                                        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                    </select>
                                </div>
                            </>
                        )}

                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isLogin ? "current-password" : "new-password"}
                                required
                                minLength={6}
                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-gray-800 dark:text-red-400" role="alert">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <SubmitButton isLoading={isLoading}>
                        {isLogin ? 'Sign In' : 'Create Account'}
                    </SubmitButton>
                </form>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm font-medium text-primary hover:underline dark:text-primary-400"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    )
}
