"use client";

import {
    createContext,
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import type { UIPhase } from "@/types";

const STORAGE_KEY = "ulagat-ui-phase";

/**
 * Auto-detect the suggested phase from the CLIENT device clock.
 *
 * This is intentionally device-local (new Date()) rather than the
 * Almaty server helpers: it runs in the browser, so the device's own
 * wall clock is already correct for the user. Before 09:00 we suggest
 * Express (morning transit); otherwise Full (evening at home).
 */
function autoDetectPhase(): UIPhase {
    const hour = new Date().getHours();
    return hour < 9 ? "express" : "full";
}

/**
 * The user-selectable mode. "express" / "full" are explicit overrides;
 * "auto" means "follow the device clock" (the original no-override behaviour).
 */
export type UIMode = "express" | "full" | "auto";

type UIPhaseContextValue = {
    phase: UIPhase;
    /** True once the value has been resolved from localStorage / auto-detect (avoids hydration flicker). */
    ready: boolean;
    /** True when the current value is an explicit user override, false when auto-detected. */
    isOverride: boolean;
    /** The selected mode: "express"/"full" (override) or "auto" (clock-driven). */
    mode: UIMode;
    setPhase: (phase: UIPhase) => void;
    /** Choose express/full (override) or auto (clear override, follow the clock). */
    setMode: (mode: UIMode) => void;
    /** Clear any override and return to clock-driven auto detection. */
    reset: () => void;
    toggle: () => void;
};

export const UIPhaseContext = createContext<UIPhaseContextValue | null>(null);

type ResolvedState = {
    phase: UIPhase;
    /** True once resolved from localStorage / auto-detect (avoids hydration flicker). */
    ready: boolean;
    /** True when the value is an explicit user override, false when auto-detected. */
    isOverride: boolean;
};

export function UIPhaseProvider({ children }: { children: ReactNode }) {
    // Start with a deterministic default so SSR and the first client render
    // match. The real value is resolved in a single setState in the mount
    // effect below (one update → no cascading renders).
    const [state, setState] = useState<ResolvedState>({
        phase: "full",
        ready: false,
        isOverride: false,
    });

    useEffect(() => {
        // localStorage can only be read after mount (it doesn't exist during
        // SSR), so resolving the real phase here is intentional and necessary
        // for hydration safety — this is a sync-with-external-system effect.
        let phase: UIPhase;
        let isOverride = false;
        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored === "express" || stored === "full") {
                phase = stored;
                isOverride = true;
            } else {
                phase = autoDetectPhase();
            }
        } catch {
            // localStorage unavailable (private mode etc.) — fall back to auto.
            phase = autoDetectPhase();
        }
        // Intentional: localStorage can't be read during SSR, so the real
        // phase must be resolved post-mount. SSR renders the stable "full"
        // default; this single setState then syncs the client. This is the
        // sanctioned hydration-safe pattern, not an avoidable cascade.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ phase, ready: true, isOverride });
    }, []);

    const setPhase = useCallback((next: UIPhase) => {
        // Persistence is handled by the effect below (single write path).
        setState((prev) => ({ ...prev, phase: next, isOverride: true }));
    }, []);

    const setMode = useCallback((next: UIMode) => {
        if (next === "auto") {
            // Clear the override and re-derive from the device clock.
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore — the in-memory reset below still applies.
            }
            setState((prev) => ({
                ...prev,
                phase: autoDetectPhase(),
                isOverride: false,
            }));
            return;
        }
        setState((prev) => ({ ...prev, phase: next, isOverride: true }));
    }, []);

    const reset = useCallback(() => {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore — the in-memory reset below still applies.
        }
        setState((prev) => ({
            ...prev,
            phase: autoDetectPhase(),
            isOverride: false,
        }));
    }, []);

    const toggle = useCallback(() => {
        // Derive the next phase from the latest state, then persist + set.
        // Keeping the persistence side effect out of the setState updater
        // keeps the updater pure (safe under StrictMode double-invoke).
        setState((prev) => {
            const next: UIPhase = prev.phase === "express" ? "full" : "express";
            return { ...prev, phase: next, isOverride: true };
        });
    }, []);

    // Persist whenever the phase changes as an explicit override.
    useEffect(() => {
        if (!state.ready || !state.isOverride) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, state.phase);
        } catch {
            // Ignore persistence failures — the in-memory value still works.
        }
    }, [state.phase, state.ready, state.isOverride]);

    return (
        <UIPhaseContext.Provider
            value={{
                phase: state.phase,
                ready: state.ready,
                isOverride: state.isOverride,
                mode: state.isOverride ? state.phase : "auto",
                setPhase,
                setMode,
                reset,
                toggle,
            }}
        >
            {children}
        </UIPhaseContext.Provider>
    );
}
