import type { LostItemCategory, LostItemStatus } from "@/types";

/** Phase 8: roles that can post a lost/found item. */
export const LOST_ITEM_POSTER_ROLES = ['student', 'teacher', 'parliament', 'moderator', 'admin'] as const;

/** Roles that may verify items and move them through the status machine. */
export const LOST_ITEM_STAFF_ROLES = ['parliament', 'moderator', 'admin'] as const;

export const LOST_ITEM_CATEGORIES = [
    'electronics',
    'clothing',
    'books',
    'accessories',
    'documents',
    'other',
] as const;

export const LOST_ITEM_STATUSES = ['lost', 'found', 'claimed'] as const;

export function isLostItemCategory(value: string): value is LostItemCategory {
    return (LOST_ITEM_CATEGORIES as readonly string[]).includes(value);
}

export function isLostItemStatus(value: string): value is LostItemStatus {
    return (LOST_ITEM_STATUSES as readonly string[]).includes(value);
}

export const LOST_ITEM_CATEGORY_LABELS: Record<LostItemCategory, string> = {
    electronics: 'Electronics',
    clothing: 'Clothing',
    books: 'Books',
    accessories: 'Accessories',
    documents: 'Documents',
    other: 'Other',
};

export const LOST_ITEM_STATUS_LABELS: Record<LostItemStatus, string> = {
    lost: 'Lost',
    found: 'Found',
    claimed: 'Claimed',
};
