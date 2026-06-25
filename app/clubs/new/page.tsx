import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClubCreateForm } from "@/components/clubs/ClubCreateForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { CLUB_CREATOR_ROLES } from "@/lib/clubs";
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
                        <ClubCreateForm isStaff={isStaff} leaderCandidates={leaderCandidates} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
