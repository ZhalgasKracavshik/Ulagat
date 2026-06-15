/**
 * i18n key mapping for service categories.
 *
 * Categories are stored as English slugs (lib/services.ts SERVICE_CATEGORIES).
 * This maps a slug to a dictionary dot-path so both server components
 * (resolveKey) and client components (useT) render localized labels. Unknown /
 * legacy slugs fall back to the slug itself.
 */
export function serviceCategoryKey(value: string): string {
    const map: Record<string, string> = {
        tutoring: "serviceCat.tutoring",
        "project-help": "serviceCat.project-help",
        "school-courses": "serviceCat.school-courses",
        internships: "serviceCat.internships",
        mentorship: "serviceCat.mentorship",
    };
    return map[value] ?? value;
}
