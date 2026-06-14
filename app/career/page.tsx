import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    GraduationCap,
    Target,
    Pencil,
    Trash2,
    CalendarClock,
    Sparkles,
    Building2,
} from "lucide-react";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import {
    entTotal,
    hasAnyScore,
    entScoreLabel,
    comparisonStatus,
    ENT_SCORE_KEYS,
    type ComparisonStatus,
} from "@/lib/career";
import { unlockedSpecialties, ENT_MAX_TOTAL } from "@/data/universities";
import type { CareerTracker, CareerTarget, EntScores } from "@/types";
import { AddTargetDialog } from "./AddTargetDialog";
import { UniversityExplorer } from "./UniversityExplorer";
import { deleteCareerTarget } from "./actions";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Days from today (Almaty) until an ISO deadline; negative if past. */
function daysUntil(iso: string): number {
    const today = new Date(almatyTodayIso() + "T00:00:00Z").getTime();
    const target = new Date(iso + "T00:00:00Z").getTime();
    return Math.round((target - today) / 86_400_000);
}

const STATUS_STYLE: Record<ComparisonStatus, { badge: string; bar: string; label: string }> = {
    reached: {
        badge: "border-emerald-300 text-emerald-700 bg-emerald-50",
        bar: "bg-emerald-500",
        label: "Reached",
    },
    close: {
        badge: "border-amber-300 text-amber-700 bg-amber-50",
        bar: "bg-amber-500",
        label: "Close",
    },
    below: {
        badge: "border-red-300 text-red-700 bg-red-50",
        bar: "bg-red-500",
        label: "Below",
    },
};

