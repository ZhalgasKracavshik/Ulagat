"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
    CLUB_CREATOR_ROLES,
    CLUB_JOINER_ROLES,
    CLUB_LEADER_CANDIDATE_ROLES,
    isClubCategory,
} from "@/lib/clubs";
import { almatyTodayIso } from "@/lib/schedule/almaty-time";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Authenticated user + profile role, or throws. */
async function requireUser(): Promise<{ supabase: ServerSupabase; userId: string; role: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized: you must be signed in.");

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || !profile) throw new Error("Failed to verify user role.");
    return { supabase, userId: user.id, role: profile.role as string };
}

/**
 * Server-side guard for club management actions: the caller must be the
 * leader of THIS club, or a moderator/admin. Returns the club row.
 */
async function requireClubManager(clubId: string): Promise<{
    supabase: ServerSupabase;
    userId: string;
    role: string;
    club: { id: string; leader_id: string; status: string };
}> {
    if (!UUID_RE.test(clubId)) throw new Error("Invalid club id.");
    const { supabase, userId, role } = await requireUser();

    const { data: club, error } = await supabase
        .from('clubs')
        .select('id, leader_id, status')
        .eq('id', clubId)
        .single();

    if (error || !club) throw new Error("Club not found.");

    const isStaff = role === 'moderator' || role === 'admin';
    if (club.leader_id !== userId && !isStaff) {
        throw new Error("Unauthorized: only the club leader, moderators and admins can manage this club.");
    }
    return { supabase, userId, role, club };
}

function revalidateClubPaths(clubId?: string) {
    revalidatePath('/clubs');
    revalidatePath('/clubs/leaderboard');
    if (clubId) {
        revalidatePath(`/clubs/${clubId}`);
        revalidatePath(`/clubs/${clubId}/manage`);
    }
}

/**
 * Creates a club. Parliament members become the leader themselves;
 * moderators/admins may pick any parliament/student user as leader.
 */
export async function createClub(formData: FormData) {
    const { supabase, userId, role } = await requireUser();

    if (!(CLUB_CREATOR_ROLES as readonly string[]).includes(role)) {
        throw new Error("Unauthorized: only parliament, moderators and admins can create clubs.");
    }

    const name = ((formData.get('name') as string) || '').trim();
    const description = ((formData.get('description') as string) || '').trim();
    const category = ((formData.get('category') as string) || '').trim();
    const logoUrl = ((formData.get('image_url') as string) || '').trim();

    if (!name) throw new Error("Club name is required.");
    if (name.length > 120) throw new Error("Club name is too long (max 120 characters).");
    if (!isClubCategory(category)) throw new Error("Invalid club category.");

    // Parliament creators always lead their own club; moderators/admins may
    // delegate leadership to a parliament or student user.
    let leaderId = userId;
    if (role === 'moderator' || role === 'admin') {
        const requestedLeader = ((formData.get('leader_id') as string) || '').trim();
        if (requestedLeader && requestedLeader !== userId) {
            if (!UUID_RE.test(requestedLeader)) throw new Error("Invalid leader id.");
            const { data: leaderProfile } = await supabase
                .from('profiles')
                .select('id, role')
                .eq('id', requestedLeader)
                .single();
            if (!leaderProfile) throw new Error("Selected leader not found.");
            if (!(CLUB_LEADER_CANDIDATE_ROLES as readonly string[]).includes(leaderProfile.role)) {
                throw new Error("Club leaders must be parliament members or students.");
            }
            leaderId = requestedLeader;
        }
    }

    const { data: club, error } = await supabase
        .from('clubs')
        .insert({
            name,
            description: description || null,
            category,
            logo_url: logoUrl || null,
            leader_id: leaderId,
        })
        .select('id')
        .single();

    if (error || !club) {
        console.error("[createClub] insert failed:", error);
        throw new Error("Failed to create the club.");
    }

    revalidateClubPaths(club.id);
    redirect(`/clubs/${club.id}`);
}

/** Joins the current user (student/teacher/parliament) to an active club. */
export async function joinClub(formData: FormData) {
    const clubId = ((formData.get('club_id') as string) || '').trim();
    if (!UUID_RE.test(clubId)) throw new Error("Invalid club id.");

    const { supabase, userId, role } = await requireUser();
    if (!(CLUB_JOINER_ROLES as readonly string[]).includes(role)) {
        throw new Error("Unauthorized: only students, teachers and parliament members can join clubs.");
    }

    const { data: club } = await supabase
        .from('clubs')
        .select('id, status')
        .eq('id', clubId)
        .single();
    if (!club) throw new Error("Club not found.");
    if (club.status !== 'active') throw new Error("This club is archived and no longer accepts members.");

    const { error } = await supabase
        .from('club_members')
        .insert({ club_id: clubId, user_id: userId });

    // 23505 = unique_violation — already a member, treat as success.
    if (error && error.code !== '23505') {
        console.error("[joinClub] insert failed:", error);
        throw new Error("Failed to join the club.");
    }

    revalidateClubPaths(clubId);
}

