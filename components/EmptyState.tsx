import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * Consistent, instructive empty state ("teach the interface"): a tinted
 * signature icon, a clear title, optional guidance and an optional primary
 * action. Server-safe (no client hooks); tokenised for light/dark themes.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    tint = "bg-muted",
    iconColor = "text-muted-foreground",
    action,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    /** Tailwind background for the icon circle, e.g. "bg-indigo-50 dark:bg-indigo-950/40". */
    tint?: string;
    /** Tailwind text colour for the icon, e.g. "text-indigo-400". */
    iconColor?: string;
    action?: { href: string; label: string };
}) {
    return (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${tint}`}>
                <Icon className={`h-8 w-8 ${iconColor}`} aria-hidden />
            </div>
            <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
            {description && <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>}
            {action && (
                <Link
                    href={action.href}
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    {action.label}
                </Link>
            )}
        </div>
    );
}
