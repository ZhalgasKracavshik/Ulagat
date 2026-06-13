"use client";

import { useUIPhase } from "@/hooks/useUIPhase";
import { FullDashboard, type FullDashboardData } from "./FullDashboard";
import { ExpressDashboard, type ExpressData } from "@/components/express/ExpressDashboard";

export function HomeView({
    full,
    express,
}: {
    full: FullDashboardData;
    express: ExpressData;
}) {
    const { phase, ready } = useUIPhase();

    // Until the phase is resolved from localStorage/auto-detect, render the
    // full dashboard as the stable default (matches SSR, avoids a flash of
    // the wrong layout). `ready` flips on the client after mount.
    if (ready && phase === "express") {
        return <ExpressDashboard data={express} />;
    }

    return <FullDashboard data={full} />;
}
