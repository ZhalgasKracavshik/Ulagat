"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CHROMELESS_ROUTES } from "@/lib/nav-config";

/**
 * Wraps page content in <main>, applying the app-chrome spacing (bottom padding
 * for the mobile tab bar, left padding for the desktop sidebar) on app routes,
 * and nothing on the full-bleed landing/auth routes so those stay edge-to-edge.
 */
export function MainShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const chromeless = CHROMELESS_ROUTES.includes(pathname);
    return <main className={chromeless ? "flex-1" : "flex-1 pb-20 md:pb-0 md:pl-64"}>{children}</main>;
}
