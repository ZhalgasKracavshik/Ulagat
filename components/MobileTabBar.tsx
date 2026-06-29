"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolvePlan } from "@/lib/subscription-plan";
import {
    NAV,
    MORE_GROUPS,
    canSee,
    STAFF_ROLES,
    type NavDestination,
} from "@/lib/nav-config";
import { FEATURES } from "@/lib/features";
import {
    Home,
    CalendarDays,
    Megaphone,
    LayoutGrid,
    X,
    Sparkles,
    ShieldCheck,
    LogOut,
    Settings,
} from "lucide-react";
import { useT } from "@/contexts/LocaleContext";

/**
 * Mobile-only bottom tab bar. Replaces the old hamburger menu. Renders only
 * when a user is logged in. Five tabs: Home, Schedule, Announcements, a "More"
 * overlay listing every remaining destination, and "Me" (the personal cabinet).
 *
 * It does its own lightweight auth/profile fetch (mirroring the Navbar) so it
 * is fully self-contained.
 */
export function MobileTabBar({
    initialUserId = null,
    initialProfile = null,
}: {
    initialUserId?: string | null;
    initialProfile?: Profile | null;
}) {
    // Seed from server-resolved auth so the bar renders immediately for logged-in
    // users (no flash / late mount).
    const [user, setUser] = useState<AuthUser | null>(
        initialUserId ? ({ id: initialUserId } as unknown as AuthUser) : null
    );
    const [profile, setProfile] = useState<Profile | null>(initialProfile);
    const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
    const [pendingModerationCount, setPendingModerationCount] = useState(0);
    const [isPremium, setIsPremium] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const supabase = createClient();
    const pathname = usePathname();
    const { t } = useT();

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const [{ data: profileData }, { count: friendshipCount }, { data: subscription }] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee_id', user.id).eq('status', 'pending'),
                    supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).maybeSingle(),
                ]);
                setProfile(profileData);
                setPendingFriendRequests(friendshipCount || 0);
                setIsPremium(resolvePlan(subscription ?? null, Date.now()) === 'premium');

                if (profileData?.role === 'admin' || profileData?.role === 'moderator') {
                    const [{ count: sCount }, { count: eCount }, { count: mCount }] = await Promise.all([
                        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                        supabase.from('study_materials').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                    ]);
                    setPendingModerationCount((sCount || 0) + (eCount || 0) + (mCount || 0));
                }
            } else {
                setProfile(null);
            }
        };

        fetchUserData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Seed + direct fetchUserData() cover first load; skip the synchronous
            // INITIAL_SESSION event to avoid a duplicate fetch cascade on mount.
            if (_event === 'INITIAL_SESSION') return;
            setUser(session?.user ?? null);
            if (!session) {
                setProfile(null);
                setPendingFriendRequests(0);
                setPendingModerationCount(0);
            } else {
                fetchUserData();
            }
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Lock body scroll while the More overlay is open.
    useEffect(() => {
        if (moreOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [moreOpen]);

    // Close the overlay whenever navigation occurs.
    useEffect(() => {
        setMoreOpen(false);
    }, [pathname]);

    if (!user) return null;

    // Focus mode: on editor / content-creation screens hide the bottom bar so
    // the task owns the screen (one screen, one task). Top-level browsing keeps
    // the bar; these are deliberate "I'm doing one thing now" routes.
    const FOCUS_ROUTES = [
        "/schedule/manage",
        "/schedule/substitutions",
        "/announcements/new",
        "/events/new",
        "/clubs/new",
        "/lost-found/new",
        "/olympiad/new",
        "/services/new",
        "/profile/edit",
    ];
    if (FOCUS_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
        return null;
    }

    const role = profile?.role ?? null;
    const isStaff = role !== null && STAFF_ROLES.includes(role);
    const hasMoreBadge = pendingFriendRequests > 0 || (isStaff && pendingModerationCount > 0);

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(href + "/");

    async function handleSignOut() {
        await supabase.auth.signOut();
        window.location.href = "/";
    }

    const tabs: { key: string; href: string; labelKey: string; icon: typeof Home; color: string }[] = [
        { key: "home", href: "/home", labelKey: "nav.home", icon: Home, color: "text-indigo-600" },
        { key: "schedule", href: "/schedule", labelKey: "nav.schedule", icon: CalendarDays, color: "text-sky-500" },
        { key: "announcements", href: "/announcements", labelKey: "nav.news", icon: Megaphone, color: "text-indigo-500" },
    ];

    return (
        <>
            <nav
                className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
                aria-label="Primary"
            >
                <div className="flex items-stretch justify-around h-16">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = isActive(tab.href);
                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                aria-current={active ? "page" : undefined}
                            >
                                <Icon className={`w-5 h-5 ${active ? tab.color : "text-muted-foreground"}`} />
                                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                                    {t(tab.labelKey)}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More — opens the full-screen overlay. */}
                    <button
                        type="button"
                        onClick={() => setMoreOpen(true)}
                        className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-haspopup="dialog"
                        aria-expanded={moreOpen}
                        aria-label={t("nav.ariaMore")}
                    >
                        <LayoutGrid className="w-5 h-5" />
                        <span>{t("nav.more")}</span>
                        {hasMoreBadge && (
                            <span className="absolute top-2.5 right-[calc(50%-1.25rem)] flex h-2 w-2 rounded-full bg-red-500" />
                        )}
                    </button>

                    {/* Me — personal cabinet. */}
                    <Link
                        href="/profile/me"
                        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        aria-current={isActive("/profile/me") ? "page" : undefined}
                        aria-label={t("nav.ariaCabinet")}
                    >
                        <Avatar className={`h-6 w-6 ring-2 ${isActive("/profile/me") ? "ring-indigo-400" : "ring-transparent"}`}>
                            <AvatarImage src={profile?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">{profile?.full_name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <span className={isActive("/profile/me") ? "text-foreground" : "text-muted-foreground"}>
                            {t("nav.me")}
                        </span>
                    </Link>
                </div>
            </nav>

            {/* Full-screen More overlay */}
            {moreOpen && (
                <div
                    className="md:hidden fixed inset-0 z-[60] flex flex-col bg-background animate-in fade-in-0 duration-150"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("nav.ariaAllSections")}
                >
                    <div className="flex items-center justify-between border-b px-4 h-14 shrink-0">
                        <span className="font-black text-lg tracking-tight text-indigo-600">ULAGAT</span>
                        <button
                            type="button"
                            onClick={() => setMoreOpen(false)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={t("nav.ariaCloseMenu")}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                        {/* Profile mini-header → cabinet */}
                        <Link
                            href="/profile/me"
                            className="flex items-center gap-3 rounded-xl border bg-card p-3"
                        >
                            <Avatar className="h-11 w-11">
                                <AvatarImage src={profile?.avatar_url ?? undefined} />
                                <AvatarFallback>{profile?.full_name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{profile?.full_name || t("nav.myCabinet")}</p>
                                <p className="text-xs text-muted-foreground">
                                    {profile?.role ? t(`common.roles.${profile.role}`) : t("hints.cabinet")}
                                </p>
                            </div>
                        </Link>

                        {MORE_GROUPS.map((group) => {
                            const visible = group.items.filter((d) => canSee(d, role));
                            if (visible.length === 0) return null;
                            return (
                                <MoreSection
                                    key={group.label}
                                    label={t(`nav.${group.label.toLowerCase()}`)}
                                    items={visible}
                                    pendingFriendRequests={pendingFriendRequests}
                                    t={t}
                                />
                            );
                        })}

                        {/* Account */}
                        <section className="space-y-2">
                            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                                {t("nav.account")}
                            </h2>
                            <div className="grid grid-cols-2 gap-2">
                                {FEATURES.premium && (
                                    <OverlayTile
                                        href={NAV.premium.href}
                                        label={isPremium ? t("nav.premium") : t("nav.upgrade")}
                                        icon={Sparkles}
                                        color="text-amber-500"
                                    />
                                )}
                                <OverlayTile
                                    href="/settings"
                                    label={t("nav.settings")}
                                    icon={Settings}
                                    color="text-muted-foreground"
                                />
                            </div>
                        </section>

                        {/* Staff */}
                        {isStaff && (
                            <section className="space-y-2">
                                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                                    {t("nav.staff")}
                                </h2>
                                <div className="grid grid-cols-2 gap-2">
                                    <OverlayTile
                                        href="/admin"
                                        label={t("nav.moderation")}
                                        icon={ShieldCheck}
                                        color="text-indigo-600"
                                        badge={pendingModerationCount > 0 ? pendingModerationCount : undefined}
                                    />
                                </div>
                            </section>
                        )}

                        {/* Sign out */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={handleSignOut}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                            >
                                <LogOut className="w-4 h-4" />
                                {t("nav.signOut")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function MoreSection({
    label,
    items,
    pendingFriendRequests,
    t,
}: {
    label: string;
    items: NavDestination[];
    pendingFriendRequests: number;
    t: (key: string) => string;
}) {
    return (
        <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1">
                {label}
            </h2>
            <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                    <OverlayTile
                        key={item.key}
                        href={item.href}
                        label={t(`nav.${item.key}`)}
                        icon={item.icon}
                        color={item.color}
                        badge={
                            item.key === "friends" && pendingFriendRequests > 0
                                ? pendingFriendRequests
                                : undefined
                        }
                    />
                ))}
            </div>
        </section>
    );
}

function OverlayTile({
    href,
    label,
    icon: Icon,
    color,
    badge,
}: {
    href: string;
    label: string;
    icon: typeof Home;
    color: string;
    badge?: number;
}) {
    return (
        <Link
            href={href}
            className="relative flex items-center gap-3 rounded-xl border bg-card p-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <Icon className={`w-5 h-5 shrink-0 ${color}`} />
            <span className="truncate">{label}</span>
            {badge !== undefined && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                    {badge}
                </span>
            )}
        </Link>
    );
}
