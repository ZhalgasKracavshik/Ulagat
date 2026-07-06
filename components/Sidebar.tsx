"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, Star, Sun, Moon, Sparkles, Settings } from "lucide-react";
import type { Profile } from "@/types";
import { useUIPhase } from "@/hooks/useUIPhase";
import { useT } from "@/contexts/LocaleContext";
import { useNavData } from "@/hooks/useNavData";
import { NAV, MORE_GROUPS, canSee, STAFF_ROLES, CHROMELESS_ROUTES, type NavDestination } from "@/lib/nav-config";
import { FEATURES } from "@/lib/features";

const PRIMARY = [NAV.home, NAV.schedule, NAV.announcements, NAV.events, NAV.clubs];

/**
 * Persistent left sidebar — the desktop (md+) navigation, replacing the old top
 * navbar + "More" dropdown. Mobile keeps the bottom tab bar (this is hidden
 * below md). Reuses `nav-config` + `useNavData` so nav items and chrome data
 * are not duplicated.
 */
export function Sidebar({
    initialUserId = null,
    initialProfile = null,
}: {
    initialUserId?: string | null;
    initialProfile?: (Profile & { reputation?: number }) | null;
}) {
    const { user, profile, pendingFriendRequests, pendingModerationCount, unreadAnnouncements, isPremium } = useNavData(
        initialUserId,
        initialProfile
    );
    const { phase, ready: phaseReady, toggle } = useUIPhase();
    const { t } = useT();
    const pathname = usePathname();

    if (CHROMELESS_ROUTES.includes(pathname)) return null;
    if (!user) return null;

    const role = profile?.role ?? null;
    const isStaff = role !== null && STAFF_ROLES.includes(role);

    const isActive = (href: string) =>
        pathname === href || (href !== "/home" && pathname.startsWith(href + "/"));

    const rowClass = (active: boolean) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
        }`;

    const badgeClass = "ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white";

    const NavRow = ({ item, badge }: { item: NavDestination; badge?: number }) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
            <Link href={item.href} className={rowClass(active)}>
                <Icon className={`h-4 w-4 shrink-0 ${active ? "" : item.color}`} />
                <span className="truncate">{t(`nav.${item.key}`)}</span>
                {badge ? <span className={badgeClass}>{badge}</span> : null}
            </Link>
        );
    };

    return (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-border bg-background">
            {/* Logo */}
            <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
                <Link href="/home">
                    <span className="font-black text-xl tracking-tight text-indigo-600">ULAGAT</span>
                </Link>
            </div>

            {/* Nav (scrollable) */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1">
                    {PRIMARY.map((item) => (
                        <NavRow
                            key={item.key}
                            item={item}
                            badge={item.key === "announcements" && unreadAnnouncements > 0 ? unreadAnnouncements : undefined}
                        />
                    ))}
                </div>

                {MORE_GROUPS.map((group) => {
                    const visible = group.items.filter((d) => canSee(d, role));
                    if (visible.length === 0) return null;
                    return (
                        <div key={group.label} className="mt-5 space-y-1">
                            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {t(`nav.${group.label.toLowerCase()}`)}
                            </p>
                            {visible.map((item) => (
                                <NavRow
                                    key={item.key}
                                    item={item}
                                    badge={item.key === "friends" && pendingFriendRequests > 0 ? pendingFriendRequests : undefined}
                                />
                            ))}
                        </div>
                    );
                })}

                {FEATURES.premium && (
                    <div className="mt-5 space-y-1">
                        <Link href={NAV.premium.href} className={rowClass(isActive(NAV.premium.href))}>
                            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                            <span className="truncate">{isPremium ? t("nav.premium") : t("nav.upgrade")}</span>
                        </Link>
                    </div>
                )}

                {isStaff && (
                    <div className="mt-5 space-y-1">
                        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("nav.staff")}
                        </p>
                        <Link href="/admin" className={rowClass(pathname.startsWith("/admin"))}>
                            <ShieldCheck className="h-4 w-4 shrink-0 text-indigo-600" />
                            <span className="truncate">{t("nav.moderation")}</span>
                            {pendingModerationCount > 0 && <span className={badgeClass}>{pendingModerationCount}</span>}
                        </Link>
                    </div>
                )}
            </nav>

            {/* Footer: reputation + mode toggle, settings, cabinet */}
            <div className="shrink-0 space-y-1 border-t border-border p-3">
                <div className="flex items-center gap-2 px-3 py-1.5">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{profile?.reputation || 0}</span>
                    <span className="text-xs text-muted-foreground">{t("home.points")}</span>
                    {phaseReady && (
                        <button
                            type="button"
                            onClick={toggle}
                            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title={phase === "express" ? "Express mode — tap for Full" : "Full mode — tap for Express"}
                            aria-label={phase === "express" ? "Switch to Full mode" : "Switch to Express mode"}
                        >
                            {phase === "express" ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-indigo-500" />}
                        </button>
                    )}
                </div>

                <Link href="/settings" className={rowClass(isActive("/settings"))}>
                    <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t("nav.settings")}</span>
                </Link>

                <Link
                    href="/profile/me"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                >
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback>{profile?.full_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{profile?.full_name || t("nav.me")}</p>
                        {role && <p className="truncate text-xs text-muted-foreground">{t(`common.roles.${role}`)}</p>}
                    </div>
                </Link>
            </div>
        </aside>
    );
}
