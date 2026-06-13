import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
    NAV,
    CAREER_NAV_ROLES,
    STAFF_ROLES,
    type NavDestination,
    type NavRole,
} from "@/lib/nav-config";
import {
    Sparkles,
    ShieldCheck,
    Sun,
    Moon,
    Award,
    UserCog,
    UsersRound,
    ArrowRight,
    type LucideIcon,
} from "lucide-react";

export const metadata = {
    title: "Guide — Ulagat",
    description: "Learn how Ulagat works: schedule, announcements, clubs, achievements and more.",
};

type DirSection = {
    label: string;
    intro: string;
    items: NavDestination[];
};

export default async function GuidePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let role: NavRole | null = null;
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        role = (profile?.role as NavRole | undefined) ?? null;
    }

    const showCareer = role !== null && CAREER_NAV_ROLES.includes(role);
    const isStaff = role !== null && STAFF_ROLES.includes(role);

    // Feature directory, grouped. Role-aware where it matters.
    const sections: DirSection[] = [
        {
            label: "Every day",
            intro: "The essentials you'll open most mornings and evenings.",
            items: [NAV.schedule, NAV.announcements, NAV.home],
        },
        {
            label: "Community",
            intro: "Find your people and celebrate what the school achieves together.",
            items: [NAV.events, NAV.clubs, NAV.leaderboard, NAV.friends, NAV.chats],
        },
        {
            label: "Grow",
            intro: "Tools to prepare for what comes next.",
            items: [
                ...(showCareer ? [NAV.career] : []),
                NAV.prep,
                NAV.achievements,
            ],
        },
        {
            label: "Services",
            intro: "Practical help around campus.",
            items: [NAV.bulletin, NAV.lostFound],
        },
        {
            label: "Account",
            intro: "Your home base and ways to get more out of Ulagat.",
            items: [NAV.cabinet, NAV.premium],
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="container mx-auto px-4 py-10 md:py-14 space-y-12 max-w-5xl">
                {/* Hero */}
                <section className="space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        <Sparkles className="w-3.5 h-3.5" />
                        Welcome
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                        Welcome to Ulagat
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
                        Ulagat is your school&apos;s hub — your schedule, announcements, clubs,
                        achievements and more, all in one place. It adapts to your day with two
                        modes: <span className="font-semibold text-slate-900">Express</span> for a
                        fast morning glance, and{" "}
                        <span className="font-semibold text-slate-900">Full</span> in the evening
                        when you want everything.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Link
                            href="/home"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                            Go to my dashboard
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/profile/me"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
                        >
                            Open my cabinet
                        </Link>
                    </div>
                </section>

                {/* How it works */}
                <section className="space-y-5">
                    <h2 className="text-xl font-bold text-slate-900">How it works</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <HowItWorks
                            icon={UserCog}
                            color="text-violet-500"
                            bg="bg-violet-50"
                            title="Roles shape your view"
                            body="What you can do depends on your role — student, teacher, parent, parliament or staff. Ulagat only shows you what's relevant."
                        />
                        <HowItWorks
                            icon={Award}
                            color="text-amber-500"
                            bg="bg-amber-50"
                            title="Reputation & achievements"
                            body="Earn reputation points for verified accomplishments. Your achievements are recorded on a tamper-proof ledger you can show off."
                        />
                        <HowItWorks
                            icon={Sun}
                            color="text-amber-500"
                            bg="bg-amber-50"
                            title="Morning / evening toggle"
                            body="Use the Sun/Moon switch in the top bar to flip between Express (just schedule and news) and Full (everything)."
                            secondaryIcon={Moon}
                        />
                        <HowItWorks
                            icon={UsersRound}
                            color="text-blue-500"
                            bg="bg-blue-50"
                            title="Parents join by invite"
                            body="Students generate a one-time code from their cabinet. Parents enter it when registering to securely link to their child."
                        />
                    </div>
                </section>

                {/* Feature directory */}
                <section className="space-y-8">
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-900">Everything in Ulagat</h2>
                        <p className="text-slate-600">A quick map of every corner of the app.</p>
                    </div>

                    {sections.map((section) => {
                        if (section.items.length === 0) return null;
                        return (
                            <div key={section.label} className="space-y-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">
                                        {section.label}
                                    </h3>
                                    <p className="text-sm text-slate-500">{section.intro}</p>
                                </div>
                                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                                    {section.items.map((item) => (
                                        <FeatureCard key={item.key} item={item} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Staff-only card */}
                    {isStaff && (
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">For staff</h3>
                                <p className="text-sm text-slate-500">
                                    Tools available to moderators and admins.
                                </p>
                            </div>
                            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                                <div className="flex items-start gap-3 rounded-xl border bg-white p-4">
                                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-slate-900">Moderation</p>
                                        <p className="text-sm text-slate-500 leading-snug">
                                            Review and approve submitted services, events and materials.
                                        </p>
                                        <Link
                                            href="/admin/moderation"
                                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                        >
                                            Open <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function HowItWorks({
    icon: Icon,
    secondaryIcon: SecondaryIcon,
    color,
    bg,
    title,
    body,
}: {
    icon: LucideIcon;
    secondaryIcon?: LucideIcon;
    color: string;
    bg: string;
    title: string;
    body: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-xl border bg-white p-4">
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
                {SecondaryIcon && <SecondaryIcon className="w-3.5 h-3.5 text-indigo-500 -ml-1" />}
            </span>
            <div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-sm text-slate-500 leading-snug">{body}</p>
            </div>
        </div>
    );
}

function FeatureCard({ item }: { item: NavDestination }) {
    const Icon = item.icon;
    return (
        <div className="flex items-start gap-3 rounded-xl border bg-white p-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
                <Icon className={`w-5 h-5 ${item.color}`} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{item.label}</p>
                <p className="text-sm text-slate-500 leading-snug">{item.hint}</p>
                <Link
                    href={item.href}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                    Open <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>
        </div>
    );
}
