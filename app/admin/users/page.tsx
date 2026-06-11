import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ShieldAlert, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersManagementTable } from '@/components/admin/UsersManagementTable';
import type { AdminUserRow } from '@/types';

export default async function AdminUsersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>Only administrators can manage users.</p>
            </div>
        );
    }

    const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, grade, class_letter, created_at, external_skud_id')
        .order('created_at', { ascending: false })
        .limit(500);

    const users: AdminUserRow[] = (allUsers ?? []).map((u) => ({
        id: u.id,
        full_name: u.full_name ?? '',
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
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">
                        Manage roles, grades, and SKUD IDs for all platform users.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <UsersManagementTable users={users} currentUserId={user.id} />
                </CardContent>
            </Card>
        </div>
    );
}
