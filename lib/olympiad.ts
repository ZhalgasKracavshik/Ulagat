/** Roles allowed to upload study materials (status stays 'pending' for moderation). */
export const MATERIAL_UPLOADER_ROLES = ['admin', 'moderator', 'parliament'] as const;

export const MATERIAL_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type MaterialDifficulty = (typeof MATERIAL_DIFFICULTIES)[number];

export function isMaterialDifficulty(value: string): value is MaterialDifficulty {
    return (MATERIAL_DIFFICULTIES as readonly string[]).includes(value);
}

/** Max PDF attachment size for study materials: 10 MB. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
