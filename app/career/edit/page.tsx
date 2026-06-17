import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ENT_PROFILE_SUBJECTS, ENT_MANDATORY_SUBJECTS, ENT_MAX_TOTAL } from "@/data/universities";
import { CAREER_VIEWER_ROLES } from "@/lib/career";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";
import type { CareerTracker, EntScores } from "@/types";
import { upsertCareerTracker } from "../actions";

export const dynamic = "force-dynamic";

/** Map mandatory ЕНТ subject keys to dictionary keys (labels already in career.*). */
const MANDATORY_LABEL_KEYS: Record<string, string> = {
    math_literacy: "career.entMathLiteracy",
    reading: "career.entReadingLiteracy",
    history: "career.entHistory",
};

export default async function CareerEditPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { error: formError } = await searchParams;

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let value = resolveKey(dict, key);
        if (vars) {
            for (const [name, replacement] of Object.entries(vars)) {
                value = value.replace(`{${name}}`, String(replacement));
            }
        }
        return value;
    };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const role: string = profile?.role ?? "student";
    // Only the roles that own a tracker may edit. Parents/staff view via the
    // read-only /career page; teacher/parliament have no tracker.
    if (!(CAREER_VIEWER_ROLES as readonly string[]).includes(role) || role === "parent") {
        redirect("/career");
    }

    const { data: trackerRow } = await supabase
        .from("career_tracker")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    const tracker = (trackerRow as CareerTracker | null) ?? null;
    const scores: EntScores = tracker?.ent_scores ?? {};
    const subject1 = tracker?.profile_subject_1 ?? "";
    const subject2 = tracker?.profile_subject_2 ?? "";

    return (
        <div className="min-h-screen bg-background py-10 px-4">
            <div className="mx-auto max-w-2xl space-y-6">
                <div className="text-center mb-4">
                    <h1 className="text-3xl font-bold text-foreground">{t('careerEdit.title')}</h1>
                    <p className="text-muted-foreground mt-2">
                        {t('careerEdit.subtitle')}
                    </p>
                </div>

                <form action={upsertCareerTracker} className="space-y-6">
                    {formError && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                        >
                            {formError}
                        </div>
                    )}

                    {/* Profile subjects */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('careerEdit.profileSubjects')}</CardTitle>
                            <CardDescription>
                                {t('careerEdit.profileSubjectsHint')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="profile_subject_1">{t('careerEdit.profileSubject1')}</Label>
                                <select
                                    id="profile_subject_1"
                                    name="profile_subject_1"
                                    defaultValue={subject1}
                                    className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="">{t('careerEdit.notChosen')}</option>
                                    {ENT_PROFILE_SUBJECTS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profile_subject_2">{t('careerEdit.profileSubject2')}</Label>
                                <select
                                    id="profile_subject_2"
                                    name="profile_subject_2"
                                    defaultValue={subject2}
                                    className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="">{t('careerEdit.notChosen')}</option>
                                    {ENT_PROFILE_SUBJECTS.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Scores */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('careerEdit.subjectScores')}</CardTitle>
                            <CardDescription>
                                {t('careerEdit.subjectScoresHint', { max: ENT_MAX_TOTAL })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {ENT_MANDATORY_SUBJECTS.map((subj) => (
                                <ScoreField
                                    key={subj.key}
                                    name={`score_${subj.key}`}
                                    label={t(MANDATORY_LABEL_KEYS[subj.key] ?? subj.key)}
                                    defaultValue={scores[subj.key as keyof EntScores]}
                                />
                            ))}
                            <ScoreField
                                name="score_subject_1"
                                label={`${t('careerEdit.profileSubject1')}${subject1 ? ` (${subject1})` : ""}`}
                                defaultValue={scores.subject_1}
                            />
                            <ScoreField
                                name="score_subject_2"
                                label={`${t('careerEdit.profileSubject2')}${subject2 ? ` (${subject2})` : ""}`}
                                defaultValue={scores.subject_2}
                            />
                        </CardContent>
                    </Card>

                    {/* Target + notes */}
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('careerEdit.goalNotes')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="target_score">
                                    {t('careerEdit.targetScore', { max: ENT_MAX_TOTAL })}
                                </Label>
                                <Input
                                    id="target_score"
                                    name="target_score"
                                    type="number"
                                    min={0}
                                    max={ENT_MAX_TOTAL}
                                    defaultValue={tracker?.target_score ?? ""}
                                    placeholder={t('careerEdit.targetScorePlaceholder')}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">{t('careerEdit.notes')}</Label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    defaultValue={tracker?.notes ?? ""}
                                    maxLength={2000}
                                    placeholder={t('careerEdit.notesPlaceholder')}
                                    className="min-h-[100px] resize-none"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-4 pt-2">
                        <Link href="/career" className="w-full">
                            <Button variant="outline" className="w-full h-12 text-base" type="button">
                                {t('careerEdit.cancel')}
                            </Button>
                        </Link>
                        <Button type="submit" className="w-full h-12 text-base font-bold">
                            {t('careerEdit.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ScoreField({
    name,
    label,
    defaultValue,
}: {
    name: string;
    label: string;
    defaultValue: number | undefined;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={name} className="text-sm font-medium text-foreground">
                {label}
            </Label>
            <Input
                id={name}
                name={name}
                type="number"
                min={0}
                max={40}
                defaultValue={defaultValue ?? ""}
                placeholder="0–40"
                className="h-10 w-24 text-right"
            />
        </div>
    );
}
