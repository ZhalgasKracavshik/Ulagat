
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Award, BadgeCheck, Ban, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import {
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    getDictionary,
    isLocale,
    resolveKey,
} from "@/lib/i18n";
import { verifyAchievement, rejectAchievement } from "./actions";
import { ACHIEVEMENT_REVIEWER_ROLES, TIER_POINTS, type AchievementTier } from "@/lib/leaderboard";

export const dynamic = 'force-dynamic';

type PendingAchievement = {
    id: string;
    title: string;
    description: string | null;
    achievement_date: string | null;
    image_url: string | null;
    tier: AchievementTier | null;
    created_at: string;
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        grade: number | null;
        class_letter: string | null;
    } | null;
};

const TIER_BADGES: Record<AchievementTier, string> = {
    school: 'bg-muted text-foreground border-border',
    city: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200',
    national: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200',
};

const TIER_LABEL_KEYS: Record<AchievementTier, string> = {
    school: 'achievementReview.tierSchool',
    city: 'achievementReview.tierCity',
    national: 'achievementReview.tierNational',
};

export default async function AchievementReviewPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Server component: resolve locale from cookie and translate via dictionary.
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
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !(ACHIEVEMENT_REVIEWER_ROLES as readonly string[]).includes(profile.role)) {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">{t('achievementReview.accessDenied')}</h1>
                <p>{t('achievementReview.accessDeniedBody')}</p>
            </div>
        );
    }

    const { data: pendingRaw } = await supabase
        .from('achievements')
        .select('id, title, description, achievement_date, image_url, tier, created_at, profiles:user_id(id, full_name, avatar_url, grade, class_letter)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    const pending = (pendingRaw ?? []) as unknown as PendingAchievement[];

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 min-h-screen max-w-4xl">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                    <Award className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{t('achievementReview.title')}</h1>
                    <p className="text-muted-foreground">
                        {t('achievementReview.subtitle', {
                            school: TIER_POINTS.school,
                            city: TIER_POINTS.city,
                            national: TIER_POINTS.national,
                        })}
                    </p>
                </div>
            </div>

            {pending.length === 0 ? (
                <div className="text-center py-20 space-y-4 border border-dashed rounded-2xl">
                    <BadgeCheck className="w-16 h-16 mx-auto text-green-200" />
                    <h3 className="text-xl font-bold text-muted-foreground">{t('achievementReview.allCaughtUp')}</h3>
                    <p className="text-muted-foreground">{t('achievementReview.noneToReview')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {pending.map((a) => (
                        <Card key={a.id} className="overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    {a.image_url && (
                                        <a href={a.image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                            <img
                                                src={a.image_url}
                                                alt={a.title}
                                                className="w-full sm:w-36 h-28 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                                            />
                                        </a>
                                    )}
                                    <div className="flex-grow min-w-0 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-lg text-foreground">{a.title}</h3>
                                            {a.tier && (
                                                <Badge className={`border shadow-none ${TIER_BADGES[a.tier]}`}>
                                                    {t('achievementReview.tierPoints', {
                                                        tier: t(TIER_LABEL_KEYS[a.tier]),
                                                        pts: TIER_POINTS[a.tier],
                                                    })}
                                                </Badge>
                                            )}
                                        </div>
                                        {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                                        {a.achievement_date && (
                                            <p className="text-xs text-muted-foreground">
                                                {t('achievementReview.achieved', {
                                                    date: new Date(a.achievement_date).toLocaleDateString(),
                                                })}
                                            </p>
                                        )}
                                        {a.profiles && (
                                            <Link href={`/profile/${a.profiles.id}`} className="flex items-center gap-2 pt-1 group w-fit">
                                                <Avatar className="w-7 h-7 border">
                                                    <AvatarImage src={a.profiles.avatar_url ?? undefined} />
                                                    <AvatarFallback>{a.profiles.full_name?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                    {a.profiles.full_name || t('achievementReview.unknown')}
                                                    {a.profiles.grade ? ` · ${a.profiles.grade}${a.profiles.class_letter || ''}` : ''}
                                                </span>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                <form className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                                    <input type="hidden" name="id" value={a.id} />
                                    <Input
                                        name="reason"
                                        placeholder={t('achievementReview.rejectionPlaceholder')}
                                        className="h-10 flex-grow"
                                    />
                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            formAction={verifyAchievement}
                                            className="gap-1.5 bg-green-600 hover:bg-green-700 font-bold"
                                        >
                                            <BadgeCheck className="w-4 h-4" /> {t('achievementReview.verify')}
                                        </Button>
                                        <Button
                                            formAction={rejectAchievement}
                                            variant="outline"
                                            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold"
                                        >
                                            <Ban className="w-4 h-4" /> {t('achievementReview.reject')}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
