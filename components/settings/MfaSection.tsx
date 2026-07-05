"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";
import { useT } from "@/hooks/useT";

type Stage = "loading" | "none" | "enrolling" | "enrolled";

/**
 * TOTP two-factor management for staff accounts (rendered in /settings for
 * admin/moderator only). Enrolling shows a QR + manual secret, then verifies
 * a first code. Once a factor is verified, /admin requires it every session
 * (enforced in the middleware via AAL2).
 */
export function MfaSection() {
    const { t } = useT();
    const router = useRouter();
    const [stage, setStage] = useState<Stage>("loading");
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const bootstrapped = useRef(false);

    const refreshFactors = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) {
            console.error("[mfa] listFactors:", error);
            setStage("none");
            return;
        }
        const verified = data?.totp?.find((f) => f.status === "verified");
        if (verified) {
            setFactorId(verified.id);
            setStage("enrolled");
        } else {
            setStage("none");
        }
    }, []);

    useEffect(() => {
        if (bootstrapped.current) return;
        bootstrapped.current = true;
        refreshFactors();
    }, [refreshFactors]);

    const startEnroll = async () => {
        setBusy(true);
        const supabase = createClient();
        // Clean up any dangling unverified factor from an abandoned attempt —
        // GoTrue refuses a second unverified enrollment with the same name.
        // (data.totp only lists verified factors; unverified live in data.all.)
        const { data: existing } = await supabase.auth.mfa.listFactors();
        for (const f of existing?.all ?? []) {
            if (f.factor_type === "totp" && f.status === "unverified") {
                await supabase.auth.mfa.unenroll({ factorId: f.id });
            }
        }
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
        setBusy(false);
        if (error || !data) {
            toast.error(error?.message ?? t("mfa.enrollFailed"));
            return;
        }
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setCode("");
        setStage("enrolling");
    };

    const confirmEnroll = async () => {
        if (!factorId || code.trim().length < 6) return;
        setBusy(true);
        const supabase = createClient();
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError || !challenge) {
            toast.error(challengeError?.message ?? t("mfa.verifyFailed"));
            setBusy(false);
            return;
        }
        const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.id,
            code: code.trim(),
        });
        setBusy(false);
        if (verifyError) {
            toast.error(t("mfa.wrongCode"));
            return;
        }
        toast.success(t("mfa.enabled"));
        setQrCode(null);
        setSecret(null);
        setStage("enrolled");
        router.refresh();
    };

    const disable = async () => {
        if (!factorId) return;
        setBusy(true);
        const supabase = createClient();
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        setBusy(false);
        if (error) {
            // Unenrolling a verified factor requires an AAL2 session — point
            // the user through the challenge first.
            toast.error(t("mfa.disableNeedsAal2"));
            router.push("/mfa?next=/settings");
            return;
        }
        toast.success(t("mfa.disabled"));
        setFactorId(null);
        setStage("none");
        router.refresh();
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    {t("mfa.sectionTitle")}
                    {stage === "enrolled" && (
                        <Badge className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400">
                            {t("mfa.statusOn")}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("mfa.sectionBody")}</p>

                {stage === "loading" && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}

                {stage === "none" && (
                    <Button onClick={startEnroll} disabled={busy} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                        {t("mfa.enableCta")}
                    </Button>
                )}

                {stage === "enrolling" && (
                    <div className="space-y-4">
                        <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                            <li>{t("mfa.step1")}</li>
                            <li>{t("mfa.step2")}</li>
                            <li>{t("mfa.step3")}</li>
                        </ol>
                        {qrCode && (
                            <div className="flex justify-center rounded-xl border bg-white p-4">
                                {/* Supabase returns the QR as a data URL — plain img keeps it offline. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrCode} alt={t("mfa.qrAlt")} width={180} height={180} />
                            </div>
                        )}
                        {secret && (
                            <p className="break-all rounded-lg bg-muted px-3 py-2 text-center font-mono text-xs text-muted-foreground">
                                {secret}
                            </p>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="mfa_enroll_code">{t("mfa.codeLabel")}</Label>
                            <Input
                                id="mfa_enroll_code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => e.key === "Enter" && confirmEnroll()}
                                className="h-11 text-center text-xl tracking-[0.4em] font-mono"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={confirmEnroll}
                                disabled={busy || code.length < 6}
                                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {t("mfa.confirmCta")}
                            </Button>
                            <Button variant="ghost" disabled={busy} onClick={() => { setStage("none"); setQrCode(null); setSecret(null); }}>
                                {t("common.cancel")}
                            </Button>
                        </div>
                    </div>
                )}

                {stage === "enrolled" && (
                    <Button variant="outline" onClick={disable} disabled={busy} className="gap-2 text-red-600 hover:text-red-700">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {t("mfa.disableCta")}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
