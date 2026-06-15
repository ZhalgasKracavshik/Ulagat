import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";
import {
    NAV,
    CAREER_NAV_ROLES,
    STAFF_ROLES,
    type NavDestination,
    type NavRole,
} from "@/lib/nav-config";
import {
    Sparkles,
    ShieldCheck,
    Sun,
    Moon,
    Award,
    UserCog,
    UsersRound,
    ArrowRight,
    type LucideIcon,
} from "lucide-react";

export const metadata = {
    title: "Guide — Ulagat",
    description: "Learn how Ulagat works: schedule, announcements, clubs, achievements and more.",
};

type DirSection = {
    label: string;
    intro: string;
    items: NavDestination[];
};

export default async function GuidePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Server component: resolve the locale from the cookie and translate via
    // the dictionary directly (the useT hook is client-only).
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string) => resolveKey(dict, key);

    let role: NavRole | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        role = (profile?.role as NavRole | undefined) ?? null;
    }

    const showCareer = role !== null && CAREER_NAV_ROLES.includes(role);
    const isStaff = role !== null && STAFF_ROLES.includes(role);

    // Feature directory, grouped. Role-aware where it matters. Section labels
    // are translated; the one-line intros stay in English for now (deeper copy
    // is translated in a later pass).
    const sections: DirSection[] = [
        {
            label: t("guide.everyDay"),
            intro: t("guide.everyDayIntro"),
            items: [NAV.schedule, NAV.announcements, NAV.home],
        },
        {
            label: t("guide.community"),
            intro: t("guide.communityIntro"),
            items: [NAV.events, NAV.clubs, NAV.leaderboard, NAV.friends, NAV.chats],
        },
        {
            label: t("guide.grow"),
            intro: t("guide.growIntro"),
            items: [
                ...(showCareer ? [NAV.career] : []),
                NAV.prep,
                NAV.achievements,
            ],
        },
        {
            label: t("guide.services"),
            intro: t("guide.servicesIntro"),
            items: [NAV.bulletin, NAV.lostFound],
        },
        {
            label: t("guide.account"),
            intro: t("guide.accountIntro"),
            items: [NAV.cabinet, NAV.premium],
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-10 md:py-14 space-y-12 max-w-5xl">
                {/* Hero */}
                <section className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-600">
                        <Sparkles className="w-3.5 h-3.5" />
                        {t("guide.heroBadge")}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        {t("guide.heroTitle")}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
                        {t("guide.heroSubtitle")}
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Link
                            href="/home"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                            {t("guide.heroDashboard")}
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/profile/me"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                            {t("guide.heroCabinet")}
                        </Link>
                    </div>
                </section>

                {/* How it works */}
                <section className="space-y-5">
                    <h2 className="text-xl font-bold text-foreground">{t("guide.howItWorks")}</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <HowItWorks
                            icon={UserCog}
                            color="text-violet-500"
                            bg="bg-violet-50 dark:bg-violet-950/40"
                            title={t("guide.rolesTitle")}
                            body={t("guide.rolesBody")}
                        />
                        <HowItWorks
                            icon={Award}
                            color="text-amber-500"
                            bg="bg-amber-50 dark:bg-amber-950/40"
                            title={t("guide.reputationTitle")}
                            body={t("guide.reputationBody")}
                        />
                        <HowItWorks
                            icon={Sun}
                            color="text-amber-500"
                            bg="bg-amber-50 dark:bg-amber-950/40"
                            title={t("guide.toggleTitle")}
                            body={t("guide.toggleBody")}
                            secondaryIcon={Moon}
                        />
                        <HowItWorks
                            icon={UsersRound}
                            color="text-blue-500"
                            bg="bg-blue-50 dark:bg-blue-950/40"
                            title={t("guide.parentsTitle")}
                            body={t("guide.parentsBody")}
                        />
                    </div>
                </section>

                {/* Feature directory */}
                <section className="space-y-8">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-foreground">{t("guide.everything")}</h2>
                        <p className="text-muted-foreground">{t("guide.everythingIntro")}</p>
                    </div>

                    {sections.map((section) => {
                        if (section.items.length === 0) return null;
                        return (
                            <div key={section.label} className="space-y-3">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">
                                        {section.label}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">{section.intro}</p>
                                </div>
                                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                                    {section.items.map((item) => (
                                        <FeatureCard
                                            key={item.key}
                                            item={item}
                                            label={t(`nav.${item.key}`)}
                                            hint={t(`nav.hints.${item.key}`)}
                                            openLabel={t("common.open")}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Staff-only card */}
                    {isStaff && (
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-base font-semibold text-foreground">{t("guide.forStaff")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {t("guide.forStaffIntro")}
                                </p>
                            </div>
                            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                                <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-foreground">{t("nav.moderation")}</p>
                                        <p className="text-sm text-muted-foreground leading-snug">
                                            {t("guide.moderationHint")}
                                        </p>
                                        <Link
                                            href="/admin"
                                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                        >
                                            {t("common.open")} <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function HowItWorks({
    icon: Icon,
    secondaryIcon: SecondaryIcon,
    color,
    bg,
    title,
    body,
}: {
    icon: LucideIcon;
    secondaryIcon?: LucideIcon;
    color: string;
    bg: string;
    title: string;
    body: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
                {SecondaryIcon && <SecondaryIcon className="w-3.5 h-3.5 text-indigo-500 -ml-1" />}
            </span>
            <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground leading-snug">{body}</p>
            </div>
        </div>
    );
}

function FeatureCard({
    item,
    label,
    hint,
    openLabel,
}: {
    item: NavDestination;
    label: string;
    hint: string;
    openLabel: string;
}) {
    const Icon = item.icon;
    return (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className={`w-5 h-5 ${item.color}`} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground leading-snug">{hint}</p>
                <Link
                    href={item.href}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                    {openLabel} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
