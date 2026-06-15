"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2, Crown } from "lucide-react";
import { useT } from "@/hooks/useT";
import type { SubscriptionPlan } from "@/types";

type Feature = { key: string; soon?: boolean };

const FREE_FEATURES: Feature[] = [
    { key: "pricing.freeFeat1" },
    { key: "pricing.freeFeat2" },
    { key: "pricing.freeFeat3" },
    { key: "pricing.freeFeat4", soon: true },
];

const PREMIUM_FEATURES: Feature[] = [
    { key: "pricing.premiumFeat1" },
    { key: "pricing.premiumFeat2", soon: true },
    { key: "pricing.premiumFeat3", soon: true },
    { key: "pricing.premiumFeat4", soon: true },
    { key: "pricing.premiumFeat5" },
];

const PREMIUM_PRICE = "1 800 ₸";

export function PricingCards({
    currentPlan,
    periodEnd,
}: {
    currentPlan: SubscriptionPlan;
    periodEnd: string | null;
}) {
    const { t, locale } = useT();
    const [loading, setLoading] = useState<null | "upgrade" | "manage">(null);
    const isPremium = currentPlan === "premium";

    async function startCheckout() {
        setLoading("upgrade");
        try {
            const res = await fetch("/api/subscriptions/checkout", { method: "POST" });
            const data = (await res.json()) as { url?: string; error?: string };
            if (!res.ok || !data.url) {
                toast.error(data.error ?? t("pricing.checkoutError"));
                setLoading(null);
                return;
            }
            window.location.href = data.url;
        } catch {
            toast.error(t("pricing.networkError"));
            setLoading(null);
        }
    }

    async function openPortal() {
        setLoading("manage");
        try {
            const res = await fetch("/api/subscriptions/portal", { method: "POST" });
            const data = (await res.json()) as { url?: string; error?: string };
            if (!res.ok || !data.url) {
                toast.error(data.error ?? t("pricing.portalError"));
                setLoading(null);
                return;
            }
            window.location.href = data.url;
        } catch {
            toast.error(t("pricing.networkError"));
            setLoading(null);
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Free */}
            <Card className={isPremium ? "" : "border-2 border-indigo-200 shadow-lg"}>
                <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground">{t("pricing.free")}</h2>
                        {!isPremium && (
                            <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border-0">
                                {t("pricing.currentPlan")}
                            </Badge>
                        )}
                    </div>
                    <p className="text-3xl font-extrabold text-foreground">
                        0 ₸<span className="text-base font-medium text-muted-foreground">{t("pricing.perMonth")}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t("pricing.freeTagline")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="space-y-2.5">
                        {FREE_FEATURES.map((f) => (
                            <li key={f.key} className="flex items-start gap-2 text-sm text-foreground">
                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>
                                    {t(f.key)}
                                    {f.soon && (
                                        <span className="ml-2 text-[10px] font-semibold uppercase text-muted-foreground">
                                            {t("pricing.comingSoon")}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Button variant="outline" className="w-full" disabled>
                        {isPremium ? t("pricing.included") : t("pricing.yourCurrentPlan")}
                    </Button>
                </CardContent>
            </Card>

            {/* Premium */}
            <Card className="relative overflow-hidden border-2 border-amber-300 shadow-xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-200/40 rounded-full blur-2xl" />
                <CardHeader className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-500" /> {t("pricing.premium")}
                        </h2>
                        {isPremium ? (
                            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-0">{t("pricing.active")}</Badge>
                        ) : (
                            <Badge className="bg-amber-500 text-white border-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> {t("pricing.recommended")}
                            </Badge>
                        )}
                    </div>
                    <p className="text-3xl font-extrabold text-foreground">
                        {PREMIUM_PRICE}
                        <span className="text-base font-medium text-muted-foreground">{t("pricing.perMonth")}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t("pricing.premiumTagline")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                    <ul className="space-y-2.5">
                        {PREMIUM_FEATURES.map((f) => (
                            <li key={f.key} className="flex items-start gap-2 text-sm text-foreground">
                                <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <span>
                                    {t(f.key)}
                                    {f.soon && (
                                        <span className="ml-2 text-[10px] font-semibold uppercase text-muted-foreground">
                                            {t("pricing.comingSoon")}
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {isPremium ? (
                        <div className="space-y-2">
                            {periodEnd && (
                                <p className="text-xs text-muted-foreground text-center">
                                    {t("pricing.renewsOn", {
                                        date: new Date(periodEnd).toLocaleDateString(
                                            locale === "en" ? "en-US" : locale === "kk" ? "kk-KZ" : "ru-RU",
                                            { month: "short", day: "numeric", year: "numeric" },
                                        ),
                                    })}
                                </p>
                            )}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={openPortal}
                                disabled={loading !== null}
                            >
                                {loading === "manage" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    t("pricing.manageSubscription")
                                )}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={startCheckout}
                            disabled={loading !== null}
                        >
                            {loading === "upgrade" ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" /> {t("pricing.upgradeToPremium")}
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
