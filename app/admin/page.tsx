import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, ListFilter, Award } from "lucide-react";
import { ServiceReviewTable } from "@/components/admin/ServiceReviewTable";
import { EventReviewTable } from "@/components/admin/EventReviewTable";
import { MaterialReviewTable } from "@/components/admin/MaterialReviewTable";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
    const [{ data: pendingServices }, { data: pendingEvents }, { data: pendingMaterials }, { count: pendingAchievements }] = await Promise.all([
        supabase.from('services').select('*, profiles:owner_id(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('events').select('*, profiles:organizer_id(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('study_materials').select('*, profiles:uploaded_by(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('achievements').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]);

    // Fetch ALL Services (for moderation tab)
    const { data: allServices } = await supabase
        .from('services')
        .select('*, profiles:owner_id(full_name, role)')
        .order('created_at', { ascending: false });

    // Fetch All Users
    const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <ShieldAlert className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-muted-foreground">Manage services, users, and platform content.</p>
                    </div>
                </div>
                {/* Achievement verification lives at /achievements/review (also accessible to parliament) */}
                <Link href="/achievements/review">
                    <Button variant="outline" className="gap-2 font-bold">
                        <Award className="w-4 h-4 text-amber-500" />
                        Review Achievements
                        {(pendingAchievements ?? 0) > 0 && <Badge className="bg-red-500">{pendingAchievements}</Badge>}
                    </Button>
                </Link>
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
                        <CardTitle className="text-sm font-medium">Total Services</CardTitle>
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
                    <TabsTrigger value="services" className="flex-1 md:flex-none">
                        Services {pendingServices && pendingServices.length > 0 && <Badge className="ml-2 bg-red-500">{pendingServices.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="events" className="flex-1 md:flex-none">
                        Events {pendingEvents && pendingEvents.length > 0 && <Badge className="ml-2 bg-red-500">{pendingEvents.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="materials" className="flex-1 md:flex-none">
                        Materials {pendingMaterials && pendingMaterials.length > 0 && <Badge className="ml-2 bg-red-500">{pendingMaterials.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="all-services" className="flex-1 md:flex-none">All Services</TabsTrigger>
                    <TabsTrigger value="users" className="flex-1 md:flex-none">Users</TabsTrigger>
                </TabsList>

                <TabsContent value="services" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Service Listings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ServiceReviewTable services={pendingServices || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="events" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Events & Olympiads</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EventReviewTable events={pendingEvents || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Study Materials</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <MaterialReviewTable materials={pendingMaterials || []} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* NEW: All Services Tab */}
                <TabsContent value="all-services" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Service Listings</CardTitle>
                            <p className="text-sm text-muted-foreground">View and manage all services from teachers.</p>
                        </CardHeader>
                        <CardContent>
                            {allServices && allServices.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-3 px-2 font-medium">Title</th>
                                                <th className="py-3 px-2 font-medium">Owner</th>
                                                <th className="py-3 px-2 font-medium">Status</th>
                                                <th className="py-3 px-2 font-medium">Price</th>
                                                <th className="py-3 px-2 font-medium">Created</th>
                                                <th className="py-3 px-2 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allServices.map((service: any) => (
                                                <tr key={service.id} className="border-b hover:bg-slate-50">
                                                    <td className="py-3 px-2 font-medium">
                                                        <Link href={`/services/${service.id}`} className="hover:text-primary">
                                                            {service.title}
                                                        </Link>
                                                    </td>
                                                    <td className="py-3 px-2 text-muted-foreground">
                                                        {service.profiles?.full_name}
                                                        <Badge variant="outline" className="ml-1 text-xs capitalize">{service.profiles?.role}</Badge>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Badge variant={service.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                                                            {service.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-2">{service.price} ₸</td>
                                                    <td className="py-3 px-2 text-muted-foreground">
                                                        {new Date(service.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <Link href={`/services/${service.id}`}>
                                                            <Button size="sm" variant="outline">View</Button>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-center py-8 text-muted-foreground">No services found.</p>
                            )}
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
                            <UserManagementTable users={allUsers || []} currentUserId={user.id} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
