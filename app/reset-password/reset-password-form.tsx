"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/auth/submit-button";
import { Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function ResetPasswordForm() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [ready, setReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Supabase will auto-exchange the token from the URL hash
        setReady(true);
    }, []);

    async function handleSubmit(formData: FormData) {
        setError(null);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirm_password") as string;

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => router.push("/home"), 2000);
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-xl border text-center">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Password Updated!</h2>
                    <p className="text-gray-600">Redirecting to your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        Set new password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Choose a strong password for your account.
                    </p>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-900">
                            New Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirm_password" className="mb-2 block text-sm font-medium text-gray-900">
                            Confirm Password
                        </label>
                        <input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            required
                            minLength={6}
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-primary focus:ring-primary"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <SubmitButton>Update Password</SubmitButton>
                </form>

                <div className="text-center">
                    <Link href="/login" className="text-sm font-medium text-primary hover:underline">
                        Back to login
                    </Link>
                </div>
            </div>
        </div>
    );
}
