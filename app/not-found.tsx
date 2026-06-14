import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40">
                    <Compass className="h-7 w-7 text-indigo-500" />
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    404
                </p>
                <h1 className="mt-1 text-xl font-semibold text-foreground">
                    Page not found
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    The page you&apos;re looking for doesn&apos;t exist or may have been moved.
                </p>
                <div className="mt-6 flex justify-center">
                    <Link
                        href="/home"
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                    >
                        <Home className="h-4 w-4" />
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
