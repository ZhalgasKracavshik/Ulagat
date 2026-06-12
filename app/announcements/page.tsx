import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Pin, PlusCircle, Users } from "lucide-react";
import { CategoryBadge } from "@/components/announcements/CategoryBadge";
import { DeleteAnnouncementButton } from "@/components/announcements/DeleteAnnouncementButton";
import { getViewerGrades, announcementGradeFilter } from "@/lib/announcements/visibility";
import type { Announcement } from "@/types";

export const dynamic = 'force-dynamic';

function gradesLabel(targetGrades: number[] | null): string {
    if (!targetGrades || targetGrades.length === 0) return 'All grades';
    return `Grades ${targetGrades.join(', ')}`;
}

export default async function AnnouncementsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, grade')
        .eq('id', user.id)
        .single();

    const role = profile?.role ?? 'student';
    const isStaff = role === 'admin' || role === 'moderator';

    // Grades relevant to this viewer: own grade for students, children's grades
    // for parents; [] = no grade resolved (only school-wide announcements);
    // null = staff / teachers / parliament see everything (no filter).
    const viewerGrades = await getViewerGrades(supabase, user.id);

    // expires_at is an absolute instant (end of the chosen day in Asia/Almaty,
    // converted at creation time in createAnnouncement), so the current absolute
    // time is the correct comparison point — no wall-clock date math needed here.
    const nowIso = new Date().toISOString();

    let query = supabase
        .from('announcements')
        .select('*')
        .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

    // Show school-wide announcements plus those targeting any relevant grade
    // (no filter for staff / teachers / parliament).
    const gradeFilter = announcementGradeFilter(viewerGrades);
    if (gradeFilter) {
        query = query.or(gradeFilter);
    }

    const { data: rows } = await query;
    const announcements = (rows ?? []) as Announcement[];

    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <Megaphone className="w-8 h-8 text-indigo-600" />
                            Announcements
                        </h1>
                        <p className="text-slate-500">
                            Official announcements from the school administration.
                        </p>
                    </div>
                    {isStaff && (
                        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            <Link href="/announcements/new">
                                <PlusCircle className="w-4 h-4" />
                                New Announcement
                            </Link>
                        </Button>
                    )}
                </div>

                {announcements.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-dashed">
                        <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        No announcements yet.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {announcements.map((announcement) => (
                            <Card
                                key={announcement.id}
                                className={`border-0 shadow-md overflow-hidden ${announcement.pinned ? 'ring-2 ring-indigo-200' : ''}`}
                            >
                                <CardContent className="p-6 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {announcement.pinned && (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                                    <Pin className="w-3 h-3" /> Pinned
                                                </span>
                                            )}
                                            <CategoryBadge category={announcement.category} />
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                                <Users className="w-3 h-3" />
                                                {gradesLabel(announcement.target_grades)}
                                            </span>
                                        </div>
                                        {isStaff && <DeleteAnnouncementButton id={announcement.id} />}
                                    </div>

                                    <h2 className="text-xl font-bold text-slate-900">{announcement.title}</h2>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {announcement.body}
                                    </p>

                                    <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                                        <span>{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                                        {announcement.expires_at && (
                                            <span>Visible until {format(new Date(announcement.expires_at), 'MMM d, yyyy')}</span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
