import { Badge } from "@/components/ui/badge";
import { Search, PackageCheck, HandHeart } from "lucide-react";
import { LOST_ITEM_STATUS_LABELS } from "@/lib/lost-found";
import type { LostItemStatus } from "@/types";

const STATUS_STYLES: Record<LostItemStatus, { className: string; icon: typeof Search }> = {
    lost: {
        className: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 text-amber-800 dark:text-amber-200",
        icon: Search,
    },
    found: {
        className: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 text-blue-800 dark:text-blue-200",
        icon: PackageCheck,
    },
    claimed: {
        className: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 text-emerald-800 dark:text-emerald-200",
        icon: HandHeart,
    },
};

export function StatusBadge({ status }: { status: LostItemStatus }) {
    const { className, icon: Icon } = STATUS_STYLES[status];
    return (
        <Badge variant="outline" className={`font-bold gap-1 shadow-sm ${className}`}>
            <Icon className="w-3 h-3" />
            {LOST_ITEM_STATUS_LABELS[status]}
        </Badge>
    );
}
