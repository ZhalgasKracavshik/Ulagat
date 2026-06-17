"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SubmitButton } from "@/components/auth/submit-button";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useT } from "@/hooks/useT";

export function ForgotPasswordForm() {
    const { t } = useT();
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
                <div className="w-full max-w-md space-y-6 rounded-2xl bg-card p-8 shadow-xl border border-border text-center">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{t('auth.checkEmail')}</h2>
                    <p className="text-muted-foreground">
                        {t('auth.checkEmailBody')}
                    </p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-card p-8 shadow-xl border border-border">
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Mail className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {t('auth.forgotTitle')}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t('auth.forgotSubtitle')}
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                            {t('auth.emailAddress')}
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="block w-full rounded-lg border border-border bg-gray-50 p-2.5 text-foreground focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                            placeholder="name@example.com"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-400" role="alert">
                            <span className="font-medium">{t('auth.errorPrefix')}</span> {error}
                        </div>
                    )}

                    <SubmitButton>{t('auth.sendResetLink')}</SubmitButton>
                </form>

                <div className="text-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
