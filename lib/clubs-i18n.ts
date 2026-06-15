/**
 * i18n key mapping for club categories.
 *
 * Categories are stored as English slugs (lib/clubs.ts). This maps a slug to a
 * dictionary dot-path so both server components (resolveKey) and client
 * components (useT) render localized category labels.
 */
import type { ClubCategory } from "@/types";

export function clubCategoryKey(category: ClubCategory | string): string {
    const map: Record<string, string> = {
        debates: "clubs.catDebates",
        it: "clubs.catIt",
        chess: "clubs.catChess",
        sport: "clubs.catSport",
        science: "clubs.catScience",
        art: "clubs.catArt",
        music: "clubs.catMusic",
        volunteering: "clubs.catVolunteering",
        other: "clubs.catOther",
    };
    return map[category] ?? category;
}
