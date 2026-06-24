"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, GraduationCap } from "lucide-react";
import { useT } from "@/hooks/useT";

/**
 * Premium split-screen shell for the auth pages. Left: a light EdTech gradient
 * brand panel (desktop only). Right: the form on a clean light surface. Fixed
 * light palette so the marketing/auth surfaces stay bright regardless of the
 * in-app dark toggle. Animation respects prefers-reduced-motion.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
    const { t } = useT();
    const reduce = useReducedMotion();

    const bullets = ["landing.f1Title", "landing.f2Title", "landing.f3Title"];

    return (
        <div className="min-h-dvh w-full bg-slate-50 lg:grid lg:grid-cols-2">
            {/* Brand panel (desktop) */}
            <aside className="relative hidden overflow-hidden bg-gradient-to-br from-sky-600 via-cyan-500 to-teal-500 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-25">
                    <div className="absolute -top-16 -left-10 h-72 w-72 rounded-full bg-white blur-3xl" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white blur-3xl" />
                </div>

                <Link href="/" className="relative inline-flex items-center gap-2 text-2xl font-black tracking-tight">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                        <GraduationCap className="h-5 w-5" aria-hidden />
                    </span>
                    Ulagat
                </Link>

                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    transition={reduce ? undefined : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="relative max-w-md"
                >
                    <h2 className="text-3xl font-extrabold leading-tight tracking-tight">{t("landing.title")}</h2>
                    <p className="mt-4 text-sky-50/90">{t("landing.subtitle")}</p>

                    <ul className="mt-8 space-y-3">
                        {bullets.map((key) => (
                            <li key={key} className="flex items-center gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                                    <Check className="h-3.5 w-3.5" aria-hidden />
                                </span>
                                <span className="font-medium text-white">{t(key)}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                <p className="relative text-xs text-sky-50/70">{t("landing.trust")}</p>
            </aside>

            {/* Form column */}
            <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={reduce ? undefined : { opacity: 1, y: 0 }}
                    transition={reduce ? undefined : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-md"
                >
                    {/* Compact brand mark (mobile) */}
                    <Link href="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-cyan-500 text-white">
                            <GraduationCap className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="text-2xl font-black tracking-tight text-slate-900">Ulagat</span>
                    </Link>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
                        {children}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
