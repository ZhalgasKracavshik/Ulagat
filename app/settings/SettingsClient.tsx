"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
    Sun,
    Moon,
    Monitor,
    Languages,
    Zap,
    LayoutList,
    Clock,
    ChevronRight,
    Check,
    type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { useT } from "@/hooks/useT";
import { useUIPhase } from "@/hooks/useUIPhase";
import { LOCALES } from "@/lib/i18n";
import { updatePrivacy } from "./actions";

/**
 * Client-side settings controls. The page shell (auth + initial values) is the
 * server component in ./page.tsx; everything interactive (theme, locale, UI
 * mode, privacy toggle) lives here so it can use the relevant hooks.
 */
export function SettingsClient({
    initialAnonymous,
}: {
    initialAnonymous: boolean;
}) {
    const { t } = useT();

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t("settings.title")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
            </div>

            <AppearanceSection />
            <LanguageSection />
            <DisplayModeSection />
            <PrivacySection initialAnonymous={initialAnonymous} />
            <AccountSection />
        </div>
    );
}

/* --- Shared layout primitives --------------------------------------------- */

/** A titled section card. No nested cards inside — rows are plain divs. */
function Section({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

type SegmentOption<T extends string> = {
    value: T;
    label: string;
    hint?: string;
    icon: LucideIcon;
};

/**
 * A segmented control: a row of equal options, the active one highlighted.
 * Used for theme, language and display mode. Comfortable tap targets, wraps to
 * a single column on the narrowest screens.
 */
function Segmented<T extends string>({
    options,
    value,
    onChange,
    ariaLabel,
}: {
    options: SegmentOption<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className="grid gap-2 sm:grid-cols-3"
        >
            {options.map((opt) => {
                const Icon = opt.icon;
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onChange(opt.value)}
                        className={[
                            "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                                : "border-border bg-background text-foreground hover:bg-muted",
                        ].join(" ")}
                    >
                        <span className="flex w-full items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="text-sm font-medium">{opt.label}</span>
                            {active && <Check className="ml-auto h-4 w-4" />}
                        </span>
                        {opt.hint && (
                            <span className="text-xs text-muted-foreground">{opt.hint}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* --- Appearance (theme) --------------------------------------------------- */

function AppearanceSection() {
    const { t } = useT();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // next-themes resolves the active theme only after mount (it reads
    // localStorage / the system preference client-side). Until then we can't
    // know the real value, so we keep a neutral highlight to avoid a hydration
    // mismatch. The controls remain fully usable before mount. This single
    // post-mount setState is the sanctioned hydration-safe gate (same pattern
    // as UIPhaseProvider), not an avoidable cascade.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    const current = (mounted ? theme : "system") ?? "system";

    return (
        <Section
            title={t("settings.appearance.title")}
            description={t("settings.appearance.description")}
        >
            <Segmented
                ariaLabel={t("settings.appearance.title")}
                value={current}
                onChange={setTheme}
                options={[
                    { value: "light", label: t("settings.appearance.light"), icon: Sun },
                    { value: "dark", label: t("settings.appearance.dark"), icon: Moon },
                    { value: "system", label: t("settings.appearance.system"), icon: Monitor },
                ]}
            />
        </Section>
    );
}

/* --- Language ------------------------------------------------------------- */

function LanguageSection() {
    const { t, locale, setLocale } = useT();

    return (
        <Section
            title={t("settings.language.title")}
            description={t("settings.language.description")}
        >
            <Segmented
                ariaLabel={t("settings.language.title")}
                value={locale}
                onChange={setLocale}
                options={LOCALES.map((l) => ({
                    value: l.code,
                    label: l.name,
                    icon: Languages,
                }))}
            />
        </Section>
    );
}

/* --- Display mode (Express / Full / Auto) --------------------------------- */

function DisplayModeSection() {
    const { t } = useT();
    const { mode, setMode, ready } = useUIPhase();

    return (
        <Section
            title={t("settings.mode.title")}
            description={t("settings.mode.description")}
        >
            <Segmented
                ariaLabel={t("settings.mode.title")}
                value={ready ? mode : "auto"}
                onChange={setMode}
                options={[
                    {
                        value: "express",
                        label: t("settings.mode.express"),
                        hint: t("settings.mode.expressHint"),
                        icon: Zap,
                    },
                    {
                        value: "full",
                        label: t("settings.mode.full"),
                        hint: t("settings.mode.fullHint"),
                        icon: LayoutList,
                    },
                    {
                        value: "auto",
                        label: t("settings.mode.auto"),
                        hint: t("settings.mode.autoHint"),
                        icon: Clock,
                    },
                ]}
            />
        </Section>
    );
}

/* --- Privacy -------------------------------------------------------------- */

function PrivacySection({ initialAnonymous }: { initialAnonymous: boolean }) {
    const { t } = useT();
    const [anonymous, setAnonymous] = useState(initialAnonymous);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleToggle() {
        const next = !anonymous;
        setAnonymous(next); // optimistic
        setError(null);
        startTransition(async () => {
            const result = await updatePrivacy(next);
            if (!result.ok) {
                setAnonymous(!next); // revert
                setError(result.error);
            }
        });
    }

    return (
        <Section
            title={t("settings.privacy.title")}
            description={t("settings.privacy.description")}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                        {t("settings.privacy.anonymousLabel")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("settings.privacy.anonymousHint")}
                    </p>
                    {error && (
                        <p className="mt-1 text-xs font-medium text-destructive">{error}</p>
                    )}
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={anonymous}
                    aria-label={t("settings.privacy.anonymousLabel")}
                    disabled={pending}
                    onClick={handleToggle}
                    className={[
                        "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60",
                        anonymous ? "bg-indigo-600" : "bg-muted",
                    ].join(" ")}
                >
                    <span
                        className={[
                            "inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform",
                            anonymous ? "translate-x-5" : "translate-x-0.5",
                        ].join(" ")}
                    />
                </button>
            </div>
        </Section>
    );
}

/* --- Account -------------------------------------------------------------- */

function AccountSection() {
    const { t } = useT();

    return (
        <Section
            title={t("settings.account.title")}
            description={t("settings.account.description")}
        >
            <div className="space-y-1">
                <Link
                    href="/profile/edit"
                    className="flex items-center justify-between gap-4 rounded-lg px-1 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">
                            {t("settings.account.editProfile")}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                            {t("settings.account.editProfileHint")}
                        </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>

                <div className="border-t pt-3">
                    <SignOutButton />
                </div>
            </div>
        </Section>
    );
}
