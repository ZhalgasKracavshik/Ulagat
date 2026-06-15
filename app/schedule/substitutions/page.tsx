import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MailCheck, ShieldAlert } from "lucide-react";
import { SubstitutionForm } from "@/components/schedule/SubstitutionForm";
import { SubstitutionBadge } from "@/components/schedule/SubstitutionBadge";
import { DeleteSubstitutionButton } from "@/components/schedule/DeleteSubstitutionButton";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import type { Substitution } from "@/types";

export const dynamic = 'force-dynamic';

function describeChange(sub: Substitution): string {
    if (sub.type === 'cancellation') return 'Lesson cancelled';
    const parts: string[] = [];
    if (sub.subject) parts.push(sub.subject);
    if (sub.substitute_teacher_name) parts.push(sub.substitute_teacher_name);
    if (sub.room) parts.push(`Room ${sub.room}`);
    return parts.length > 0 ? parts.join(' · ') : '—';
}

export default async function SubstitutionsPage() {
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
                    <p className="text-muted-foreground">Only moderators and admins can enter substitutions.</p>
                    <Button variant="outline" className="w-full mt-4" asChild>
                        <Link href="/schedule">Back to Schedule</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    // "Today" in school wall-clock time (Asia/Almaty) — the server may run in UTC.
    const todayIso = almatyTodayIso();
    const { data: subRows } = await supabase
        .from('substitutions')
        .select('*')
        .gte('date', todayIso)
        .order('date', { ascending: true })
        .order('period', { ascending: true });

    const upcoming = (subRows ?? []) as Substitution[];

    return (
        <div className="min-h-screen bg-muted/50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Enter a Substitution</h1>
                    <p className="text-muted-foreground">
                        The whole class — students and their parents — gets an email instantly.
                    </p>
                </div>

                <Card className="border-0 shadow-xl shadow-orange-100/50 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">Substitution Details</CardTitle>
                        <CardDescription>
                            Pick the affected slot — we&apos;ll show what&apos;s currently scheduled there.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SubstitutionForm />
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-xl shadow-slate-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Today & Upcoming</CardTitle>
                        <CardDescription>
                            Active substitutions from today onwards. Delete an entry if it was a mistake.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcoming.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No substitutions scheduled for today or later.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Change</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upcoming.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="whitespace-nowrap font-medium">
                                                {format(new Date(sub.date + 'T00:00:00'), 'MMM d')}
                                            </TableCell>
                                            <TableCell className="font-bold">{sub.grade}{sub.class_letter}</TableCell>
                                            <TableCell>{sub.period}</TableCell>
                                            <TableCell>
                                                <SubstitutionBadge type={sub.type} />
                                            </TableCell>
                                            <TableCell className="max-w-[220px]">
                                                <span className="block truncate">{describeChange(sub)}</span>
                                                {sub.notified_at && (
                                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                                        <MailCheck className="w-3 h-3" /> Notified
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DeleteSubstitutionButton id={sub.id} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
