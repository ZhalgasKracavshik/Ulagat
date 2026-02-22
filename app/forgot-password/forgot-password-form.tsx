"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/auth/submit-button";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm() {
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit(formData: FormData) {
        setError(null);
        const email = formData.get("email") as string;

        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setSent(true);
        }
    }

    if (sent) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border border-gray-100 text-center">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
                    <p className="text-gray-600">
                        We&apos;ve sent a password reset link to your email address.
                        Please check your inbox and click the link to set a new password.
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        Forgot your password?
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter your email and we&apos;ll send you a reset link.
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary"
                            placeholder="name@example.com"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <SubmitButton>Send Reset Link</SubmitButton>
                </form>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
