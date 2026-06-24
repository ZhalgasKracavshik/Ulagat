"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
    ArrowRight,
    CalendarDays,
    Megaphone,
    Trophy,
    Users2,
    Crown,
    GraduationCap,
    Users,
    HeartHandshake,
    ShieldCheck,
    BookOpen,
    Repeat,
    MapPin,
    Sparkles,
    Star,
    type LucideIcon,
} from "lucide-react";
import { useT } from "@/hooks/useT";

/**
 * Premium, animated, light "EdTech" landing. Intentionally uses a fixed light
 * palette (not the app's theme tokens) so the marketing front door stays bright
 * regardless of the in-app dark-mode toggle. Framer Motion entrance + scroll
 * reveals, all gated on prefers-reduced-motion.
 */

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};
const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

type Feature = { icon: LucideIcon; titleKey: string; descKey: string; color: string; tint: string };

const FEATURES: Feature[] = [
    { icon: CalendarDays, titleKey: "landing.f1Title", descKey: "landing.f1Desc", color: "text-sky-600", tint: "bg-sky-100" },
    { icon: Megaphone, titleKey: "landing.f2Title", descKey: "landing.f2Desc", color: "text-indigo-600", tint: "bg-indigo-100" },
    { icon: Trophy, titleKey: "landing.f3Title", descKey: "landing.f3Desc", color: "text-amber-600", tint: "bg-amber-100" },
    { icon: Users2, titleKey: "landing.f4Title", descKey: "landing.f4Desc", color: "text-violet-600", tint: "bg-violet-100" },
    { icon: Crown, titleKey: "landing.f5Title", descKey: "landing.f5Desc", color: "text-yellow-600", tint: "bg-yellow-100" },
    { icon: GraduationCap, titleKey: "landing.f6Title", descKey: "landing.f6Desc", color: "text-rose-600", tint: "bg-rose-100" },
];

const AUDIENCES: { icon: LucideIcon; titleKey: string; descKey: string; color: string; tint: string }[] = [
    { icon: Users, titleKey: "landing.forStudents", descKey: "landing.forStudentsDesc", color: "text-sky-600", tint: "bg-sky-100" },
    { icon: HeartHandshake, titleKey: "landing.forParents", descKey: "landing.forParentsDesc", color: "text-rose-600", tint: "bg-rose-100" },
    { icon: ShieldCheck, titleKey: "landing.forStaff", descKey: "landing.forStaffDesc", color: "text-emerald-600", tint: "bg-emerald-100" },
];

const PRIMARY_BTN =
    "inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-7 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:shadow-xl hover:shadow-sky-500/30 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";
const SECONDARY_BTN =
    "inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-200 bg-white px-7 text-base font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2";

