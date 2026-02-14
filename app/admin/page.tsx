
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldAlert } from "lucide-react";

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

    async function approveService(formData: FormData) {
        "use server";
        const id = formData.get('id') as string;
        const supabase = await createClient();
        await supabase.from('services').update({ status: 'active' }).eq('id', id);
        redirect('/admin');
    }

    async function rejectService(formData: FormData) {
        "use server";
        const id = formData.get('id') as string;
        const supabase = await createClient();
        await supabase.from('services').update({ status: 'archived' }).eq('id', id);
        redirect('/admin');
    }

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Services</CardTitle>
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
                <TabsList>
                    <TabsTrigger value="services">Pending Services</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                </TabsList>
                <TabsContent value="services" className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Review Listings</CardTitle></CardHeader>
                        <CardContent>
                            {pendingServices && pendingServices.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Owner</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingServices.map((service: any) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="font-medium">{service.title}</TableCell>
                                                <TableCell>{service.profiles?.full_name}</TableCell>
                                                <TableCell>{service.price} ₸</TableCell>
                                                <TableCell className="text-right flex items-center justify-end gap-2">
                                                    <form action={approveService}>
                                                        <input type="hidden" name="id" value={service.id} />
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                                                            <Check className="w-4 h-4 mr-1" /> Approve
                                                        </Button>
                                                    </form>
                                                    <form action={rejectService}>
                                                        <input type="hidden" name="id" value={service.id} />
                                                        <Button size="sm" variant="destructive" className="h-8">
                                                            <X className="w-4 h-4 mr-1" /> Reject
                                                        </Button>
                                                    </form>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No pending services to review.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="users">
                    <Card>
                        <CardHeader><CardTitle>User Management</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground">User list feature coming soon...</p></CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
