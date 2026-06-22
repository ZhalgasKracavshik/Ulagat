import { cn } from "@/lib/utils";

/**
 * Low-level shimmer placeholder. Respects prefers-reduced-motion
 * (motion-reduce:animate-none) and uses the design-system muted token so it
 * works in both light and dark themes.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse motion-reduce:animate-none rounded-md bg-muted", className)}
            {...props}
        />
    );
}