/** Removes the current user from a club's member list. */
export async function leaveClub(formData: FormData) {
    const clubId = ((formData.get('club_id') as string) || '').trim();
    if (!UUID_RE.test(clubId)) throw new Error("Invalid club id.");

    const { supabase, userId } = await requireUser();

    const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);

    if (error) {
        console.error("[leaveClub] delete failed:", error);
        throw new Error("Failed to leave the club.");
    }

    revalidateClubPaths(clubId);
}

/**
 * Records a held meeting (leader of this club or moderator/admin).
 * Meetings are logged after they happen — the date cannot be in the
 * future (Almaty time). Attendees must be current club members.
 * The DB trigger awards club points: 5 + number of attendees.
 */
export async function recordMeeting(formData: FormData) {
    const clubId = ((formData.get('club_id') as string) || '').trim();
    const { supabase, userId, club } = await requireClubManager(clubId);

    if (club.status !== 'active') throw new Error("Cannot record meetings for an archived club.");

    const date = ((formData.get('date') as string) || '').trim();
    const notes = ((formData.get('notes') as string) || '').trim();
    const attendees = formData
        .getAll('attendees')
        .map((a) => String(a).trim())
        .filter((a) => UUID_RE.test(a));

    if (!ISO_DATE_RE.test(date)) throw new Error("A valid meeting date is required.");
    if (date > almatyTodayIso()) {
        throw new Error("Meeting date cannot be in the future — record meetings after they happen.");
    }

    // Attendees must all be members of this club.
    if (attendees.length > 0) {
        const { data: members, error: membersError } = await supabase
            .from('club_members')
            .select('user_id')
            .eq('club_id', clubId)
            .in('user_id', attendees);
        if (membersError) {
            console.error("[recordMeeting] member check failed:", membersError);
            throw new Error("Failed to validate attendees.");
        }
        const memberIds = new Set((members ?? []).map((m: { user_id: string }) => m.user_id));
        const nonMembers = attendees.filter((a) => !memberIds.has(a));
        if (nonMembers.length > 0) {
            throw new Error("All attendees must be members of the club.");
        }
    }

    const { error } = await supabase
        .from('club_meetings')
        .insert({
            club_id: clubId,
            date,
            notes: notes || null,
            attendees: Array.from(new Set(attendees)),
            created_by: userId,
        });

    if (error) {
        console.error("[recordMeeting] insert failed:", error);
        throw new Error("Failed to record the meeting.");
    }

    revalidateClubPaths(clubId);
}

/** Posts an internal club announcement (leader or moderator/admin). */
export async function postClubAnnouncement(formData: FormData) {
    const clubId = ((formData.get('club_id') as string) || '').trim();
    const { supabase, userId } = await requireClubManager(clubId);

    const title = ((formData.get('title') as string) || '').trim();
    const body = ((formData.get('body') as string) || '').trim();
    if (!title) throw new Error("Announcement title is required.");
    if (title.length > 200) throw new Error("Announcement title is too long (max 200 characters).");
    if (!body) throw new Error("Announcement body is required.");

    const { error } = await supabase
        .from('club_announcements')
        .insert({ club_id: clubId, title, body, created_by: userId });

    if (error) {
        console.error("[postClubAnnouncement] insert failed:", error);
        throw new Error("Failed to post the announcement.");
    }

    revalidateClubPaths(clubId);
}

/** Archives a club (moderator/admin only — clubs are never deleted). */
export async function archiveClub(formData: FormData) {
    const clubId = ((formData.get('club_id') as string) || '').trim();
    if (!UUID_RE.test(clubId)) throw new Error("Invalid club id.");

    const { supabase, role } = await requireUser();
    if (role !== 'moderator' && role !== 'admin') {
        throw new Error("Unauthorized: only moderators and admins can archive clubs.");
    }

    const { error } = await supabase
        .from('clubs')
        .update({ status: 'archived' })
        .eq('id', clubId)
        .eq('status', 'active');

    if (error) {
        console.error("[archiveClub] update failed:", error);
        throw new Error("Failed to archive the club.");
    }

    revalidateClubPaths(clubId);
    redirect(`/clubs/${clubId}`);
}
