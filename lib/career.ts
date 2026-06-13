import type { EntScores } from "@/types";
import { ENT_MANDATORY_SUBJECTS } from "@/data/universities";

/** Roles allowed to open the career tracker (student/parent + staff). */
export const CAREER_VIEWER_ROLES = ['student', 'parent', 'moderator', 'admin'] as const;

/** The slugs used inside ent_scores, in display order. */
export const ENT_SCORE_KEYS = [
    'math_literacy',
    'reading',
    'history',
    'subject_1',
    'subject_2',
] as const;

export type EntScoreKey = (typeof ENT_SCORE_KEYS)[number];

/** Sums the five subject scores; missing entries count as 0. */
export function entTotal(scores: EntScores): number {
    return ENT_SCORE_KEYS.reduce((sum, key) => sum + (scores[key] ?? 0), 0);
}

/** True once the student has entered at least one subject score. */
export function hasAnyScore(scores: EntScores): boolean {
    return ENT_SCORE_KEYS.some((key) => typeof scores[key] === 'number');
}

/** Label for a score key, given the two chosen profile subjects. */
export function entScoreLabel(
    key: EntScoreKey,
    profileSubject1: string | null,
    profileSubject2: string | null,
): string {
    switch (key) {
        case 'math_literacy':
            return ENT_MANDATORY_SUBJECTS[0].label;
        case 'reading':
            return ENT_MANDATORY_SUBJECTS[1].label;
        case 'history':
            return ENT_MANDATORY_SUBJECTS[2].label;
        case 'subject_1':
            return profileSubject1 || 'Profile subject 1';
        case 'subject_2':
            return profileSubject2 || 'Profile subject 2';
    }
}

export type ComparisonStatus = 'reached' | 'close' | 'below';

/**
 * Compares a current total against a target cutoff.
 *   reached — current >= cutoff (green)
 *   close   — within 10 points below the cutoff (amber)
 *   below   — more than 10 below (red)
 */
export function comparisonStatus(
    currentTotal: number,
    cutoff: number | null,
): ComparisonStatus | null {
    if (cutoff === null || cutoff === undefined) return null;
    if (currentTotal >= cutoff) return 'reached';
    if (cutoff - currentTotal <= 10) return 'close';
    return 'below';
}
