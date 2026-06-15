/**
 * i18n key mappings for lost & found categories and statuses.
 *
 * Stored as English slugs (lib/lost-found.ts). These map a slug to a dictionary
 * dot-path so server components (resolveKey) and client components (useT) render
 * localized labels from a single source.
 */
import type { LostItemCategory, LostItemStatus } from "@/types";

export function lostItemCategoryKey(category: LostItemCategory | string): string {
    const map: Record<string, string> = {
        electronics: "lostFound.catElectronics",
        clothing: "lostFound.catClothing",
        books: "lostFound.catBooks",
        accessories: "lostFound.catAccessories",
        documents: "lostFound.catDocuments",
        other: "lostFound.catOther",
    };
    return map[category] ?? category;
}

export function lostItemStatusKey(status: LostItemStatus | string): string {
    const map: Record<string, string> = {
        lost: "lostFound.statusLost",
        found: "lostFound.statusFound",
        claimed: "lostFound.statusClaimed",
    };
    return map[status] ?? status;
}
