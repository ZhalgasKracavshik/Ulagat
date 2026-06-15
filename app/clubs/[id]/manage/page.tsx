import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Users,
    CalendarDays,
    Megaphone,
    Archive,
    ArrowLeft,
    ClipboardCheck,
    Crown,
} from "lucide-react";
import { archiveClub, postClubAnnouncement, recordMeeting } from "../../actions";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import type { Club, ClubMeeting } from "@/types";

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MemberRow = {
    id: string;
    user_id: string;
    total_attendance: number;
    joined_at: string;
    profiles: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
    } | null;
};

export default async function ManageClubPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID_RE.test(id)) notFound();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/clubs/${id}/manage`);

    const [{ data: clubRaw }, { data: profile }] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', id).single(),
        supabase.from('profiles').select('role').eq('id', user.id).single(),
    ]);

    if (!clubRaw) notFound();
    const club = clubRaw as Club;
    const role = profile?.role ?? 'student';

    // Server-side guard: leader of THIS club, or moderator/admin.
    const isLeader = club.leader_id === user.id;
    const isStaff = role === 'moderator' || role === 'admin';
    if (!isLeader && !isStaff) {
        redirect(`/clubs/${id}`);
    }

    const [{ data: membersRaw }, { data: meetingsRaw }] = await Promise.all([
        supabase
            .from('club_members')
            .select('id, user_id, total_attendance, joined_at, profiles:user_id(id, full_name, avatar_url)')
            .eq('club_id', id)
            .order('joined_at', { ascending: true }),
        supabase
            .from('club_meetings')
            .select('*')
            .eq('club_id', id)
            .order('date', { ascending: false })
            .limit(30),
    ]);

    const members = (membersRaw ?? []) as unknown as MemberRow[];
    const meetings = (meetingsRaw ?? []) as ClubMeeting[];
    const todayIso = almatyTodayIso();

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 max-w-5xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <Link href={`/clubs/${club.id}`} className="inline-flex">
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-3">
                            <ArrowLeft className="w-4 h-4" />
                            Back to club page
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                        Manage: {club.name}
                        {club.status === 'archived' && (
                            <Badge variant="outline" className="border-border text-muted-foreground font-bold gap-1">
                                <Archive className="w-3 h-3" />
                                Archived
                            </Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground">
                        Record meetings, post announcements and track member attendance.
                    </p>
                </div>
                {isStaff && club.status === 'active' && (
                    <form action={archiveClub} className="shrink-0">
                        <input type="hidden" name="club_id" value={club.id} />
                        <Button type="submit" variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50 font-bold">
                            <Archive className="w-4 h-4" />
                            Archive Club
                        </Button>
                    </form>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Record meeting */}
                <Card className="border-violet-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ClipboardCheck className="w-5 h-5 text-violet-500" />
                            Record Meeting
                        </CardTitle>
                        <CardDescription>
                            Log a meeting after it happens. The club earns 5 points + 1 per attendee.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {club.status === 'active' ? (
                            <form action={recordMeeting} className="space-y-5">
                                <input type="hidden" name="club_id" value={club.id} />
                                <div className="space-y-2">
                                    <Label htmlFor="date" className="text-sm font-semibold text-foreground">Meeting Date</Label>
                                    <Input
                                        id="date"
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={todayIso}
                                        max={todayIso}
                                        className="h-11 border-border rounded-lg shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes" className="text-sm font-semibold text-foreground">Notes (optional)</Label>
                                    <Textarea
                                        id="notes"
                                        name="notes"
                                        placeholder="What did the club do at this meeting?"
                                        className="min-h-[80px] border-border resize-none rounded-lg shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-foreground">Attendees</Label>
                                    {members.length > 0 ? (
                                        <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-border p-2">
                                            {members.map((member) => (
                                                <label
                                                    key={member.user_id}
                                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-violet-50/60 transition-colors cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        name="attendees"
                                                        value={member.user_id}
                                                        className="w-4 h-4 accent-violet-600"
                                                    />
                                                    <Avatar className="w-7 h-7 border">
                                                        <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                                                        <AvatarFallback className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 text-xs">
                                                            {member.profiles?.full_name?.[0] || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium text-foreground">
                                                        {member.profiles?.full_name || 'Unknown'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground p-2">
                                            No members yet — members must join before they can be marked as attendees.
                                        </p>
                                    )}
                                </div>
                                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 font-bold h-11 rounded-lg">
                                    Save Meeting
                                </Button>
                            </form>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                This club is archived — meetings can no longer be recorded.
                            </p>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Post announcement */}
                    <Card className="border-violet-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Megaphone className="w-5 h-5 text-violet-500" />
                                Post Announcement
                            </CardTitle>
                            <CardDescription>Visible to everyone on the club page.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form action={postClubAnnouncement} className="space-y-4">
                                <input type="hidden" name="club_id" value={club.id} />
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="text-sm font-semibold text-foreground">Title</Label>
                                    <Input
                                        id="title"
                                        name="title"
                                        placeholder="e.g. Friday practice moved to Room 204"
                                        required
                                        maxLength={200}
                                        className="h-11 border-border rounded-lg shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="body" className="text-sm font-semibold text-foreground">Message</Label>
                                    <Textarea
                                        id="body"
                                        name="body"
                                        placeholder="Write the announcement..."
                                        required
                                        className="min-h-[100px] border-border resize-none rounded-lg shadow-sm"
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 font-bold h-11 rounded-lg">
                                    Post Announcement
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Meeting history */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CalendarDays className="w-5 h-5 text-violet-500" />
                                Meeting History
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {meetings.length > 0 ? (
                                meetings.map((meeting) => (
                                    <div key={meeting.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-muted/50">
                                        <span className="font-bold text-foreground text-sm tabular-nums shrink-0">
                                            {format(new Date(meeting.date + 'T00:00:00'), 'MMM d, yyyy')}
                                        </span>
                                        <span className="flex-grow min-w-0 text-sm text-muted-foreground truncate">
                                            {meeting.notes || 'Club meeting'}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-full shrink-0">
                                            <Users className="w-3 h-3" />
                                            {meeting.attendees.length}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground py-4 text-center">No meetings recorded yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Members table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-violet-500" />
                        Members ({members.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {members.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Total Attendance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <Link href={`/profile/${member.user_id}`} className="flex items-center gap-3 group">
                                                <Avatar className="w-8 h-8 border">
                                                    <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                                                    <AvatarFallback className="bg-violet-50 dark:bg-violet-950/40 text-violet-600 text-xs">
                                                        {member.profiles?.full_name?.[0] || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium text-foreground group-hover:text-violet-700 transition-colors">
                                                    {member.profiles?.full_name || 'Unknown'}
                                                    {member.user_id === club.leader_id && (
                                                        <Crown className="inline w-3.5 h-3.5 text-yellow-500 ml-1.5 -mt-0.5" />
                                                    )}
                                                </span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(member.joined_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right font-bold tabular-nums">
                                            {member.total_attendance}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">No members yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
