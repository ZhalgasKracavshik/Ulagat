import { createClub } from "../actions";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { CLUB_CATEGORIES, CLUB_CREATOR_ROLES } from "@/lib/clubs";
import { clubCategoryKey } from "@/lib/clubs-i18n";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from "@/lib/i18n";

type LeaderCandidate = {
    id: string;
    full_name: string | null;
    role: string;
    grade: number | null;
    class_letter: string | null;
};

export default async function NewClubPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

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

    const allowedRoles: readonly string[] = CLUB_CREATOR_ROLES;
    if (!profile || !allowedRoles.includes(profile.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">{t('clubNew.accessDenied')}</CardTitle>
                    <p className="text-muted-foreground">{t('clubNew.accessDeniedBody')}</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/clubs">{t('clubNew.backToClubs')}</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    const isStaff = profile.role === 'moderator' || profile.role === 'admin';

    // Moderators/admins can delegate leadership to a parliament member or student.
    let leaderCandidates: LeaderCandidate[] = [];
    if (isStaff) {
        const { data: candidates } = await supabase
            .from('profiles')
            .select('id, full_name, role, grade, class_letter')
            .in('role', ['parliament', 'student'])
            .order('role', { ascending: false }) // parliament first
            .order('full_name', { ascending: true })
            .limit(100);
        leaderCandidates = (candidates ?? []) as LeaderCandidate[];
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('clubNew.title')}</h1>
                    <p className="text-muted-foreground">{t('clubNew.subtitle')}</p>
                </div>

                <Card className="border-0 shadow-xl shadow-violet-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">{t('clubNew.details')}</CardTitle>
                        <CardDescription>
                            {isStaff
                                ? t('clubNew.descStaff')
                                : t('clubNew.descLeader')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={createClub} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-semibold text-foreground">{t('clubNew.nameLabel')}</Label>
                                <Input id="name" name="name" placeholder={t('clubNew.namePlaceholder')} required maxLength={120} className="h-11 border-border focus:ring-violet-500 rounded-lg shadow-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-sm font-semibold text-foreground">{t('clubNew.categoryLabel')}</Label>
                                    <Select name="category" required>
                                        <SelectTrigger id="category" className="h-11 border-border rounded-lg shadow-sm w-full">
                                            <SelectValue placeholder={t('clubNew.categoryPlaceholder')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CLUB_CATEGORIES.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {t(clubCategoryKey(category))}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {isStaff && (
                                    <div className="space-y-2">
                                        <Label htmlFor="leader_id" className="text-sm font-semibold text-foreground">{t('clubNew.leaderLabel')}</Label>
                                        <Select name="leader_id">
                                            <SelectTrigger id="leader_id" className="h-11 border-border rounded-lg shadow-sm w-full">
                                                <SelectValue placeholder={t('clubNew.leaderPlaceholder')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {leaderCandidates.map((candidate) => (
                                                    <SelectItem key={candidate.id} value={candidate.id}>
                                                        {candidate.full_name || t('clubNew.unnamed')}
                                                        {candidate.role === 'parliament'
                                                            ? t('clubNew.leaderParliament')
                                                            : candidate.grade
                                                                ? `${t('clubNew.leaderGrade', { grade: candidate.grade })}${candidate.class_letter ?? ''}`
                                                                : t('clubNew.leaderStudent')}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[11px] text-muted-foreground italic">{t('clubNew.leaderHint')}</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold text-foreground">{t('clubNew.descriptionLabel')}</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder={t('clubNew.descriptionPlaceholder')}
                                    className="min-h-[120px] border-border focus:ring-violet-500 resize-none rounded-lg shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-foreground">{t('clubNew.logoLabel')}</Label>
                                <div className="border border-dashed border-border rounded-lg p-2 bg-muted/50">
                                    <ImageUpload bucketName="club-logos" />
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-lg h-14 rounded-xl shadow-lg transition-all active:scale-[0.98] mt-4">
                                {t('clubNew.createClub')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
