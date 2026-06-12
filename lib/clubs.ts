import type { ClubCategory } from "@/types";

/** Phase 7: roles that can create clubs (parliament leads their own club). */
export const CLUB_CREATOR_ROLES = ['parliament', 'moderator', 'admin'] as const;

/** Roles that can join clubs as members (parents/moderators don't join). */
export const CLUB_JOINER_ROLES = ['student', 'teacher', 'parliament'] as const;

/** Roles a moderator/admin may pick as a club leader. */
export const CLUB_LEADER_CANDIDATE_ROLES = ['parliament', 'student'] as const;

export const CLUB_CATEGORIES = [
    'debates',
    'it',
    'chess',
    'sport',
    'science',
    'art',
    'music',
    'volunteering',
    'other',
] as const;

export function isClubCategory(value: string): value is ClubCategory {
    return (CLUB_CATEGORIES as readonly string[]).includes(value);
}

export const CLUB_CATEGORY_LABELS: Record<ClubCategory, string> = {
    debates: 'Debates',
    it: 'IT',
    chess: 'Chess',
    sport: 'Sport',
    science: 'Science',
    art: 'Art',
    music: 'Music',
    volunteering: 'Volunteering',
    other: 'Other',
};
