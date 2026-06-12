
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Award, BadgeCheck, Ban, ShieldAlert } from "lucide-react";
import Link from "next/link";
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
    school: 'bg-slate-100 text-slate-700 border-slate-200',
    city: 'bg-blue-100 text-blue-700 border-blue-200',
    national: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default async function AchievementReviewPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || !(ACHIEVEMENT_REVIEWER_ROLES as readonly string[]).includes(profile.role)) {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>Only Parliament members, Moderators and Admins can review achievements.</p>
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
                <div className="p-3 bg-amber-100 rounded-full">
                    <Award className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Achievement Verification</h1>
                    <p className="text-muted-foreground">
                        Approve student achievements to award reputation points
                        (School +{TIER_POINTS.school} / City +{TIER_POINTS.city} / National +{TIER_POINTS.national}).
                    </p>
                </div>
            </div>

            {pending.length === 0 ? (
                <div className="text-center py-20 space-y-4 border border-dashed rounded-2xl">
                    <BadgeCheck className="w-16 h-16 mx-auto text-green-200" />
                    <h3 className="text-xl font-bold text-slate-400">All caught up!</h3>
                    <p className="text-muted-foreground">There are no pending achievements to review.</p>
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
                                            <h3 className="font-bold text-lg text-slate-900">{a.title}</h3>
                                            {a.tier && (
                                                <Badge className={`border shadow-none capitalize ${TIER_BADGES[a.tier]}`}>
                                                    {a.tier} · +{TIER_POINTS[a.tier]} pts
                                                </Badge>
                                            )}
                                        </div>
                                        {a.description && <p className="text-sm text-slate-600">{a.description}</p>}
                                        {a.achievement_date && (
                                            <p className="text-xs text-muted-foreground">
                                                Achieved: {new Date(a.achievement_date).toLocaleDateString()}
                                            </p>
                                        )}
                                        {a.profiles && (
                                            <Link href={`/profile/${a.profiles.id}`} className="flex items-center gap-2 pt-1 group w-fit">
                                                <Avatar className="w-7 h-7 border">
                                                    <AvatarImage src={a.profiles.avatar_url ?? undefined} />
                                                    <AvatarFallback>{a.profiles.full_name?.[0] || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors">
                                                    {a.profiles.full_name || 'Unknown'}
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
                                        placeholder="Rejection reason (optional)"
                                        className="h-10 flex-grow"
                                    />
                                    <div className="flex gap-2 shrink-0">
                                        <Button
                                            formAction={verifyAchievement}
                                            className="gap-1.5 bg-green-600 hover:bg-green-700 font-bold"
                                        >
                                            <BadgeCheck className="w-4 h-4" /> Verify
                                        </Button>
                                        <Button
                                            formAction={rejectAchievement}
                                            variant="outline"
                                            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold"
                                        >
                                            <Ban className="w-4 h-4" /> Reject
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
