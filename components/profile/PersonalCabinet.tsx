"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/profile/SignOutButton";
import {
    Star,
    ShieldCheck,
    Sparkles,
    Edit,
    Settings,
    ArrowRight,
    BookOpen,
    type LucideIcon,
} from "lucide-react";
import { NAV, CAREER_NAV_ROLES, INVITE_PARENT_ROLES } from "@/lib/nav-config";
import { useT } from "@/hooks/useT";
import type { Profile } from "@/types";

type CabinetQuickAction = {
    key: string;
    href: string;
    label: string;
    hint: string;
    icon: LucideIcon;
    color: string;
    bg: string;
};

/**
 * Owner-only "Personal Cabinet" shown above the profile tabs. This is the
 * user's home base: identity at a glance, the actions they reach for most,
 * and account controls (edit + sign out). Public (non-owner) profile views
 * never render this.
 */
export function PersonalCabinet({
    profile,
    totalPoints,
    isChainValid,
    isPremium,
}: {
    profile: Profile;
    totalPoints: number;
    isChainValid: boolean;
    isPremium: boolean;
}) {
    const { t } = useT();
    const role = profile.role;
    const classLabel =
        profile.grade != null
            ? `${profile.grade}${profile.class_letter ? profile.class_letter.toUpperCase() : ""}`
            : null;

    // Build a focused, role-aware set of quick actions (~6 max). Each tile uses
    // the signature icon+colour so it's recognisable at a glance.
    const actions: CabinetQuickAction[] = [];

    actions.push({
        key: "schedule",
        href: NAV.schedule.href,
        label: t("cabinet.mySchedule"),
        hint: NAV.schedule.hint,
        icon: NAV.schedule.icon,
        color: NAV.schedule.color,
        bg: "bg-sky-50 dark:bg-sky-950/40",
    });

    if (CAREER_NAV_ROLES.includes(role)) {
        actions.push({
            key: "career",
            href: NAV.career.href,
            label: t("cabinet.career"),
            hint: NAV.career.hint,
            icon: NAV.career.icon,
            color: NAV.career.color,
            bg: "bg-rose-50 dark:bg-rose-950/40",
        });
    }

    actions.push({
        key: "clubs",
        href: NAV.clubs.href,
        label: t("cabinet.clubs"),
        hint: NAV.clubs.hint,
        icon: NAV.clubs.icon,
        color: NAV.clubs.color,
        bg: "bg-violet-50 dark:bg-violet-950/40",
    });

    if (INVITE_PARENT_ROLES.includes(role)) {
        actions.push({
            key: "invite",
            href: "/profile/me#invite",
            label: t("cabinet.inviteParent"),
            hint: t("cabinet.inviteParentHint"),
            icon: NAV.friends.icon,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-950/40",
        });
    }

    actions.push({
        key: "premium",
        href: NAV.premium.href,
        label: isPremium ? t("cabinet.premium") : t("cabinet.goPremium"),
        hint: isPremium ? t("cabinet.managePremiumHint") : NAV.premium.hint,
        icon: Sparkles,
        color: "text-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/40",
    });

    actions.push({
        key: "guide",
        href: NAV.guide.href,
        label: t("cabinet.guide"),
        hint: NAV.guide.hint,
        icon: NAV.guide.icon,
        color: NAV.guide.color,
        bg: "bg-indigo-50 dark:bg-indigo-950/40",
    });

    actions.push({
        key: "settings",
        href: "/settings",
        label: t("cabinet.settings"),
        hint: t("cabinet.settingsHint"),
        icon: Settings,
        color: "text-slate-500",
        bg: "bg-muted",
    });

    actions.push({
        key: "edit",
        href: "/profile/edit",
        label: t("cabinet.editProfile"),
        hint: t("cabinet.editProfileHint"),
        icon: Edit,
        color: "text-slate-500",
        bg: "bg-muted",
    });

    return (
        <section className="space-y-6" aria-label="Personal cabinet">
            {/* Header */}
            <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-card shadow">
                            <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                            <AvatarFallback className="text-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                                {profile.full_name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                                    {profile.full_name}
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="capitalize">
                                    {role}
                                </Badge>
                                {classLabel && (
                                    <Badge variant="outline" className="font-medium">
                                        {t("cabinet.class")} {classLabel}
                                    </Badge>
                                )}
                                {isPremium && (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        {t("cabinet.premium")}
                                    </Badge>
                                )}
                                {isChainValid ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        {t("cabinet.verifiedLedger")}
                                    </Badge>
                                ) : (
                                    <Badge
                                        className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1"
                                        title="Reputation ledger has been tampered with"
                                    >
                                        <ShieldCheck className="w-3 h-3" />
                                        {t("cabinet.invalidLedger")}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-semibold text-foreground">{totalPoints}</span>
                                {t("cabinet.reputationPoints")}
                            </div>
                        </div>
                    </div>

                    {/* Account controls */}
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                        <Link
                            href="/profile/edit"
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                            <Edit className="w-4 h-4" />
                            {t("cabinet.editProfileShort")}
                        </Link>
                        <SignOutButton />
                    </div>
                </div>

                {/* New-here nudge */}
                <Link
                    href={NAV.guide.href}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                    <BookOpen className="w-4 h-4" />
                    {t("cabinet.readGuide")}
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("cabinet.quickActions")}
                </h2>
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.key}
                                href={action.href}
                                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                            >
                                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${action.bg}`}>
                                    <Icon className={`w-5 h-5 ${action.color}`} />
                                </span>
                                <span className="font-semibold text-foreground">{action.label}</span>
                                <span className="text-xs text-muted-foreground leading-snug">{action.hint}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
