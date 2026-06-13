"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import {
    Calendar,
    Search,
    ArrowRight,
    ArrowUpRight,
    Star,
    GraduationCap,
    Megaphone,
    Pin,
    CalendarDays,
    MapPin,
    User as UserIcon,
    Repeat,
    Moon,
    Sparkles,
    Trophy,
    PlusCircle,
} from "lucide-react";
import { CategoryBadge } from "@/components/announcements/CategoryBadge";
import { effectiveLesson, type DayCell } from "@/components/schedule/types";
import { getPeriodTime } from "@/lib/schedule/bells";
import { useT } from "@/hooks/useT";
import type { Announcement, Profile, SubstitutionType, UserRole } from "@/types";

type DashboardEvent = {
    id: string;
    title: string;
    event_date: string;
    location: string | null;
};

type DashboardService = {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string | null;
    image_url: string | null;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
};

export type FullDashboardData = {
    profile: Profile | null;
    totalPoints: number;
    events: DashboardEvent[];
    services: DashboardService[];
    announcements: Announcement[];
    /** Today's 8 period cells with substitutions attached (empty = no school today). */
    todayCells: DayCell[];
    /** Whether the user has any lesson today at all. */
    hasSchoolToday: boolean;
    /** Whether the user has a grade + class letter configured. */
    hasClassSet: boolean;
    /** Resolved class label, e.g. "7А", or null if none set. */
    classLabel: string | null;
    /** ISO day of week in Almaty: 1 = Monday … 7 = Sunday. */
    todayDow: number;
};

const ROLE_LABEL_KEY: Record<UserRole, string> = {
    student: "home.roleStudent",
    teacher: "home.roleTeacher",
    admin: "home.roleAdmin",
    moderator: "home.roleModerator",
    parent: "home.roleParent",
    parliament: "home.roleParliament",
};

