import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/profile/SignOutButton";
import {
    Star,
    ShieldCheck,
    Sparkles,
    Edit,
    ArrowRight,
    BookOpen,
    type LucideIcon,
} from "lucide-react";
import { NAV, CAREER_NAV_ROLES, INVITE_PARENT_ROLES } from "@/lib/nav-config";
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
        label: "My Schedule",
        hint: NAV.schedule.hint,
        icon: NAV.schedule.icon,
        color: NAV.schedule.color,
        bg: "bg-sky-50",
    });

    if (CAREER_NAV_ROLES.includes(role)) {
        actions.push({
            key: "career",
            href: NAV.career.href,
            label: "Career",
            hint: NAV.career.hint,
            icon: NAV.career.icon,
            color: NAV.career.color,
            bg: "bg-rose-50",
        });
    }

    actions.push({
        key: "clubs",
        href: NAV.clubs.href,
        label: "Clubs",
        hint: NAV.clubs.hint,
        icon: NAV.clubs.icon,
        color: NAV.clubs.color,
        bg: "bg-violet-50",
    });

    if (INVITE_PARENT_ROLES.includes(role)) {
        actions.push({
            key: "invite",
            href: "/profile/me#invite",
            label: "Invite Parent",
            hint: "Generate a parent link code",
            icon: NAV.friends.icon,
            color: "text-blue-500",
            bg: "bg-blue-50",
        });
    }

    actions.push({
        key: "premium",
        href: NAV.premium.href,
        label: isPremium ? "Premium" : "Go Premium",
        hint: isPremium ? "Manage your subscription" : NAV.premium.hint,
        icon: Sparkles,
        color: "text-amber-500",
        bg: "bg-amber-50",
    });

    actions.push({
        key: "guide",
        href: NAV.guide.href,
        label: "Guide",
        hint: NAV.guide.hint,
        icon: NAV.guide.icon,
        color: NAV.guide.color,
        bg: "bg-indigo-50",
    });

    actions.push({
        key: "edit",
        href: "/profile/edit",
        label: "Edit Profile",
        hint: "Update your details and links",
        icon: Edit,
        color: "text-slate-500",
        bg: "bg-slate-100",
    });

    return (
        <section className="space-y-6" aria-label="Personal cabinet">
            {/* Header */}
            <div className="rounded-2xl border bg-white p-6 md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-5">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-white shadow">
                            <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                            <AvatarFallback className="text-2xl bg-indigo-50 text-indigo-600">
                                {profile.full_name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                    {profile.full_name}
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className="capitalize">
                                    {role}
                                </Badge>
                                {classLabel && (
                                    <Badge variant="outline" className="font-medium">
                                        Class {classLabel}
                                    </Badge>
                                )}
                                {isPremium && (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        Premium
                                    </Badge>
                                )}
                                {isChainValid ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1">
                                        <ShieldCheck className="w-3 h-3" />
                                        Verified ledger
                                    </Badge>
                                ) : (
                                    <Badge
                                        className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1"
                                        title="Reputation ledger has been tampered with"
                                    >
                                        <ShieldCheck className="w-3 h-3" />
                                        Invalid ledger
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-semibold text-slate-900">{totalPoints}</span>
                                reputation points
                            </div>
                        </div>
                    </div>

                    {/* Account controls */}
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                        <Link
                            href="/profile/edit"
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                            <Edit className="w-4 h-4" />
                            Edit profile
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
                    New here? Read the guide
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Quick actions
                </h2>
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                    {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.key}
                                href={action.href}
                                className="group flex flex-col gap-2 rounded-xl border bg-white p-4 transition-all hover:shadow-md hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                            >
                                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${action.bg}`}>
                                    <Icon className={`w-5 h-5 ${action.color}`} />
                                </span>
                                <span className="font-semibold text-slate-900">{action.label}</span>
                                <span className="text-xs text-slate-500 leading-snug">{action.hint}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
