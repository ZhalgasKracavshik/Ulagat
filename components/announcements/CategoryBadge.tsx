import { Badge } from "@/components/ui/badge";
import type { AnnouncementCategory } from "@/types";

const CATEGORY_CONFIG: Record<AnnouncementCategory, { label: string; icon: string; className: string }> = {
    medical: { label: 'Medical', icon: '🏥', className: 'bg-red-100 text-red-700 border-red-200' },
    assembly: { label: 'Assembly', icon: '📢', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    important: { label: 'Important', icon: '❗', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    general: { label: 'General', icon: '📝', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

type CategoryBadgeProps = {
    category: AnnouncementCategory;
};

export function CategoryBadge({ category }: CategoryBadgeProps) {
    const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.general;
    return (
        <Badge variant="outline" className={`gap-1 font-semibold ${config.className}`}>
            <span aria-hidden="true">{config.icon}</span>
            {config.label}
        </Badge>
    );
}
