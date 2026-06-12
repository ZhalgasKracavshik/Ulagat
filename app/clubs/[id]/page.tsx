import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Users,
    Star,
    Settings,
    LogIn,
    LogOut,
    CalendarDays,
    Megaphone,
    Archive,
    ArrowLeft,
    Crown,
} from "lucide-react";
import { joinClub, leaveClub } from "../actions";
import { CLUB_CATEGORY_LABELS, CLUB_JOINER_ROLES } from "@/lib/clubs";
import { CLUB_CATEGORY_ICONS } from "@/components/clubs/category-icons";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";
import type { Club, ClubAnnouncement, ClubMeeting } from "@/types";

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

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID_RE.test(id)) notFound();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/login?next=/clubs/${id}`);

    const [{ data: clubRaw }, { data: profile }] = await Promise.all([
        supabase.from('clubs').select('*').eq('id', id).single(),
        supabase.from('profiles').select('role').eq('id', user.id).single(),
    ]);

    if (!clubRaw) notFound();
    const club = clubRaw as Club;
    const role = profile?.role ?? 'student';

    const [{ data: membersRaw }, { data: announcementsRaw }, { data: meetingsRaw }, { data: leaderProfile }] = await Promise.all([
        supabase
            .from('club_members')
            .select('id, user_id, total_attendance, joined_at, profiles:user_id(id, full_name, avatar_url)')
            .eq('club_id', id)
            .order('total_attendance', { ascending: false }),
        supabase
            .from('club_announcements')
            .select('*')
            .eq('club_id', id)
            .order('created_at', { ascending: false })
            .limit(10),
        supabase
            .from('club_meetings')
            .select('*')
            .eq('club_id', id)
            .order('date', { ascending: false })
            .limit(20),
        supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', club.leader_id)
            .single(),
    ]);

    const members = (membersRaw ?? []) as unknown as MemberRow[];
    const announcements = (announcementsRaw ?? []) as ClubAnnouncement[];
    const meetings = (meetingsRaw ?? []) as ClubMeeting[];

    const isMember = members.some((m) => m.user_id === user.id);
    const isLeader = club.leader_id === user.id;
    const isStaff = role === 'moderator' || role === 'admin';
    const canManage = isLeader || isStaff;
    const canJoin =
        club.status === 'active' &&
        !isMember &&
        (CLUB_JOINER_ROLES as readonly string[]).includes(role);

    // Meetings are recorded after they happen — dates are never in the
    // future, so the split is today vs. past.
    const todayIso = almatyTodayIso();
    const todayMeetings = meetings.filter((m) => m.date >= todayIso);
    const pastMeetings = meetings.filter((m) => m.date < todayIso);

    const CategoryIcon = CLUB_CATEGORY_ICONS[club.category];

    return (
        <div className="container mx-auto py-8 space-y-8 px-4 md:px-6 max-w-5xl">
            <Link href="/clubs" className="inline-flex">
                <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
                    <ArrowLeft className="w-4 h-4" />
                    All clubs
                </Button>
            </Link>

            {/* Header */}
            <Card className="overflow-hidden border-violet-100">
                <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-6 md:items-center">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-violet-50 flex items-center justify-center shrink-0">
                            {club.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={club.logo_url} alt={club.name} className="object-cover w-full h-full" />
                            ) : (
                                <CategoryIcon className="w-12 h-12 text-violet-300" />
                            )}
                        </div>
                        <div className="flex-grow min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{club.name}</h1>
                                <Badge variant="outline" className="border-violet-200 text-violet-700 font-bold">
                                    {CLUB_CATEGORY_LABELS[club.category]}
                                </Badge>
                                {club.status === 'archived' && (
                                    <Badge variant="outline" className="border-slate-300 text-slate-500 font-bold gap-1">
                                        <Archive className="w-3 h-3" />
                                        Archived
                                    </Badge>
                                )}
                            </div>
                            {club.description && (
                                <p className="text-slate-600 max-w-2xl">{club.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-sm pt-1">
                                <span className="flex items-center gap-1.5 font-bold text-amber-600">
                                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    {club.points} points
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                                    <Users className="w-4 h-4 text-violet-500" />
                                    {members.length} members
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    Leader:{' '}
                                    <Link href={`/profile/${club.leader_id}`} className="text-violet-700 hover:underline font-semibold">
                                        {leaderProfile?.full_name || 'Unknown'}
                                    </Link>
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                            {canManage && (
                                <Link href={`/clubs/${club.id}/manage`}>
                                    <Button variant="outline" className="w-full gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 font-bold">
                                        <Settings className="w-4 h-4" />
                                        Manage
                                    </Button>
                                </Link>
                            )}
                            {canJoin && (
                                <form action={joinClub}>
                                    <input type="hidden" name="club_id" value={club.id} />
                                    <Button type="submit" className="w-full gap-2 bg-violet-600 hover:bg-violet-700 font-bold">
                                        <LogIn className="w-4 h-4" />
                                        Join Club
                                    </Button>
                                </form>
                            )}
                            {isMember && !isLeader && (
                                <form action={leaveClub}>
                                    <input type="hidden" name="club_id" value={club.id} />
                                    <Button type="submit" variant="outline" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 font-bold">
                                        <LogOut className="w-4 h-4" />
                                        Leave Club
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Members */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="w-5 h-5 text-violet-500" />
                            Members
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {members.length > 0 ? (
                            members.map((member) => (
                                <Link
                                    key={member.id}
                                    href={`/profile/${member.user_id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                                >
                                    <Avatar className="w-9 h-9 border">
                                        <AvatarImage src={member.profiles?.avatar_url ?? undefined} />
                                        <AvatarFallback className="bg-violet-50 text-violet-600 text-sm">
                                            {member.profiles?.full_name?.[0] || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-grow min-w-0 truncate font-medium text-slate-800 group-hover:text-violet-700 transition-colors">
                                        {member.profiles?.full_name || 'Unknown'}
                                        {member.user_id === club.leader_id && (
                                            <Crown className="inline w-3.5 h-3.5 text-yellow-500 ml-1.5 -mt-0.5" />
                                        )}
                                    </span>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full tabular-nums shrink-0">
                                        {member.total_attendance} attended
                                    </span>
                                </Link>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">No members yet — be the first to join!</p>
                        )}
                    </CardContent>
                </Card>

                {/* Announcements */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Megaphone className="w-5 h-5 text-violet-500" />
                            Club Announcements
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {announcements.length > 0 ? (
                            announcements.map((announcement) => (
                                <div key={announcement.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="font-bold text-slate-800 text-sm">{announcement.title}</h4>
                                        <span className="text-[11px] text-muted-foreground shrink-0">
                                            {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 whitespace-pre-line">{announcement.body}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">No announcements yet.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Meetings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CalendarDays className="w-5 h-5 text-violet-500" />
                        Meetings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {meetings.length > 0 ? (
                        <>
                            {todayMeetings.length > 0 && (
                                <p className="text-xs font-bold uppercase tracking-wider text-violet-500">Today</p>
                            )}
                            {todayMeetings.map((meeting) => (
                                <MeetingRow key={meeting.id} meeting={meeting} highlight />
                            ))}
                            {pastMeetings.length > 0 && (
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-1">Past</p>
                            )}
                            {pastMeetings.map((meeting) => (
                                <MeetingRow key={meeting.id} meeting={meeting} />
                            ))}
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">No meetings recorded yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function MeetingRow({ meeting, highlight = false }: { meeting: ClubMeeting; highlight?: boolean }) {
    return (
        <div className={`flex items-center gap-4 p-3 rounded-lg border ${highlight ? 'border-violet-200 bg-violet-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="font-bold text-slate-800 text-sm tabular-nums shrink-0">
                {format(new Date(meeting.date + 'T00:00:00'), 'MMM d, yyyy')}
            </div>
            <div className="flex-grow min-w-0 text-sm text-slate-600 truncate">
                {meeting.notes || 'Club meeting'}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full shrink-0">
                <Users className="w-3 h-3" />
                {meeting.attendees.length}
            </div>
        </div>
    );
}
