"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleReaction } from "@/app/achievements/reactions-actions";
import { useT } from "@/hooks/useT";
import type { AchievementReactions, ReactionKind } from "@/types";

/** Clapping-hands outline icon — lucide has no clap glyph, so we ship our own
 *  in the same 24px / stroke-2 style (SVG illustration, not emoji, by design). */
function ClapIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
            <path d="M11 21c-2.5 0-4.6-1-6-2.6L2.6 15c-.8-1-.7-2.4.2-3.2.9-.8 2.2-.7 3 .2" />
            <path d="M5.8 12 3.3 8.9c-.8-1-.6-2.4.4-3.1 1-.8 2.3-.6 3.1.4l4.5 5.6" />
            <path d="M7.1 6.9 6.2 5.7c-.8-1-.6-2.4.4-3.1 1-.8 2.3-.6 3.1.4l4.8 6" />
            <path d="M13.4 6.9c-.4-1.2 0-2.5 1.1-3.1 1.1-.6 2.5-.2 3.1.9l3 5.5c1.7 3.1.9 7-1.9 9.2-2 1.6-4.7 1.9-7 .9" />
        </svg>
    );
}

type Props = {
    achievementId: string;
    initial: AchievementReactions;
    /** Compact = smaller paddings for dense feed rows. */
    compact?: boolean;
};

export default function ReactionButtons({ achievementId, initial, compact }: Props) {
    const { t } = useT();
    const [state, setState] = useState(initial);
    // Per-kind in-flight guard: ignore rapid repeat clicks so two concurrent
    // toggles can't cancel out on the client while the DB keeps one row (the
    // bug the server's `active` return exists to resolve).
    const [busy, setBusy] = useState<Record<ReactionKind, boolean>>({ heart: false, clap: false });

    async function toggle(kind: ReactionKind) {
        if (busy[kind]) return;
        const current = kind === "heart" ? state.myHeart : state.myClap;
        setBusy((b) => ({ ...b, [kind]: true }));
        setState((s) => setKind(s, kind, !current)); // optimistic
        const result = await toggleReaction(achievementId, kind);
        // Reconcile to the server's authoritative truth (revert on failure).
        const truth = result.success ? result.active : current;
        setState((s) => setKind(s, kind, truth));
        setBusy((b) => ({ ...b, [kind]: false }));
    }

    const base = `inline-flex items-center gap-1 rounded-full border transition-colors ${
        compact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    }`;

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => toggle("heart")}
                aria-label={t("feed.heartAria")}
                aria-pressed={state.myHeart}
                className={`${base} ${
                    state.myHeart
                        ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                        : "border-border text-muted-foreground hover:text-rose-600 hover:border-rose-300"
                }`}
            >
                <Heart className={compact ? "w-3.5 h-3.5" : "w-4 h-4"}
                    fill={state.myHeart ? "currentColor" : "none"} />
                {state.hearts > 0 && <span>{state.hearts}</span>}
            </button>
            <button
                type="button"
                onClick={() => toggle("clap")}
                aria-label={t("feed.clapAria")}
                aria-pressed={state.myClap}
                className={`${base} ${
                    state.myClap
                        ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                        : "border-border text-muted-foreground hover:text-amber-600 hover:border-amber-300"
                }`}
            >
                <ClapIcon className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                {state.claps > 0 && <span>{state.claps}</span>}
            </button>
        </div>
    );
}

/** Force a kind's on/off state to `active`, keeping the count consistent.
 *  Idempotent: reconciling to a value the state already holds is a no-op. */
function setKind(s: AchievementReactions, kind: ReactionKind, active: boolean): AchievementReactions {
    if (kind === "heart") {
        if (s.myHeart === active) return s;
        return { ...s, myHeart: active, hearts: Math.max(0, s.hearts + (active ? 1 : -1)) };
    }
    if (s.myClap === active) return s;
    return { ...s, myClap: active, claps: Math.max(0, s.claps + (active ? 1 : -1)) };
}
