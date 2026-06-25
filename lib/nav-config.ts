import type { LucideIcon } from "lucide-react";
import {
    CalendarDays,
    Megaphone,
    Trophy,
    Users2,
    PackageSearch,
    GraduationCap,
    Crown,
    MessageCircle,
    Users,
    BookOpen,
    Home,
    Sparkles,
    Star,
} from "lucide-react";
import type { UserRole } from "@/types";
import { FEATURES } from "@/lib/features";

/**
 * Single source of truth for the signature icon + colour system.
 *
 * Every feature in Ulagat has a recognisable lucide icon and a Tailwind text
 * colour class. The navbar "More" menu, the mobile bottom-bar overlay, the
 * personal cabinet quick actions and the /guide directory all read from these
 * descriptors so wayfinding-by-recognition stays consistent everywhere.
 */
export type NavRole = UserRole;

export type NavDestination = {
    /** Stable key for React lists. */
    key: string;
    href: string;
    label: string;
    /** Signature lucide icon. */
    icon: LucideIcon;
    /** Tailwind text-colour class for the icon (e.g. "text-sky-500"). */
    color: string;
    /** One-line hint shown in the cabinet tiles and the guide directory. */
    hint: string;
    /**
     * When set, the destination is only shown to these roles. Absent = every
     * authenticated role. Logged-out visitors never see role-gated items.
     */
    roles?: NavRole[];
};

/** Roles that see the Career (ЕНТ tracker) link — not teacher/parliament. */
export const CAREER_NAV_ROLES: NavRole[] = ["student", "parent", "moderator", "admin"];

/** Roles that can generate a parent invite code. */
export const INVITE_PARENT_ROLES: NavRole[] = ["student", "parliament"];

/** Staff roles that see moderation tools. */
export const STAFF_ROLES: NavRole[] = ["admin", "moderator"];

export function canSee(dest: NavDestination, role: NavRole | null): boolean {
    if (!dest.roles) return true;
    if (!role) return false;
    return dest.roles.includes(role);
}

// --- Individual destinations (reused across surfaces) ---------------------

export const NAV = {
    home: {
        key: "home",
        href: "/home",
        label: "Home",
        icon: Home,
        color: "text-indigo-600",
        hint: "Your daily dashboard",
    },
    schedule: {
        key: "schedule",
        href: "/schedule",
        label: "Schedule",
        icon: CalendarDays,
        color: "text-sky-500",
        hint: "Today's lessons and changes",
    },
    announcements: {
        key: "announcements",
        href: "/announcements",
        label: "Announcements",
        icon: Megaphone,
        color: "text-indigo-500",
        hint: "Official school news",
    },
    events: {
        key: "events",
        href: "/events",
        label: "Events",
        icon: Trophy,
        color: "text-amber-500",
        hint: "Competitions and gatherings",
    },
    clubs: {
        key: "clubs",
        href: "/clubs",
        label: "Clubs",
        icon: Users2,
        color: "text-violet-500",
        hint: "Join a community of interest",
    },
    leaderboard: {
        key: "leaderboard",
        href: "/leaderboard",
        label: "Leaderboard",
        icon: Crown,
        color: "text-yellow-500",
        hint: "Top reputation across campus",
    },
    friends: {
        key: "friends",
        href: "/friends",
        label: "Friends",
        icon: Users,
        color: "text-blue-500",
        hint: "Your connections and requests",
    },
    chats: {
        key: "chats",
        href: "/messages",
        label: "Chats",
        icon: MessageCircle,
        color: "text-pink-500",
        hint: "Direct messages",
    },
    bulletin: {
        key: "bulletin",
        href: "/services",
        label: "Bulletin Board",
        icon: BookOpen,
        color: "text-indigo-500",
        hint: "Tutoring and student services",
    },
    prep: {
        key: "prep",
        href: "/olympiad",
        label: "Prep",
        icon: GraduationCap,
        color: "text-emerald-500",
        hint: "Olympiad problem archive",
    },
    lostFound: {
        key: "lost-found",
        href: "/lost-found",
        label: "Lost & Found",
        icon: PackageSearch,
        color: "text-teal-500",
        hint: "Report or claim lost items",
    },
    career: {
        key: "career",
        href: "/career",
        label: "Career",
        icon: GraduationCap,
        color: "text-rose-500",
        hint: "Track your ЕНТ scores and targets",
        roles: CAREER_NAV_ROLES,
    },
    premium: {
        key: "premium",
        href: "/pricing",
        label: "Premium",
        icon: Sparkles,
        color: "text-amber-500",
        hint: "Unlock the AI mentor and extras",
    },
    guide: {
        key: "guide",
        href: "/guide",
        label: "Guide",
        icon: BookOpen,
        color: "text-indigo-500",
        hint: "Learn how Ulagat works",
    },
    achievements: {
        key: "achievements",
        href: "/profile/me",
        label: "Achievements",
        icon: Star,
        color: "text-amber-500",
        hint: "Your verified accomplishments",
    },
    cabinet: {
        key: "cabinet",
        href: "/profile/me",
        label: "My Cabinet",
        icon: Home,
        color: "text-violet-500",
        hint: "Your personal home base",
    },
} satisfies Record<string, NavDestination>;

/**
 * Grouped destinations for the "More" surfaces (desktop dropdown + mobile
 * overlay). Order and grouping match across both so users learn one map.
 */
export type NavGroup = {
    label: string;
    items: NavDestination[];
};

export const MORE_GROUPS: NavGroup[] = [
    {
        label: "Community",
        items: [NAV.leaderboard, NAV.friends, NAV.chats],
    },
    {
        label: "Resources",
        items: [NAV.bulletin, NAV.prep, NAV.lostFound, ...(FEATURES.career ? [NAV.career] : [])],
    },
    {
        label: "Help",
        items: [NAV.guide],
    },
];
