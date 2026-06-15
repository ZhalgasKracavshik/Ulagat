import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { AnnouncementForm } from "@/components/announcements/AnnouncementForm";

export const dynamic = 'force-dynamic';

export default async function NewAnnouncementPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-muted/50">
                <Card className="max-w-md w-full border-0 shadow-2xl text-center p-8 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Access Denied</CardTitle>
                    <p className="text-muted-foreground">Only moderators and admins can publish announcements.</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/announcements">Back to Announcements</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">New Announcement</h1>
                    <p className="text-muted-foreground">
                        Targeted students and their parents get an email instantly.
                    </p>
                </div>

                <Card className="border-0 shadow-xl shadow-indigo-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Announcement Details</CardTitle>
                        <CardDescription>
                            Choose who should see it — leave &quot;All grades&quot; checked for a school-wide announcement.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AnnouncementForm />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
