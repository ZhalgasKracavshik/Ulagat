import { Badge } from "@/components/ui/badge";
import type { SubstitutionType } from "@/types";

const STYLES: Record<SubstitutionType, { label: string; className: string }> = {
    substitution: { label: 'Substitution', className: 'bg-orange-100 text-orange-700 border-orange-200' },
    cancellation: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
    room_change: { label: 'Room change', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

/** Badge showing the substitution type. No hooks — usable from server and client components. */
export function SubstitutionBadge({ type, className }: { type: SubstitutionType; className?: string }) {
    const style = STYLES[type];
    return <Badge className={`${style.className}${className ? ` ${className}` : ''}`}>{style.label}</Badge>;
}
