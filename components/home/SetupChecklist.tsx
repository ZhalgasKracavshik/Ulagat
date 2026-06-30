import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, CalendarDays, Users, Rocket } from "lucide-react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

/**
 * First-run setup checklist for staff. Shown on the home screen only while the
 * pilot is not yet operational (no email / no timetable / no staff), and it
 * disappears on its own once all three are done — so it never lingers as
 * permanent clutter. The detailed, always-on status lives on /admin.
 */
export async function SetupChecklist() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    const role = profile?.role;
    if (role !== "admin" && role !== "moderator") return null;
    const isAdmin = role === "admin";

    const admin = createAdminClient();
    const [
        { count: scheduleRows },
        { count: teacherCount },
        { count: moderatorCount },
        { count: parliamentCount },
    ] = await Promise.all([
        admin.from("schedule").select("*", { count: "exact", head: true }),
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "teacher"),
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "moderator"),
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "parliament"),
    ]);

    const staffCount = (teacherCount ?? 0) + (moderatorCount ?? 0) + (parliamentCount ?? 0);
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "";
    const emailDone = Boolean(process.env.RESEND_API_KEY) && Boolean(fromEmail) && !fromEmail.includes("resend.dev");
    const scheduleDone = (scheduleRows ?? 0) > 0;
    const staffDone = staffCount > 0;

    const doneCount = [emailDone, scheduleDone, staffDone].filter(Boolean).length;
    if (doneCount === 3) return null; // fully set up — hide the checklist

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let v = resolveKey(dict, key);
        if (vars) for (const [n, r] of Object.entries(vars)) v = v.replace(`{${n}}`, String(r));
        return v;
    };

    const steps = [
        {
            done: emailDone,
            icon: Mail,
            title: t("setup.emailTitle"),
            desc: emailDone ? t("setup.emailDesc") : t("setup.emailHint"),
            href: null as string | null,
            cta: null as string | null,
        },
        {
            done: scheduleDone,
            icon: CalendarDays,
            title: t("setup.scheduleTitle"),
            desc: t("setup.scheduleDesc"),
            href: "/schedule/manage",
            cta: t("setup.scheduleCta"),
        },
        {
            done: staffDone,
            icon: Users,
            title: t("setup.staffTitle"),
            desc: t("setup.staffDesc"),
            href: isAdmin ? "/admin/users" : null,
            cta: isAdmin ? t("setup.staffCta") : null,
        },
    ];

    return (
        <div className="container mx-auto max-w-5xl px-4 pt-6">
            <Card className="overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-sky-950/20">
                <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                                <Rocket className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">{t("setup.title")}</h2>
                                <p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
                            </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            {t("setup.progress", { done: doneCount, total: 3 })}
                        </span>
                    </div>

                    <ul className="mt-4 space-y-2.5">
                        {steps.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <li
                                    key={i}
                                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        {step.done ? (
                                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                                        ) : (
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-indigo-300 text-[11px] font-bold text-indigo-500">
                                                {i + 1}
                                            </span>
                                        )}
                                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                                        <div className="min-w-0">
                                            <p className={`text-sm font-semibold ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                                {step.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{step.desc}</p>
                                        </div>
                                    </div>
                                    {step.done ? (
                                        <span className="shrink-0 text-xs font-medium text-emerald-600 sm:pl-2">{t("setup.doneLabel")}</span>
                                    ) : step.href && step.cta ? (
                                        <Button asChild size="sm" className="shrink-0 bg-indigo-600 hover:bg-indigo-700">
                                            <Link href={step.href}>{step.cta}</Link>
                                        </Button>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
