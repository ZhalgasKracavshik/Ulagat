import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, ListFilter } from "lucide-react";
import { ServiceReviewTable } from "@/components/admin/ServiceReviewTable";
import { UserManagementTable } from "@/components/admin/UserManagementTable";

export default async function AdminPage() {
    const supabase = await createClient();

    // Check Admin Role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Allow 'admin' and 'moderator' roles. 
    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        return (
            <div className="container py-20 text-center text-destructive">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>You do not have permission to view this page. (Role: {profile?.role})</p>
            </div>
        );
    }

    const isAdmin = profile.role === 'admin';

    // Fetch Stats
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
    const { count: eventCount } = await supabase.from('events').select('*', { count: 'exact', head: true });

    // Fetch Pending Content
    const { data: pendingServices } = await supabase
        .from('services')
        .select('*, profiles:owner_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    // Fetch All Users (Ideally paginated, but for now fetching all)
    const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    <ShieldAlert className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage services, users, and platform content.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Services</CardTitle>
                        <ListFilter className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{serviceCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{eventCount || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Management Tabs */}
            <Tabs defaultValue="services" className="w-full">
                <TabsList className="w-full md:w-auto">
                    <TabsTrigger value="services" className="flex-1 md:flex-none">Pending Services</TabsTrigger>
                    <TabsTrigger value="users" className="flex-1 md:flex-none">User Management</TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Listings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ServiceReviewTable services={pendingServices || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Database</CardTitle>
                            {!isAdmin && <p className="text-sm text-yellow-600">Note: Only Admins can change user roles.</p>}
                        </CardHeader>
                        <CardContent>
                            {/* Pass data to client component */}
                            <UserManagementTable users={allUsers || []} currentUserId={user.id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
