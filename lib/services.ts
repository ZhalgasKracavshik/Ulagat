/** Roles allowed to post bulletin board listings (status stays 'pending' for moderation). */
export const SERVICE_CREATOR_ROLES = ['teacher', 'admin', 'moderator', 'parliament'] as const;

/** Phase 5 bulletin board categories (stored value + display label). */
export const SERVICE_CATEGORIES = [
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'project-help', label: 'Project Help' },
    { value: 'school-courses', label: 'School Courses' },
    { value: 'internships', label: 'Internships' },
    { value: 'mentorship', label: 'Mentorship' },
] as const;

/** Labels for category values stored before Phase 5 — kept working in display. */
const LEGACY_CATEGORY_LABELS: Record<string, string> = {
    cleaning: 'Cleaning',
    'tech-support': 'Tech Support',
    delivery: 'Delivery',
    other: 'Other',
    Math: 'Math',
    English: 'English',
    Music: 'Music',
    Coding: 'Coding',
    Arts: 'Arts',
    Sports: 'Sports',
};

/** Human label for any category value, current or legacy. */
export function serviceCategoryLabel(value: string | null | undefined): string {
    if (!value) return 'General';
    const current = SERVICE_CATEGORIES.find((c) => c.value === value);
    if (current) return current.label;
    return LEGACY_CATEGORY_LABELS[value] ?? value;
}
