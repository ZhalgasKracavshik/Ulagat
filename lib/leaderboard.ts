/** Roles allowed to verify/reject achievement submissions (Phase 6). */
export const ACHIEVEMENT_REVIEWER_ROLES = ['parliament', 'moderator', 'admin'] as const;

export const ACHIEVEMENT_TIERS = ['school', 'city', 'national'] as const;
export type AchievementTier = (typeof ACHIEVEMENT_TIERS)[number];

export function isAchievementTier(value: string): value is AchievementTier {
    return (ACHIEVEMENT_TIERS as readonly string[]).includes(value);
}

/** Points awarded when an achievement is verified, by tier. (Mirrors the DB trigger.) */
export const TIER_POINTS: Record<AchievementTier, number> = {
    school: 10,
    city: 50,
    national: 150,
};

/** Animals used for the leaderboard privacy pseudonym ("Anonymous Lion"). */
export const ANONYMOUS_ANIMALS = [
    'Lion', 'Eagle', 'Wolf', 'Falcon', 'Tiger',
    'Bear', 'Lynx', 'Leopard', 'Hawk', 'Fox',
    'Owl', 'Panther', 'Stag', 'Horse', 'Dolphin',
    'Raven', 'Cheetah', 'Bison', 'Crane', 'Argali',
] as const;

/**
 * Deterministic pseudonym for a user id — the same user always maps to the
 * same animal, but the mapping cannot be trivially reversed to a name.
 */
export function anonymousPseudonym(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    }
    return `Anonymous ${ANONYMOUS_ANIMALS[hash % ANONYMOUS_ANIMALS.length]}`;
}
