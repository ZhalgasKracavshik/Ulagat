import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { PricingCards } from "@/components/pricing/PricingCards";
import { CheckoutStatusToast } from "@/components/pricing/CheckoutStatusToast";
import { getUserPlan } from "@/lib/subscription";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PricingPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    const { status } = await searchParams;
    const supabase = await createClient();

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Effective plan via the shared server helper (handles active/expiry).
    const plan = await getUserPlan(user.id);

    // For the renewal date we still need the raw row, but only surface it for
    // an actually-premium user.
    let periodEnd: string | null = null;
    if (plan === "premium") {
        const { data: sub } = await supabase
            .from("subscriptions")
            .select("current_period_end")
            .eq("user_id", user.id)
            .maybeSingle();
        periodEnd = sub?.current_period_end ?? null;
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 md:px-6 py-10 space-y-8">
            <CheckoutStatusToast status={status} />

            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                    <Sparkles className="w-3.5 h-3.5" /> {t("pricing.badge")}
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                    {t("pricing.title")}
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    {t("pricing.subtitle")}
                </p>
            </div>

            <PricingCards currentPlan={plan} periodEnd={periodEnd} />

            <p className="text-center text-xs text-muted-foreground max-w-lg mx-auto">
                {t("pricing.footer")}
            </p>
        </div>
    );
}
