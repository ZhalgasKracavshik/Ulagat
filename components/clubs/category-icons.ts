import {
    Speech,
    Laptop,
    Puzzle,
    Dumbbell,
    FlaskConical,
    Palette,
    Music,
    HeartHandshake,
    Sparkles,
    type LucideIcon,
} from "lucide-react";
import type { ClubCategory } from "@/types";

/** Placeholder icon per club category (used when a club has no logo). */
export const CLUB_CATEGORY_ICONS: Record<ClubCategory, LucideIcon> = {
    debates: Speech,
    it: Laptop,
    chess: Puzzle,
    sport: Dumbbell,
    science: FlaskConical,
    art: Palette,
    music: Music,
    volunteering: HeartHandshake,
    other: Sparkles,
};
