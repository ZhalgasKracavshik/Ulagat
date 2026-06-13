"use client";

import { useContext } from "react";
import { UIPhaseContext } from "@/contexts/UIPhaseContext";

/**
 * Convenience hook for the two-phase (Express/Full) UI mode.
 * Must be used within a <UIPhaseProvider> (wired in app/layout.tsx).
 */
export function useUIPhase() {
    const ctx = useContext(UIPhaseContext);
    if (!ctx) {
        throw new Error("useUIPhase must be used within a UIPhaseProvider");
    }
    return ctx;
}
