import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-level loading placeholder shown via Next.js loading.tsx while a
 * server component fetches. Gives instant feedback instead of a frozen blank
 * screen (progressive-loading). Approximates the common "header + card grid"
 * layout used across the app; `variant="list"` better fits feed/table pages.
 */
export function PageLoadingSkeleton({ variant = "grid" }: { variant?: "grid" | "list" }) {
    return (
        <div
            className="container mx-auto max-w-6xl py-8 space-y-6 px-4 md:px-6"
            aria-busy="true"
            aria-live="polite"
            role="status"
        >
            <span className="sr-only">Loading…</span>

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-4 w-60" />
                </div>
                <Skeleton className="h-10 w-28 rounded-xl" />
            </div>

            {variant === "grid" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-2xl border bg-card p-6 space-y-3">
                            <Skeleton className="h-11 w-11 rounded-xl" />
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
                            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                            <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
