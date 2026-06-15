
import { Badge } from "@/components/ui/badge";
import { Link, ShieldCheck, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartBadgeProps {
    points: number;
    className?: string;
}

export function SmartBadge({ points, className }: SmartBadgeProps) {
    let tier = "Newcomer";
    let colorClass = "bg-muted text-foreground border-border";
    let Icon = Shield;

    if (points >= 1000) {
        tier = "Legend";
        colorClass = "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200";
        Icon = ShieldCheck;
    } else if (points >= 500) {
        tier = "Expert";
        colorClass = "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200";
        Icon = ShieldCheck;
    } else if (points >= 100) {
        tier = "Trusted";
        colorClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200";
        Icon = ShieldCheck;
    }

    return (
        <Badge variant="outline" className={cn("gap-1.5 py-1 px-3", colorClass, className)}>
            <Icon className="w-3.5 h-3.5" />
            <span className="font-semibold">{points} Pts</span>
            <span className="opacity-70 mx-1">•</span>
            <span>{tier}</span>
        </Badge>
    );
}
