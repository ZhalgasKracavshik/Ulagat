"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Surface the error in the console for debugging / monitoring.
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
                    <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
                <h1 className="mt-5 text-xl font-semibold text-foreground">
                    Something went wrong
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    An unexpected error occurred. You can try again, or head back to your home page.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Try again
                    </button>
                    <Link
                        href="/home"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        <Home className="h-4 w-4" />
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    );
}
