import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getViewerGrades, announcementGradeFilter } from "@/lib/announcements/visibility";
import { resolveUserClass } from "@/lib/schedule/resolve-class";
import { almatyTodayIso, almatyDayOfWeek } from "@/lib/schedule/almaty-time";
import { HomeView } from "@/components/home/HomeView";
import type { FullDashboardData } from "@/components/home/FullDashboard";
import type { ExpressData } from "@/components/express/ExpressDashboard";
import type { DayCell } from "@/components/schedule/types";
import type { Announcement, Profile, ScheduleEntry, Substitution } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch Profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Fetch Reputation Points
    const { data: reputation } = await supabase
        .from("reputation_ledger")
        .select("points")
        .eq("user_id", user.id);
    const totalPoints = reputation?.reduce((acc, curr) => acc + curr.points, 0) || 0;

    // Fetch Recent Events
    const { data: events } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true })
        .gte("event_date", new Date().toISOString())
        .limit(4);

    // Fetch New Services
    const { data: services } = await supabase
        .from("services")
        .select("*, profiles:owner_id(full_name, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(4);

    // Latest official announcements (grade-targeted, same as /announcements).
    const viewerGrades = await getViewerGrades(supabase, user.id);
    let announcementQuery = supabase
        .from("announcements")
        .select("*")
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3);
    const gradeFilter = announcementGradeFilter(viewerGrades);
    if (gradeFilter) {
        announcementQuery = announcementQuery.or(gradeFilter);
    }
    const { data: announcementRows } = await announcementQuery;
    const announcements = (announcementRows ?? []) as Announcement[];

    // ---- Express-mode data: today's schedule + substitutions for the user's class ----
    const todayIso = almatyTodayIso();
    const todayDow = almatyDayOfWeek(); // 1=Mon .. 7=Sun
    const resolved = await resolveUserClass(supabase, user.id, profile);

    let todayCells: DayCell[] = [];
    let hasSchoolToday = false;

    // School week is Mon-Sat (dow 1-6). Sunday (7) → no lessons.
    if (resolved.grade !== null && resolved.letter && todayDow <= 6) {
        const [{ data: lessonRows }, { data: subRows }] = await Promise.all([
            supabase
                .from("schedule")
                .select("*")
                .eq("grade", resolved.grade)
                .eq("class_letter", resolved.letter)
                .eq("day_of_week", todayDow)
                .lte("valid_from", todayIso)
                .gte("valid_until", todayIso),
            supabase
                .from("substitutions")
                .select("*")
                .eq("grade", resolved.grade)
                .eq("class_letter", resolved.letter)
                .eq("date", todayIso),
        ]);

        const lessons = (lessonRows ?? []) as ScheduleEntry[];
        const substitutions = (subRows ?? []) as Substitution[];

        todayCells = Array.from({ length: 8 }, (_, p) => {
            const period = p + 1;
            const lesson = lessons.find((l) => l.period === period);
            const sub = substitutions.find((s) => s.period === period);
            return {
                period,
                lesson: lesson
                    ? { subject: lesson.subject, teacher: lesson.teacher_name, room: lesson.room }
                    : null,
                substitution: sub
                    ? {
                        type: sub.type,
                        newSubject: sub.subject,
                        newTeacher: sub.substitute_teacher_name,
                        newRoom: sub.room,
                        note: sub.note,
                    }
                    : null,
            };
        });
        hasSchoolToday = lessons.length > 0;
    }

    const typedProfile = (profile ?? null) as Profile | null;
    const firstName = typedProfile?.full_name?.split(" ")[0] ?? "there";
    const classLabel =
        resolved.grade !== null && resolved.letter
            ? `${resolved.grade}${resolved.letter}`
            : null;

    const fullData: FullDashboardData = {
        profile: typedProfile,
        totalPoints,
        events: (events ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            event_date: e.event_date,
            location: e.location ?? null,
        })),
        services: (services ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            price: s.price,
            category: s.category ?? null,
            image_url: s.image_url ?? null,
            profiles: s.profiles ?? null,
        })),
        announcements,
    };

    const expressData: ExpressData = {
        firstName,
        classLabel,
        todayCells,
        hasSchoolToday,
        announcements,
    };

    return <HomeView full={fullData} express={expressData} />;
}
