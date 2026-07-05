"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useT } from "@/hooks/useT";

/**
 * MFA step-up challenge. The middleware sends staff here when their account
 * has a verified TOTP factor but the current session is still AAL1. On a
 * successful verify the session is upgraded to AAL2 and the user continues
 * to where they were going.
 */
function MfaChallenge() {
    const { t } = useT();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [factorId, setFactorId] = useState<string | null>(null);
    const bootstrapped = useRef(false);

    // Only ever redirect within the app — a tampered ?next= must not become
    // an open redirect.
    const rawNext = searchParams.get("next") ?? "/admin";
    const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/admin";

    useEffect(() => {
        if (bootstrapped.current) return;
        bootstrapped.current = true;
        const supabase = createClient();
        (async () => {
            const { data, error: listError } = await supabase.auth.mfa.listFactors();
            if (listError) {
                setError(listError.message);
                return;
            }
            const factor = data?.totp?.find((f) => f.status === "verified");
            if (!factor) {
                // Nothing to challenge — the middleware wouldn't have sent us
                // here; just continue.
                router.replace(nextPath);
                return;
            }
            setFactorId(factor.id);
        })();
    }, [router, nextPath]);

    const handleVerify = useCallback(async () => {
        if (!factorId || code.trim().length < 6) return;
        setVerifying(true);
        setError(null);
        const supabase = createClient();
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError || !challenge) {
            setError(challengeError?.message ?? t("mfa.verifyFailed"));
            setVerifying(false);
            return;
        }
        const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code: code.trim(),
        });
        if (verifyError) {
            setError(t("mfa.wrongCode"));
            setVerifying(false);
            return;
        }
        router.replace(nextPath);
        router.refresh();
    }, [factorId, code, nextPath, router, t]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md border-0 shadow-2xl">
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50">
                        <ShieldCheck className="h-8 w-8 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl">{t("mfa.challengeTitle")}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t("mfa.challengeBody")}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mfa_code">{t("mfa.codeLabel")}</Label>
                        <Input
                            id="mfa_code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="000000"
                            maxLength={6}
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                            className="h-12 text-center text-2xl tracking-[0.5em] font-mono"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button
                        onClick={handleVerify}
                        disabled={verifying || !factorId || code.length < 6}
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    >
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t("mfa.verifyCta")}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        <Link href="/home" className="hover:underline">{t("mfa.backHome")}</Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function MfaPage() {
    return (
        <Suspense fallback={null}>
            <MfaChallenge />
        </Suspense>
    );
}