export function FullDashboard({ data }: { data: FullDashboardData }) {
    const { t } = useT();
    const {
        profile,
        totalPoints,
        events,
        services,
        announcements,
        todayCells,
        hasSchoolToday,
        hasClassSet,
        classLabel,
        todayDow,
    } = data;

    const role: UserRole = profile?.role ?? "student";
    const firstName = profile?.full_name?.split(" ")[0] ?? "";
    const isStaff = role === "admin" || role === "moderator";

    // Lessons (or substitutions) that actually occupy a slot today.
    const activeCells = todayCells.filter(
        (c) => c.lesson !== null || c.substitution !== null,
    );
    const substitutionCount = todayCells.filter(
        (c) => c.substitution !== null,
    ).length;

    const weekdayLabel = t(`home.weekday${todayDow}`);

    const quickActions = [
        { href: "/services", icon: Search, label: t("nav.bulletin"), color: "text-indigo-600", bg: "bg-indigo-50", bgDark: "dark:bg-indigo-950/40", roles: ["student", "teacher", "admin", "moderator", "parent", "parliament"] },
        { href: "/events", icon: Trophy, label: t("nav.events"), color: "text-amber-500", bg: "bg-amber-50", bgDark: "dark:bg-amber-950/40", roles: ["student", "teacher", "admin", "moderator", "parent", "parliament"] },
        { href: "/olympiad", icon: GraduationCap, label: t("nav.prep"), color: "text-emerald-500", bg: "bg-emerald-50", bgDark: "dark:bg-emerald-950/40", roles: ["student", "teacher", "admin", "moderator", "parliament"] },
        { href: "/leaderboard", icon: Trophy, label: t("nav.leaderboard"), color: "text-yellow-500", bg: "bg-yellow-50", bgDark: "dark:bg-yellow-950/40", roles: ["student", "teacher", "admin", "moderator", "parent", "parliament"] },
        { href: "/services/new", icon: PlusCircle, label: t("nav.bulletin"), color: "text-violet-500", bg: "bg-violet-50", bgDark: "dark:bg-violet-950/40", roles: ["teacher", "admin", "moderator"] },
    ].filter((action) => action.roles.includes(role));

    return (
        <div className="container mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8">
            {/* Compact greeting bar — slim, light, ~1/4 of the old hero */}
            <header className="flex items-center gap-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/30 px-4 py-3.5 md:px-5">
                <Avatar className="h-12 w-12 md:h-14 md:w-14 border border-indigo-100 dark:border-indigo-900 shadow-sm">
                    <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-card text-indigo-700 dark:text-indigo-300 font-semibold text-lg">
                        {firstName?.[0] ?? "U"}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg md:text-xl font-bold tracking-tight text-foreground">
                        {t("home.hello", { name: firstName })}
                    </h1>
                    <div className="mt-1 flex items-center gap-2.5 text-sm text-muted-foreground">
                        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
                            {t(ROLE_LABEL_KEY[role])}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {totalPoints}
                            <span className="hidden sm:inline text-muted-foreground font-normal">
                                {t("home.points")}
                            </span>
                        </span>
                    </div>
                </div>
                {isStaff && (
                    <Link
                        href="/admin"
                        className="hidden sm:inline-flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-sm transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                        {t("home.adminPanel")}
                    </Link>
                )}
            </header>

            {/* Today's schedule — the hero block */}
            <section className="mt-6">
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-500">
                            <CalendarDays className="h-5 w-5" />
                        </span>
                        <div className="leading-tight">
                            <h2 className="text-lg font-bold text-foreground">
                                {t("home.todaySchedule")}
                            </h2>
                            <p className="text-xs font-medium text-muted-foreground">
                                {classLabel
                                    ? `${t("home.classLabel", { label: classLabel })} · ${weekdayLabel}`
                                    : weekdayLabel}
                            </p>
                        </div>
                    </div>
                    {hasClassSet && (
                        <Link
                            href="/schedule"
                            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700"
                        >
                            {t("home.fullSchedule")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    )}
                </div>

                {!hasClassSet ? (
                    /* No class configured — gentle onboarding prompt */
                    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-sky-200 dark:border-sky-900 bg-sky-50/50 dark:bg-sky-950/30 p-6 sm:flex-row sm:items-center">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card text-sky-500 shadow-sm">
                            <GraduationCap className="h-6 w-6" />
                        </span>
                        <p className="flex-1 text-sm text-muted-foreground">
                            {t("home.setClassPrompt")}
                        </p>
                        <Link
                            href="/settings"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
                        >
                            {t("home.setClassCta")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : !hasSchoolToday || activeCells.length === 0 ? (
                    /* Class set but no lessons today */
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-sm">
                        <Moon className="h-8 w-8 text-indigo-300" />
                        <p className="text-base font-semibold text-foreground">
                            {t("home.noLessonsToday")}
                        </p>
                        <p className="text-sm text-muted-foreground">{t("home.noLessonsHint")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {substitutionCount > 0 && (
                            <Link
                                href="/schedule"
                                className="flex items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 px-4 py-2.5 text-orange-800 dark:text-orange-300 transition-colors hover:bg-orange-100 dark:hover:bg-orange-950/60"
                            >
                                <Repeat className="h-4 w-4 shrink-0" />
                                <span className="text-sm font-semibold">
                                    {t(
                                        substitutionCount > 1
                                            ? "home.changesTodayPlural"
                                            : "home.changesToday",
                                        { count: substitutionCount },
                                    )}
                                </span>
                                <ArrowRight className="ml-auto h-4 w-4 shrink-0" />
                            </Link>
                        )}

                        <ol className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                            {activeCells.map((cell, idx) => {
                                const eff = effectiveLesson(cell);
                                const time = getPeriodTime(cell.period);
                                return (
                                    <li
                                        key={cell.period}
                                        className={`flex items-center gap-4 px-4 py-3.5 ${
                                            idx > 0 ? "border-t border-border" : ""
                                        }`}
                                    >
                                        {/* Period + time rail */}
                                        <div className="flex w-12 shrink-0 flex-col items-center text-center">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-300 dark:text-slate-600">
                                                {cell.period}
                                            </span>
                                            {time && (
                                                <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                                    {time.start}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            {eff.cancelled ? (
                                                <span className="font-semibold text-muted-foreground line-through">
                                                    {eff.subject ?? t("home.freePeriod")}
                                                </span>
                                            ) : (
                                                <>
                                                    <p className="truncate font-semibold text-foreground">
                                                        {eff.subject ?? t("home.freePeriod")}
                                                    </p>
                                                    {(eff.room || eff.teacher) && (
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                            {eff.room && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="h-3 w-3" />
                                                                    {eff.room}
                                                                </span>
                                                            )}
                                                            {eff.teacher && (
                                                                <span className="flex min-w-0 items-center gap-1">
                                                                    <UserIcon className="h-3 w-3 shrink-0" />
                                                                    <span className="truncate">
                                                                        {eff.teacher}
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {cell.substitution && (
                                            <span className="shrink-0">
                                                <SubChip
                                                    type={cell.substitution.type}
                                                    label={t(SUB_CHIP[cell.substitution.type].labelKey)}
                                                />
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                )}
            </section>

            {/* Quick actions — compact, signature-coloured tiles */}
            <section className="mt-7">
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {t("home.quickActions")}
                </h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-slate-200 dark:hover:border-slate-700 hover:bg-muted"
                        >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.bg} ${action.bgDark} ${action.color}`}>
                                <action.icon className="h-4 w-4" />
                            </span>
                            <span className="truncate text-sm font-semibold text-foreground">
                                {action.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Announcements — compact list */}
            <section className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                        <Megaphone className="h-4 w-4 text-indigo-500" />
                        {t("home.announcements")}
                    </h2>
                    <Link
                        href="/announcements"
                        className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                        {t("home.viewAll")}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {announcements.length > 0 ? (
                    <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {announcements.map((a, idx) => (
                            <li key={a.id} className={idx > 0 ? "border-t border-border" : ""}>
                                <Link
                                    href="/announcements"
                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted"
                                >
                                    {a.pinned && (
                                        <Pin className="h-4 w-4 shrink-0 text-indigo-500" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {a.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {new Date(a.created_at).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <CategoryBadge category={a.category} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                        {t("home.noAnnouncements")}
                    </p>
                )}
            </section>

            {/* Events + services — lower priority, lighter */}
            <div className="mt-7 grid gap-6 lg:grid-cols-2">
                {/* Upcoming events */}
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                            <Calendar className="h-4 w-4 text-amber-500" />
                            {t("home.upcomingEvents")}
                        </h2>
                        <Link
                            href="/events"
                            className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
                        >
                            {t("home.viewAll")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {events.length > 0 ? (
                        <ul className="space-y-2">
                            {events.map((event) => (
                                <li key={event.id}>
                                    <Link
                                        href={`/events/${event.id}`}
                                        className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                                            <span className="text-[9px] font-bold uppercase leading-none">
                                                {new Date(event.event_date).toLocaleString(undefined, { month: "short" })}
                                            </span>
                                            <span className="text-lg font-bold leading-tight tabular-nums">
                                                {new Date(event.event_date).getDate()}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300">
                                                {event.title}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {event.location || t("home.online")}
                                            </p>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-amber-500" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                            {t("home.noEvents")}
                        </p>
                    )}
                </section>

                {/* Featured services */}
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            {t("home.featuredServices")}
                        </h2>
                        <Link
                            href="/services"
                            className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
                        >
                            {t("home.viewAll")}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {services.length > 0 ? (
                        <ul className="space-y-2">
                            {services.map((service) => (
                                <li key={service.id}>
                                    <Link
                                        href={`/services/${service.id}`}
                                        className="group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-muted"
                                    >
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                                            {service.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={service.image_url}
                                                    alt={service.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-200 dark:text-slate-600">
                                                    {service.category?.[0] ?? service.title[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-300">
                                                {service.title}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {service.profiles?.full_name}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-sm font-bold text-emerald-600">
                                            {service.price > 0 ? `${service.price} ₸` : t("home.free")}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                            {t("home.noServices")}
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

/** Small inline substitution chip (orange/red/blue by type). */
const SUB_CHIP: Record<SubstitutionType, { labelKey: string; cls: string }> = {
    substitution: { labelKey: "home.subSub", cls: "bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300" },
    cancellation: { labelKey: "home.subCancelled", cls: "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300" },
    room_change: { labelKey: "home.subRoom", cls: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300" },
};

function SubChip({ type, label }: { type: SubstitutionType; label: string }) {
    const s = SUB_CHIP[type];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
            <Repeat className="h-3 w-3" />
            {label}
        </span>
    );
}
