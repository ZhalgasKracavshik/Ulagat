"use client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/hooks/useT";
import type { AnnouncementCategory } from "@/types";

const CATEGORY_CONFIG: Record<AnnouncementCategory, { labelKey: string; icon: string; className: string }> = {
    medical: { labelKey: 'announcements.catMedical', icon: '🏥', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200' },
    assembly: { labelKey: 'announcements.catAssembly', icon: '📢', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200' },
    important: { labelKey: 'announcements.catImportant', icon: '❗', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-200' },
    general: { labelKey: 'announcements.catGeneral', icon: '📝', className: 'bg-muted text-foreground border-border' },
};

type CategoryBadgeProps = {
    category: AnnouncementCategory;
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
    const { t } = useT();
    const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.general;
    return (
        <Badge variant="outline" className={`gap-1 font-semibold ${config.className}`}>
            <span aria-hidden="true">{config.icon}</span>
            {t(config.labelKey)}
        </Badge>
    );
}
