"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2, Crown } from "lucide-react";
import type { SubscriptionPlan } from "@/types";

type Feature = { label: string; soon?: boolean };

const FREE_FEATURES: Feature[] = [
    { label: "Full schedule, substitutions & announcements" },
    { label: "Events, clubs, leaderboard & lost-and-found" },
    { label: "Career / ЕНТ tracker" },
    { label: "10 AI mentor questions per day", soon: true },
];

const PREMIUM_FEATURES: Feature[] = [
    { label: "Everything in Free" },
    { label: "Unlimited AI mentor questions", soon: true },
    { label: "Saved AI conversation history", soon: true },
    { label: "Priority certificate review queue", soon: true },
    { label: "Early access to new features" },
];

const PREMIUM_PRICE = "1 800 ₸";

export function PricingCards({
    currentPlan,
    periodEnd,
}: {
    currentPlan: SubscriptionPlan;
    periodEnd: string | null;
}) {
    const [loading, setLoading] = useState<null | "upgrade" | "manage">(null);
    const isPremium = currentPlan === "premium";

    async function startCheckout() {
        setLoading("upgrade");
        try {
            const res = await fetch("/api/subscriptions/checkout", { method: "POST" });
            const data = (await res.json()) as { url?: string; error?: string };
            if (!res.ok || !data.url) {
                toast.error(data.error ?? "Could not start checkout.");
                setLoading(null);
                return;
            }
            window.location.href = data.url;
        } catch {
            toast.error("Network error. Please try again.");
            setLoading(null);
        }
    }

    async function openPortal() {
        setLoading("manage");
        try {
            const res = await fetch("/api/subscriptions/portal", { method: "POST" });
            const data = (await res.json()) as { url?: string; error?: string };
            if (!res.ok || !data.url) {
                toast.error(data.error ?? "Could not open billing portal.");
                setLoading(null);
                return;
            }
            window.location.href = data.url;
        } catch {
            toast.error("Network error. Please try again.");
            setLoading(null);
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Free */}
            <Card className={isPremium ? "" : "border-2 border-indigo-200 shadow-lg"}>
                <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">Free</h2>
                        {!isPremium && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-0">
                                Current plan
                            </Badge>
                        )}
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">
                        0 ₸<span className="text-base font-medium text-slate-400"> / month</span>
                    </p>
                    <p className="text-sm text-slate-500">
                        Everything BINOM students need, every day.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="space-y-2.5">
                        {FREE_FEATURES.map((f) => (
                            <li key={f.label} className="flex items-start gap-2 text-sm text-slate-700">
                                <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>
                                    {f.label}
                                    {f.soon && (
                                        <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">
                                            coming soon
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <Button variant="outline" className="w-full" disabled>
                        {isPremium ? "Included" : "Your current plan"}
                    </Button>
                </CardContent>
            </Card>

            {/* Premium */}
            <Card className="relative overflow-hidden border-2 border-amber-300 shadow-xl">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-200/40 rounded-full blur-2xl" />
                <CardHeader className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-500" /> Premium
                        </h2>
                        {isPremium ? (
                            <Badge className="bg-amber-100 text-amber-800 border-0">Active</Badge>
                        ) : (
                            <Badge className="bg-amber-500 text-white border-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Recommended
                            </Badge>
                        )}
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">
                        {PREMIUM_PRICE}
                        <span className="text-base font-medium text-slate-400"> / month</span>
                    </p>
                    <p className="text-sm text-slate-500">
                        Unlock the AI mentor and priority perks when they launch.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                    <ul className="space-y-2.5">
                        {PREMIUM_FEATURES.map((f) => (
                            <li key={f.label} className="flex items-start gap-2 text-sm text-slate-700">
                                <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                <span>
                                    {f.label}
                                    {f.soon && (
                                        <span className="ml-2 text-[10px] font-semibold uppercase text-slate-400">
                                            coming soon
                                        </span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>

                    {isPremium ? (
                        <div className="space-y-2">
                            {periodEnd && (
                                <p className="text-xs text-slate-500 text-center">
                                    Renews on{" "}
                                    {new Date(periodEnd).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
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
                                    "Manage subscription"
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
                                    <Sparkles className="w-4 h-4 mr-2" /> Upgrade to Premium
                                </>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