export function Landing({ authed }: { authed: boolean }) {
    const { t } = useT();
    const reduce = useReducedMotion();

    // Render the accent word in brand colour without gradient body text.
    const title = t("landing.title");
    const accent = t("landing.titleAccent");
    const [before, after] = accent && title.includes(accent) ? title.split(accent) : [title, ""];

    // Parent orchestration props, disabled under reduced motion. Children always
    // carry `variants={fadeUp}`; with no parent trigger they simply render visible.
    const orchestrateOnLoad = reduce ? {} : { variants: container, initial: "hidden" as const, animate: "show" as const };
    const orchestrateOnView = reduce
        ? {}
        : { variants: container, initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, margin: "-60px" } };
    const item = reduce ? {} : { variants: fadeUp };
    const float = reduce ? {} : { animate: { y: [0, -10, 0] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const } };
    const floatSlow = reduce ? {} : { animate: { y: [0, 12, 0] }, transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const } };

    return (
        <div className="relative overflow-hidden bg-white text-slate-900">
            {/* Soft light EdTech mesh — decorative. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-50/80 via-white to-white" />
                <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-sky-300/40 blur-3xl" />
                <div className="absolute -top-10 right-[-6rem] h-[420px] w-[420px] rounded-full bg-cyan-200/50 blur-3xl" />
                <div className="absolute top-[28rem] left-1/3 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl" />
                <div className="absolute top-[20rem] right-1/4 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />
            </div>

            {/* ---- Hero ---- */}
            <section className="container mx-auto max-w-6xl px-4 md:px-6 pt-14 pb-12 md:pt-20 md:pb-20">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    {/* Copy */}
                    <motion.div {...orchestrateOnLoad} className="text-center lg:text-left">
                        <motion.span
                            {...item}
                            className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-sky-700 shadow-sm backdrop-blur"
                        >
                            <span className="flex h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
                            {t("landing.badge")}
                        </motion.span>

                        <motion.h1
                            {...item}
                            className="mt-6 text-balance text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900"
                        >
                            {before}
                            {after !== "" && (
                                <span className="bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent">{accent}</span>
                            )}
                            {after}
                        </motion.h1>

                        <motion.p {...item} className="mx-auto lg:mx-0 mt-5 max-w-xl text-pretty text-base sm:text-lg leading-relaxed text-slate-600">
                            {t("landing.subtitle")}
                        </motion.p>

                        <motion.div {...item} className="mt-8 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">
                            {authed ? (
                                <Link href="/home" className={PRIMARY_BTN}>
                                    {t("landing.ctaDashboard")}
                                    <ArrowRight className="h-5 w-5" aria-hidden />
                                </Link>
                            ) : (
                                <>
                                    <Link href="/register" className={PRIMARY_BTN}>
                                        {t("landing.ctaStart")}
                                        <ArrowRight className="h-5 w-5" aria-hidden />
                                    </Link>
                                    <Link href="/login" className={SECONDARY_BTN}>
                                        {t("landing.ctaSignIn")}
                                    </Link>
                                </>
                            )}
                        </motion.div>

                        <motion.p {...item} className="mt-6 text-xs text-slate-500">
                            {t("landing.trust")}
                        </motion.p>
                    </motion.div>

                    {/* Animated app mockup */}
                    <motion.div
                        initial={reduce ? false : { opacity: 0, y: 30, scale: 0.96 }}
                        animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
                        transition={reduce ? undefined : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                        className="relative mx-auto w-full max-w-md"
                    >
                        <motion.div {...float} className="relative rounded-3xl border border-white bg-white/70 p-5 shadow-2xl shadow-sky-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl">
                            {/* Card header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
                                        <CalendarDays className="h-5 w-5 text-sky-600" aria-hidden />
                                    </span>
                                    <span className="font-bold text-slate-900">{t("landing.mockToday")}</span>
                                </div>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">08:00–15:20</span>
                            </div>

                            {/* Current lesson (highlighted) */}
                            <div className="mt-4 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 p-4 text-white shadow-lg shadow-sky-500/20">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-50">
                                    <span className="relative flex h-2 w-2">
                                        <span className={`absolute inline-flex h-full w-full rounded-full bg-white/80 ${reduce ? "" : "animate-ping"}`} />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                    </span>
                                    {t("landing.mockCurrentLesson")}
                                </div>
                                <div className="mt-2 flex items-end justify-between">
                                    <span className="text-2xl font-extrabold tracking-tight tabular-nums">09:50</span>
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-50">
                                        <MapPin className="h-3.5 w-3.5" aria-hidden /> 204
                                    </span>
                                </div>
                            </div>

                            {/* Upcoming rows */}
                            <div className="mt-3 space-y-2.5">
                                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/80 p-2.5">
                                    <span className="text-xs font-semibold tabular-nums text-slate-400">10:55</span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                                        <BookOpen className="h-4 w-4 text-violet-600" aria-hidden />
                                    </span>
                                    <span className="h-2 flex-1 rounded-full bg-slate-100" />
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                        <Repeat className="h-3 w-3" aria-hidden /> {t("landing.mockChange")}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/80 p-2.5">
                                    <span className="text-xs font-semibold tabular-nums text-slate-400">11:50</span>
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                                        <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden />
                                    </span>
                                    <span className="h-2 w-2/3 rounded-full bg-slate-100" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Floating accent chips */}
                        <motion.div
                            {...floatSlow}
                            className="absolute -right-3 -top-4 flex items-center gap-1.5 rounded-2xl border border-white bg-white/90 px-3 py-2 shadow-xl ring-1 ring-slate-900/5 backdrop-blur"
                        >
                            <Crown className="h-4 w-4 text-yellow-500" aria-hidden />
                            <span className="text-sm font-extrabold text-slate-900 tabular-nums">+150</span>
                        </motion.div>
                        <motion.div
                            {...float}
                            className="absolute -left-4 bottom-6 flex items-center gap-1.5 rounded-2xl border border-white bg-white/90 px-3 py-2 shadow-xl ring-1 ring-slate-900/5 backdrop-blur"
                        >
                            <Star className="h-4 w-4 text-amber-500" aria-hidden />
                            <span className="text-xs font-bold text-slate-700">+1</span>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ---- Features ---- */}
            <section className="container mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-16">
                <motion.div {...orchestrateOnView} className="mx-auto max-w-2xl text-center">
                    <motion.h2 {...item} className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        {t("landing.featuresTitle")}
                    </motion.h2>
                    <motion.p {...item} className="mt-3 text-slate-600">
                        {t("landing.featuresSubtitle")}
                    </motion.p>
                </motion.div>

                <motion.div {...orchestrateOnView} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((f) => {
                        const Icon = f.icon;
                        return (
                            <motion.div
                                key={f.titleKey}
                                {...item}
                                whileHover={reduce ? undefined : { y: -4 }}
                                className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-lg"
                            >
                                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.tint}`}>
                                    <Icon className={`h-6 w-6 ${f.color}`} aria-hidden />
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-slate-900">{t(f.titleKey)}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t(f.descKey)}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            {/* ---- Audiences ---- */}
            <section className="container mx-auto max-w-6xl px-4 md:px-6 pb-12 md:pb-16">
                <motion.h2 {...orchestrateOnView} className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    <motion.span {...item} className="inline-block">{t("landing.audienceTitle")}</motion.span>
                </motion.h2>
                <motion.div {...orchestrateOnView} className="mt-8 grid gap-4 sm:grid-cols-3">
                    {AUDIENCES.map((a) => {
                        const Icon = a.icon;
                        return (
                            <motion.div key={a.titleKey} {...item} className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center sm:text-left shadow-sm backdrop-blur">
                                <div className={`mx-auto sm:mx-0 flex h-11 w-11 items-center justify-center rounded-xl ${a.tint}`}>
                                    <Icon className={`h-5 w-5 ${a.color}`} aria-hidden />
                                </div>
                                <h3 className="mt-4 font-bold text-slate-900">{t(a.titleKey)}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t(a.descKey)}</p>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </section>

            {/* ---- Final CTA ---- */}
            {!authed && (
                <section className="container mx-auto max-w-5xl px-4 md:px-6 pb-20 md:pb-24">
                    <motion.div
                        {...orchestrateOnView}
                        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-cyan-500 px-6 py-14 text-center shadow-xl shadow-sky-500/20"
                    >
                        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
                            <div className="absolute -top-10 left-1/4 h-48 w-48 rounded-full bg-white blur-3xl" />
                            <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-white blur-3xl" />
                        </div>
                        <motion.div {...item} className="relative">
                            <Sparkles className="mx-auto h-8 w-8 text-white/90" aria-hidden />
                            <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white">{t("landing.ctaFinalTitle")}</h2>
                            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
                                <Link
                                    href="/register"
                                    className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-7 text-base font-semibold text-sky-700 shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-600"
                                >
                                    {t("landing.ctaStart")}
                                    <ArrowRight className="h-5 w-5" aria-hidden />
                                </Link>
                                <Link
                                    href="/login"
                                    className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-white/40 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-600"
                                >
                                    {t("landing.ctaSignIn")}
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                </section>
            )}
        </div>
    );
}