export default async function CareerPage({
    searchParams,
}: {
    searchParams: Promise<{ user?: string; child?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    const viewerRole: string = viewerProfile?.role ?? "student";
    const isStaff = viewerRole === "moderator" || viewerRole === "admin";
    const isParent = viewerRole === "parent";

    const params = await searchParams;

    // ---- Resolve whose tracker we are viewing ----
    let targetUserId = user.id;
    let viewingOther = false;
    let viewedName: string | null = null;

    // Parent: choose among linked children.
    let children: { id: string; full_name: string }[] = [];
    if (isParent) {
        const { data: bonds } = await supabase
            .from("family_bonds")
            .select("student_id")
            .eq("parent_id", user.id);
        const childIds = (bonds ?? []).map((b: { student_id: string }) => b.student_id);
        if (childIds.length > 0) {
            const { data: childProfiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", childIds);
            children = (childProfiles ?? []) as { id: string; full_name: string }[];
        }
        if (children.length === 0) {
            return <ParentNoChildren />;
        }
        const requested = params.child && UUID_RE.test(params.child) ? params.child : null;
        const chosen = children.find((c) => c.id === requested) ?? children[0];
        targetUserId = chosen.id;
        viewedName = chosen.full_name;
        viewingOther = true;
    }

    // Staff: view a specific student via ?user=.
    if (isStaff && params.user && UUID_RE.test(params.user)) {
        targetUserId = params.user;
        viewingOther = targetUserId !== user.id;
        if (viewingOther) {
            const { data: viewed } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", targetUserId)
                .single();
            viewedName = viewed?.full_name ?? "Student";
        }
    }

    const readOnly = viewingOther; // only the owner can edit their own data

    // ---- Fetch tracker + targets (RLS allows owner/parent/staff to read) ----
    const [{ data: trackerRow }, { data: targetRows }] = await Promise.all([
        supabase
            .from("career_tracker")
            .select("*")
            .eq("user_id", targetUserId)
            .maybeSingle(),
        supabase
            .from("career_targets")
            .select("*")
            .eq("user_id", targetUserId)
            .order("grant_deadline", { ascending: true, nullsFirst: false }),
    ]);

    const tracker = (trackerRow as CareerTracker | null) ?? null;
    const scores: EntScores = tracker?.ent_scores ?? {};
    const total = entTotal(scores);
    const targetScore = tracker?.target_score ?? null;
    const subject1 = tracker?.profile_subject_1 ?? null;
    const subject2 = tracker?.profile_subject_2 ?? null;
    const groups = unlockedSpecialties(subject1, subject2);

    const targets = (targetRows as CareerTarget[] | null) ?? [];

    const targetProgress =
        targetScore && targetScore > 0 ? Math.min(100, Math.round((total / targetScore) * 100)) : 0;

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-8 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-500/10 to-transparent p-6 rounded-2xl border border-rose-500/10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                        <GraduationCap className="w-8 h-8 text-rose-500" />
                        Career &amp; ЕНТ Tracker
                    </h1>
                    <p className="text-muted-foreground">
                        {viewingOther
                            ? `Viewing ${viewedName ?? "student"}'s ЕНТ progress and university targets.`
                            : "Track your ЕНТ scores, see what your subject combo unlocks, and aim for grant admission."}
                    </p>
                </div>
                {!readOnly && (
                    <Link href="/career/edit">
                        <Button className="gap-2">
                            <Pencil className="w-4 h-4" />
                            Edit ЕНТ scores
                        </Button>
                    </Link>
                )}
            </div>

            {/* Parent child selector */}
            {isParent && children.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Child:</span>
                    {children.map((c) => (
                        <Link key={c.id} href={`/career?child=${c.id}`}>
                            <Button
                                size="sm"
                                variant={c.id === targetUserId ? "secondary" : "ghost"}
                                className="rounded-full"
                            >
                                {c.full_name}
                            </Button>
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My ЕНТ Scores */}
                <Card className="border-rose-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Sparkles className="w-5 h-5 text-rose-500" />
                            {viewingOther ? "ЕНТ Scores" : "My ЕНТ Scores"}
                        </CardTitle>
                        <CardDescription>
                            5 subjects · scored out of {ENT_MAX_TOTAL} total
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {hasAnyScore(scores) || tracker ? (
                            <>
                                <div className="space-y-2">
                                    {ENT_SCORE_KEYS.map((key) => (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                {entScoreLabel(key, subject1, subject2)}
                                            </span>
                                            <span className="font-semibold tabular-nums">
                                                {scores[key] ?? "—"}
                                                <span className="text-muted-foreground">/40</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t pt-3 flex items-center justify-between">
                                    <span className="font-bold text-foreground">Total</span>
                                    <span className="text-2xl font-extrabold text-rose-600 tabular-nums">
                                        {total}
                                        <span className="text-sm text-muted-foreground font-medium">
                                            /{ENT_MAX_TOTAL}
                                        </span>
                                    </span>
                                </div>
                                {targetScore !== null && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Progress toward goal ({targetScore})</span>
                                            <span>{targetProgress}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-rose-500 transition-all"
                                                style={{ width: `${targetProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyHint
                                readOnly={readOnly}
                                text="No ЕНТ scores yet."
                                cta="Add your scores"
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Subject Combination */}
                <Card className="border-rose-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="w-5 h-5 text-indigo-500" />
                            Subject Combination
                        </CardTitle>
                        <CardDescription>Profile subjects unlock specialty groups</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {subject1 && subject2 ? (
                            <>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100">
                                        {subject1}
                                    </Badge>
                                    <span className="text-muted-foreground">+</span>
                                    <Badge className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100">
                                        {subject2}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-2">
                                        Unlocks:
                                    </p>
                                    {groups.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {groups.map((g) => (
                                                <Badge
                                                    key={g}
                                                    variant="outline"
                                                    className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                                                >
                                                    {g}
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            This combination isn&apos;t in our reference table yet —
                                            check university requirements directly.
                                        </p>
                                    )}
                                </div>
                            </>
                        ) : (
                            <EmptyHint
                                readOnly={readOnly}
                                text="No profile subjects chosen yet."
                                cta="Choose subjects"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Score Comparison */}
            <Card className="border-rose-100">
                <CardHeader>
                    <CardTitle className="text-lg">Score Comparison</CardTitle>
                    <CardDescription>
                        Your current total ({total}) vs. each target&apos;s grant cutoff
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {targets.filter((t) => t.cutoff_score !== null).length > 0 ? (
                        targets
                            .filter((t) => t.cutoff_score !== null)
                            .map((t) => {
                                const status = comparisonStatus(total, t.cutoff_score);
                                const cutoff = t.cutoff_score as number;
                                const pct = Math.min(100, Math.round((total / Math.max(cutoff, 1)) * 100));
                                const style = status ? STATUS_STYLE[status] : null;
                                return (
                                    <div key={t.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-foreground truncate">
                                                {t.university} · {t.specialty}
                                            </span>
                                            <span className="flex items-center gap-2 shrink-0">
                                                {style && (
                                                    <Badge variant="outline" className={style.badge}>
                                                        {style.label}
                                                    </Badge>
                                                )}
                                                <span className="tabular-nums text-muted-foreground">
                                                    {total} / {cutoff}
                                                </span>
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${style?.bar ?? "bg-slate-400"}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Add target universities with a known cutoff to compare your score.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* My Target Universities */}
            <Card className="border-rose-100">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Building2 className="w-5 h-5 text-rose-500" />
                            {viewingOther ? "Target Universities" : "My Target Universities"}
                        </CardTitle>
                        <CardDescription>Sorted by nearest grant deadline</CardDescription>
                    </div>
                    {!readOnly && <AddTargetDialog />}
                </CardHeader>
                <CardContent className="space-y-3">
                    {targets.length > 0 ? (
                        targets.map((t) => {
                            const days = t.grant_deadline ? daysUntil(t.grant_deadline) : null;
                            return (
                                <div
                                    key={t.id}
                                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted px-4 py-3"
                                >
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground truncate">
                                            {t.university}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {t.specialty}
                                            {t.cutoff_score !== null && (
                                                <> · cutoff ~{t.cutoff_score}/140</>
                                            )}
                                        </p>
                                        {t.grant_deadline && (
                                            <p className="mt-1 flex items-center gap-1 text-xs">
                                                <CalendarClock className="w-3.5 h-3.5 text-rose-400" />
                                                <span className="text-muted-foreground">
                                                    {t.grant_deadline}
                                                </span>
                                                <span
                                                    className={
                                                        days !== null && days < 0
                                                            ? "text-red-600 font-medium"
                                                            : days !== null && days <= 14
                                                              ? "text-amber-600 font-medium"
                                                              : "text-muted-foreground"
                                                    }
                                                >
                                                    {days !== null && days < 0
                                                        ? `(${Math.abs(days)} days ago)`
                                                        : days === 0
                                                          ? "(today)"
                                                          : `(${days} days left)`}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                    {!readOnly && (
                                        <form action={deleteCareerTarget}>
                                            <input type="hidden" name="target_id" value={t.id} />
                                            <Button
                                                type="submit"
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-red-600 shrink-0"
                                                aria-label="Remove target"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No target universities yet.
                            {!readOnly && " Add one above or from the explorer below."}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* University Explorer */}
            <Card className="border-rose-100">
                <CardHeader>
                    <CardTitle className="text-lg">University Explorer</CardTitle>
                    <CardDescription>
                        Browse major Kazakhstan universities and add specialties as targets.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <UniversityExplorer unlockedGroups={groups} readOnly={readOnly} />
                </CardContent>
            </Card>
        </div>
    );
}

function EmptyHint({
    readOnly,
    text,
    cta,
}: {
    readOnly: boolean;
    text: string;
    cta: string;
}) {
    return (
        <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">{text}</p>
            {!readOnly && (
                <Link href="/career/edit">
                    <Button variant="outline" size="sm">
                        {cta}
                    </Button>
                </Link>
            )}
        </div>
    );
}

function ParentNoChildren() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-xl text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-rose-300 dark:text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">No linked student</h1>
            <p className="text-muted-foreground">
                You aren&apos;t linked to any student yet. Once your child links your account, you
                will see their ЕНТ tracker and university targets here.
            </p>
        </div>
    );
}
