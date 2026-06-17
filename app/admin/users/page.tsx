import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersManagementTable } from '@/components/admin/UsersManagementTable';
import { DEFAULT_LOCALE, LOCALE_COOKIE, getDictionary, isLocale, resolveKey } from '@/lib/i18n';
import type { AdminUserRow } from '@/types';

export default async function AdminUsersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    const dict = getDictionary(locale);
    const t = (key: string, vars?: Record<string, string | number>) => {
        let v = resolveKey(dict, key);
        if (vars) for (const [n, r] of Object.entries(vars)) v = v.replace(`{${n}}`, String(r));
        return v;
    };

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">{t('admin.accessDenied')}</h1>
                <p>{t('admin.usersAccessDeniedBody')}</p>
            </div>
        );
    }

    // Fetch profiles data
    const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, grade, class_letter, created_at, external_skud_id')
        .order('created_at', { ascending: false })
        .limit(500);

    // Fetch auth users (for email) using the service-role client
    const adminClient = createAdminClient();
    // P1-5: Align limit to 500 to match the profiles query limit.
    const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 500 });
    const emailMap = new Map<string, string>(
        (authData?.users ?? []).map((u) => [u.id, u.email ?? ''])
    );

    const users: AdminUserRow[] = (allProfiles ?? []).map((u) => ({
        id: u.id,
        full_name: u.full_name ?? '',
        email: emailMap.get(u.id) ?? '',
        avatar_url: u.avatar_url ?? null,
        role: u.role ?? 'student',
        grade: u.grade ?? null,
        class_letter: u.class_letter ?? null,
        created_at: u.created_at,
        external_skud_id: u.external_skud_id ?? null,
    }));

    return (
        <div className="container mx-auto py-8 space-y-6 px-4 md:px-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">{t('admin.userManagementTitle')}</h1>
                    <p className="text-muted-foreground">
                        {t('admin.userManagementSubtitle')}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('admin.allUsers', { count: users.length })}</CardTitle>
                </CardHeader>
                <CardContent>
                    <UsersManagementTable users={users} currentUserId={user.id} />
                </CardContent>
            </Card>
        </div>
    );
}
