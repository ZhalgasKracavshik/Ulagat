"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Thin "use client" wrapper around next-themes' ThemeProvider so the rest of
 * the app (a server component layout) can mount it. Applies the active theme
 * via the `dark` class on <html> — the `.dark { … }` tokens already exist in
 * globals.css. Defaults to light; System follows the device.
 */
export function ThemeProvider({
    children,
    ...props
}: ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
