import {
    Smartphone,
    Shirt,
    BookOpen,
    Watch,
    FileText,
    Package,
    type LucideIcon,
} from "lucide-react";
import type { LostItemCategory } from "@/types";

/** Placeholder icon per category (used when an item has no photo). */
export const LOST_ITEM_CATEGORY_ICONS: Record<LostItemCategory, LucideIcon> = {
    electronics: Smartphone,
    clothing: Shirt,
    books: BookOpen,
    accessories: Watch,
    documents: FileText,
    other: Package,
};
