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
        { href: "/services", icon: Search, label: t("nav.bulletin"), color: "text-indigo-600", bg: "bg-indigo-50", roles: ["student", "teacher", "admin", "moderator", "parent", "parliament"] },
        { href: "/events", icon: Trophy, label: t("nav.events"), color: "text-amber-500", bg: "bg-amber-50", roles: ["student", "teacher", "admin", "moderator", "parent", "parliament"] },
        { href: "/olympiad", icon: GraduationCap, label: t("nav.prep"), color: "text-emerald-500", bg: "bg-emerald-50", roles: ["student", "teacher", "admin", "moderator", "parliament"] },
        { href: "/leaderboard", icon: Trophy, label: t("nav.leaderboard"), color: "text-yellow-500", bg: "bg-yellow-50", roles: ["student", "teacher", "admin", "moderator", "parent", "parliament"] },
        { href: "/services/new", icon: PlusCircle, label: t("nav.bulletin"), color: "text-violet-500", bg: "bg-violet-50", roles: ["teacher", "admin", "moderator"] },
    ].filter((action) => action.roles.includes(role));

    return (
        <div className="container mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8">
            {/* Compact greeting bar — slim, light, ~1/4 of the old hero */}
            <header className="flex items-center gap-4 rounded-2xl bg-indigo-50/40 px-4 py-3.5 md:px-5">
                <Avatar className="h-12 w-12 md:h-14 md:w-14 border border-indigo-100 shadow-sm">
                    <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-white text-indigo-700 font-semibold text-lg">
                        {firstName?.[0] ?? "U"}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-lg md:text-xl font-bold tracking-tight text-slate-900">
                        {t("home.hello", { name: firstName })}
                    </h1>
                    <div className="mt-1 flex items-center gap-2.5 text-sm text-slate-500">
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700 shadow-sm">
                            {t(ROLE_LABEL_KEY[role])}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {totalPoints}
                            <span className="hidden sm:inline text-slate-400 font-normal">
                                {t("home.points")}
                            </span>
                        </span>
                    </div>
                </div>
                {isStaff && (
                    <Link
                        href="/admin"
                        className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50"
                    >
                        {t("home.adminPanel")}
                    </Link>
                )}
            </header>

            {/* Today's schedule — the hero block */}
            <section className="mt-6">
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                            <CalendarDays className="h-5 w-5" />
                        </span>
                        <div className="leading-tight">
                            <h2 className="text-lg font-bold text-slate-900">
                                {t("home.todaySchedule")}
                            </h2>
                            <p className="text-xs font-medium text-slate-400">
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
                    <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-6 sm:flex-row sm:items-center">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-sky-500 shadow-sm">
                            <GraduationCap className="h-6 w-6" />
                        </span>
                        <p className="flex-1 text-sm text-slate-600">
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
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-white px-6 py-10 text-center shadow-sm">
                        <Moon className="h-8 w-8 text-indigo-300" />
                        <p className="text-base font-semibold text-slate-700">
                            {t("home.noLessonsToday")}
                        </p>
                        <p className="text-sm text-slate-400">{t("home.noLessonsHint")}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {substitutionCount > 0 && (
                            <Link
                                href="/schedule"
                                className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-orange-800 transition-colors hover:bg-orange-100"
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

                        <ol className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                            {activeCells.map((cell, idx) => {
                                const eff = effectiveLesson(cell);
                                const time = getPeriodTime(cell.period);
                                return (
                                    <li
                                        key={cell.period}
                                        className={`flex items-center gap-4 px-4 py-3.5 ${
                                            idx > 0 ? "border-t border-slate-100" : ""
                                        }`}
                                    >
                                        {/* Period + time rail */}
                                        <div className="flex w-12 shrink-0 flex-col items-center text-center">
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                                                {cell.period}
                                            </span>
                                            {time && (
                                                <span className="text-xs font-semibold tabular-nums text-slate-500">
                                                    {time.start}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            {eff.cancelled ? (
                                                <span className="font-semibold text-slate-400 line-through">
                                                    {eff.subject ?? t("home.freePeriod")}
                                                </span>
                                            ) : (
                                                <>
                                                    <p className="truncate font-semibold text-slate-900">
                                                        {eff.subject ?? t("home.freePeriod")}
                                                    </p>
                                                    {(eff.room || eff.teacher) && (
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
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
                                                <SubChip type={cell.substitution.type} />
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
                <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {t("home.quickActions")}
                </h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {quickActions.map((action) => (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50"
                        >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${action.bg} ${action.color}`}>
                                <action.icon className="h-4 w-4" />
                            </span>
                            <span className="truncate text-sm font-semibold text-slate-700">
                                {action.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Announcements — compact list */}
            <section className="mt-7">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
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
                    <ul className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                        {announcements.map((a, idx) => (
                            <li key={a.id} className={idx > 0 ? "border-t border-slate-100" : ""}>
                                <Link
                                    href="/announcements"
                                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                                >
                                    {a.pinned && (
                                        <Pin className="h-4 w-4 shrink-0 text-indigo-500" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-900">
                                            {a.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
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
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
                        {t("home.noAnnouncements")}
                    </p>
                )}
            </section>

            {/* Events + services — lower priority, lighter */}
            <div className="mt-7 grid gap-6 lg:grid-cols-2">
                {/* Upcoming events */}
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
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
                                        className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 transition-colors hover:bg-slate-50"
                                    >
                                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                                            <span className="text-[9px] font-bold uppercase leading-none">
                                                {new Date(event.event_date).toLocaleString(undefined, { month: "short" })}
                                            </span>
                                            <span className="text-lg font-bold leading-tight tabular-nums">
                                                {new Date(event.event_date).getDate()}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-amber-700">
                                                {event.title}
                                            </p>
                                            <p className="truncate text-xs text-slate-400">
                                                {event.location || t("home.online")}
                                            </p>
                                        </div>
                                        <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-amber-500" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
                            {t("home.noEvents")}
                        </p>
                    )}
                </section>

                {/* Featured services */}
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
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
                                        className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2.5 transition-colors hover:bg-slate-50"
                                    >
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                            {service.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={service.image_url}
                                                    alt={service.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-200">
                                                    {service.category?.[0] ?? service.title[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-violet-700">
                                                {service.title}
                                            </p>
                                            <p className="truncate text-xs text-slate-400">
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
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-400">
                            {t("home.noServices")}
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}

/** Small inline substitution chip (orange/red/blue by type). */
const SUB_CHIP: Record<SubstitutionType, { label: string; cls: string }> = {
    substitution: { label: "Sub", cls: "bg-orange-100 text-orange-700" },
    cancellation: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
    room_change: { label: "Room", cls: "bg-blue-100 text-blue-700" },
};

function SubChip({ type }: { type: SubstitutionType }) {
    const s = SUB_CHIP[type];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>
            <Repeat className="h-3 w-3" />
            {s.label}
        </span>
    );
}
