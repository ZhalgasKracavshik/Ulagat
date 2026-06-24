
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    ShieldCheck,
    Star,
    Sun,
    Moon,
    Sparkles,
    ChevronDown,
    Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUIPhase } from "@/hooks/useUIPhase";
import { useT } from "@/contexts/LocaleContext";
import { resolvePlan } from "@/lib/subscription-plan";
import { NAV, MORE_GROUPS, canSee, STAFF_ROLES } from "@/lib/nav-config";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar({
    initialUserId = null,
    initialProfile = null,
}: {
    initialUserId?: string | null;
    initialProfile?: (Profile & { reputation?: number }) | null;
}) {
    // Seed from server-resolved auth so the first paint shows the correct chrome
    // (avatar) instead of flashing the guest "Get started / Sign in" buttons.
    const [user, setUser] = useState<AuthUser | null>(
        initialUserId ? ({ id: initialUserId } as unknown as AuthUser) : null
    );
    const [profile, setProfile] = useState<(Profile & { reputation?: number }) | null>(initialProfile);
    const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
    const [pendingModerationCount, setPendingModerationCount] = useState(0);
    const [isPremium, setIsPremium] = useState(false);
    const supabase = createClient();
    const { phase, ready: phaseReady, toggle } = useUIPhase();
    const { t } = useT();
    const pathname = usePathname();

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const [{ data: profileData }, { count: friendshipCount }, { data: subscription }] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', user.id).single(),
                    supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee_id', user.id).eq('status', 'pending'),
                    supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).maybeSingle()
                ]);
                setProfile(profileData);
                setPendingFriendRequests(friendshipCount || 0);

                // Shared resolver: premium only when active and not expired.
                setIsPremium(resolvePlan(subscription ?? null, Date.now()) === 'premium');

                if (profileData?.role === 'admin' || profileData?.role === 'moderator') {
                    const [{ count: sCount }, { count: eCount }, { count: mCount }] = await Promise.all([
                        supabase.from('services').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                        supabase.from('study_materials').select('*', { count: 'exact', head: true }).eq('status', 'pending')
                    ]);
                    setPendingModerationCount((sCount || 0) + (eCount || 0) + (mCount || 0));
                }
            }
        };

        fetchUserData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    // Express (morning) mode shows a deliberately minimal nav: just the
    // glanceable essentials. Only collapse once the phase has resolved
    // client-side (phaseReady, avoids hydration mismatch) AND a user is
    // logged in — logged-out visitors always get the full marketing nav.
    const isExpress = phaseReady && phase === "express" && Boolean(user);
    const role = profile?.role ?? null;
    const isStaff = role !== null && STAFF_ROLES.includes(role);

    // Primary visible desktop links. Express collapses to the two essentials.
    const primaryFull = [NAV.schedule, NAV.announcements, NAV.events, NAV.clubs];
    const primaryExpress = [NAV.announcements, NAV.schedule];
    const primary = isExpress ? primaryExpress : primaryFull;

    // The landing and auth surfaces have their own full-bleed premium chrome
    // (fixed light palette) — don't overlay the themed app header on them.
    const CHROMELESS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
    if (CHROMELESS.includes(pathname)) return null;

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
                <div className="flex items-center gap-6">
                    <Link href={user ? "/home" : "/"} className="flex items-center">
                        <span className="font-black text-xl tracking-tight text-indigo-600">
                            ULAGAT
                        </span>
                    </Link>

                    {/* Desktop primary nav (md+). Mobile uses the bottom tab bar. */}
                    {user && (
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            {primary.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.key}
                                        href={item.href}
                                        className="group flex items-center gap-1.5 text-foreground/60 transition-colors hover:text-foreground"
                                    >
                                        <Icon className={`w-4 h-4 ${item.color}`} />
                                        <span>{t(`nav.${item.key}`)}</span>
                                    </Link>
                                );
                            })}

                            {/* "More" dropdown — everything that isn't a primary link,
                                grouped so it reads as a menu, not a wall of links. */}
                            {!isExpress && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="flex items-center gap-1 text-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md relative"
                                            aria-label="More destinations"
                                        >
                                            <span>{t("nav.more")}</span>
                                            <ChevronDown className="w-4 h-4" />
                                            {(pendingFriendRequests > 0 || (isStaff && pendingModerationCount > 0)) && (
                                                <span className="absolute -top-1.5 -right-2 flex h-2 w-2 rounded-full bg-red-500" />
                                            )}
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-64" align="start" sideOffset={8}>
                                        {MORE_GROUPS.map((group, gIdx) => {
                                            const visible = group.items.filter((d) => canSee(d, role));
                                            if (visible.length === 0) return null;
                                            return (
                                                <div key={group.label}>
                                                    {gIdx > 0 && <DropdownMenuSeparator />}
                                                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                        {t(`nav.${group.label.toLowerCase()}`)}
                                                    </DropdownMenuLabel>
                                                    {visible.map((item) => {
                                                        const Icon = item.icon;
                                                        const showFriendBadge =
                                                            item.key === "friends" && pendingFriendRequests > 0;
                                                        return (
                                                            <DropdownMenuItem key={item.key} asChild>
                                                                <Link href={item.href} className="cursor-pointer">
                                                                    <Icon className={`mr-2 h-4 w-4 ${item.color}`} />
                                                                    <span>{t(`nav.${item.key}`)}</span>
                                                                    {showFriendBadge && (
                                                                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                                                                            {pendingFriendRequests}
                                                                        </span>
                                                                    )}
                                                                </Link>
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}

                                        {/* Account group — Premium always available here. */}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                            {t("nav.account")}
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={NAV.premium.href} className="cursor-pointer">
                                                <Sparkles className="mr-2 h-4 w-4 text-amber-500" />
                                                <span>{isPremium ? t("nav.premium") : t("nav.upgrade")}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href="/settings" className="cursor-pointer">
                                                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                                <span>{t("nav.settings")}</span>
                                            </Link>
                                        </DropdownMenuItem>

                                        {/* Staff-only group. */}
                                        {isStaff && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                                    {t("nav.staff")}
                                                </DropdownMenuLabel>
                                                <DropdownMenuItem asChild>
                                                    <Link href="/admin" className="cursor-pointer font-medium">
                                                        <ShieldCheck className="mr-2 h-4 w-4 text-indigo-600" />
                                                        <span>{t("nav.moderation")}</span>
                                                        {pendingModerationCount > 0 && (
                                                            <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                                                                {pendingModerationCount}
                                                            </span>
                                                        )}
                                                    </Link>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </nav>
                    )}
                </div>

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    {user ? (
                        <>
                            {/* Upgrade/Premium pill — subtle, lg+ only (also in More menu). */}
                            <Link
                                href={NAV.premium.href}
                                className={
                                    isPremium
                                        ? "hidden lg:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-700"
                                        : "hidden lg:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                                }
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{isPremium ? t("nav.premium") : t("nav.upgrade")}</span>
                            </Link>

                            {/* Reputation pill */}
                            <div className="hidden sm:flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-sm font-bold text-amber-700">{profile?.reputation || 0}</span>
                            </div>

                            {/* Express/Full mode toggle. Desktop (md+) only — on
                                mobile this lives in the Settings page instead.
                                Only show after the phase resolves client-side to
                                avoid a hydration flash. */}
                            {phaseReady && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hidden md:inline-flex h-9 w-9"
                                    onClick={toggle}
                                    title={
                                        phase === "express"
                                            ? "Express mode (morning) — tap for Full mode"
                                            : "Full mode — tap for Express (morning) mode"
                                    }
                                    aria-label={
                                        phase === "express"
                                            ? "Switch to Full mode"
                                            : "Switch to Express mode"
                                    }
                                >
                                    {phase === "express" ? (
                                        <Sun className="h-5 w-5 text-amber-500" />
                                    ) : (
                                        <Moon className="h-5 w-5 text-indigo-500" />
                                    )}
                                </Button>
                            )}

                            {/* Mobile-only Settings gear (replaces the Sun/Moon
                                toggle below md). The express/full toggle and theme
                                live inside the Settings page. */}
                            <Link
                                href="/settings"
                                aria-label={t("nav.settings")}
                                title={t("nav.settings")}
                                className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Settings className="h-5 w-5" />
                            </Link>

                            {/* Avatar → personal cabinet (direct link, no dropdown).
                                Sign-out now lives inside the cabinet page. Hidden on
                                mobile where the bottom bar carries the "Me" tab. */}
                            <Link
                                href="/profile/me"
                                aria-label="Open my cabinet"
                                className="hidden md:inline-flex rounded-full ring-2 ring-transparent transition hover:ring-indigo-200 focus-visible:outline-none focus-visible:ring-indigo-400"
                            >
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                                    <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    {t('auth.signIn')}
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button size="sm">
                                    {t('auth.getStarted')}
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
