import Link from "next/link";
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
  type LucideIcon,
} from "lucide-react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Feature = { icon: LucideIcon; titleKey: string; descKey: string; color: string; tint: string };

// Reuse each feature's signature icon + colour (see lib/nav-config.ts / .impeccable.md)
// so first-time visitors start learning the colour-coded wayfinding immediately.
const FEATURES: Feature[] = [
  { icon: CalendarDays, titleKey: "landing.f1Title", descKey: "landing.f1Desc", color: "text-sky-500", tint: "bg-sky-50 dark:bg-sky-950/40" },
  { icon: Megaphone, titleKey: "landing.f2Title", descKey: "landing.f2Desc", color: "text-indigo-500", tint: "bg-indigo-50 dark:bg-indigo-950/40" },
  { icon: Trophy, titleKey: "landing.f3Title", descKey: "landing.f3Desc", color: "text-amber-500", tint: "bg-amber-50 dark:bg-amber-950/40" },
  { icon: Users2, titleKey: "landing.f4Title", descKey: "landing.f4Desc", color: "text-violet-500", tint: "bg-violet-50 dark:bg-violet-950/40" },
  { icon: Crown, titleKey: "landing.f5Title", descKey: "landing.f5Desc", color: "text-yellow-500", tint: "bg-yellow-50 dark:bg-yellow-950/40" },
  { icon: GraduationCap, titleKey: "landing.f6Title", descKey: "landing.f6Desc", color: "text-rose-500", tint: "bg-rose-50 dark:bg-rose-950/40" },
];

const AUDIENCES: { icon: LucideIcon; titleKey: string; descKey: string; color: string; tint: string }[] = [
  { icon: Users, titleKey: "landing.forStudents", descKey: "landing.forStudentsDesc", color: "text-indigo-600", tint: "bg-indigo-50 dark:bg-indigo-950/40" },
  { icon: HeartHandshake, titleKey: "landing.forParents", descKey: "landing.forParentsDesc", color: "text-rose-500", tint: "bg-rose-50 dark:bg-rose-950/40" },
  { icon: ShieldCheck, titleKey: "landing.forStaff", descKey: "landing.forStaffDesc", color: "text-emerald-600", tint: "bg-emerald-50 dark:bg-emerald-950/40" },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const t = (key: string) => resolveKey(dict, key);

  // Render the accent word in brand violet without gradient text (per .impeccable.md).
  const title = t("landing.title");
  const accent = t("landing.titleAccent");
  const [before, after] = accent && title.includes(accent) ? title.split(accent) : [title, ""];

  return (
    <div className="flex flex-col">
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        {/* Soft, calm brand wash — decorative only. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-32 right-[-6rem] h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        </div>

        <div className="container mx-auto max-w-5xl px-4 md:px-6 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {t("landing.badge")}
          </span>

          <h1 className="mt-6 text-balance text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
            {before}
            {after !== "" && <span className="text-primary">{accent}</span>}
            {after}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base sm:text-lg leading-relaxed text-muted-foreground">
            {t("landing.subtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                href="/home"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("landing.ctaDashboard")}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("landing.ctaStart")}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border bg-card px-7 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("landing.ctaSignIn")}
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">{t("landing.trust")}</p>
        </div>
      </section>

      {/* ---- Features ------------------------------------------------------ */}
      <section className="container mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t("landing.featuresTitle")}</h2>
          <p className="mt-3 text-muted-foreground">{t("landing.featuresSubtitle")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.titleKey}
                className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${f.tint}`}>
                  <Icon className={`h-6 w-6 ${f.color}`} aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{t(f.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Audiences ----------------------------------------------------- */}
      <section className="container mx-auto max-w-6xl px-4 md:px-6 pb-12 md:pb-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {t("landing.audienceTitle")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {AUDIENCES.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.titleKey} className="rounded-2xl border bg-card p-6 text-center sm:text-left">
                <div className={`mx-auto sm:mx-0 flex h-11 w-11 items-center justify-center rounded-xl ${a.tint}`}>
                  <Icon className={`h-5 w-5 ${a.color}`} aria-hidden />
                </div>
                <h3 className="mt-4 font-bold text-foreground">{t(a.titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(a.descKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- Final CTA ----------------------------------------------------- */}
      {!user && (
        <section className="container mx-auto max-w-5xl px-4 md:px-6 pb-20 md:pb-24">
          <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-12 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute left-1/2 top-1/2 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t("landing.ctaFinalTitle")}</h2>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("landing.ctaStart")}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border bg-background px-7 text-base font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {t("landing.ctaSignIn")}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
