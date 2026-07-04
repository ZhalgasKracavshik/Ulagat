"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { resolvePlan } from "@/lib/subscription-plan";

export type NavData = {
    user: AuthUser | null;
    profile: (Profile & { reputation?: number }) | null;
    pendingFriendRequests: number;
    pendingModerationCount: number;
    isPremium: boolean;
};

/**
 * Shared chrome data for the desktop sidebar and the mobile navbar: current
 * user + profile, pending friend/moderation badge counts, premium status.
 * Seeded from server-resolved props so the first paint shows the right chrome
 * (no guest flash), then refreshed client-side. Extracted from Navbar so the
 * Sidebar reuses the exact same logic instead of duplicating it.
 */
export function useNavData(
    initialUserId: string | null,
    initialProfile: (Profile & { reputation?: number }) | null
): NavData {
    const [user, setUser] = useState<AuthUser | null>(
        initialUserId ? ({ id: initialUserId } as unknown as AuthUser) : null
    );
    const [profile, setProfile] = useState<(Profile & { reputation?: number }) | null>(initialProfile);
    const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
    const [pendingModerationCount, setPendingModerationCount] = useState(0);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (!user) return;

            const [{ data: profileData }, { count: friendshipCount }, { data: subscription }] = await Promise.all([
                supabase.from("profiles").select("*").eq("id", user.id).single(),
                supabase.from("friendships").select("*", { count: "exact", head: true }).eq("addressee_id", user.id).eq("status", "pending"),
                supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", user.id).maybeSingle(),
            ]);
            setProfile(profileData);
            setPendingFriendRequests(friendshipCount || 0);
            setIsPremium(resolvePlan(subscription ?? null, Date.now()) === "premium");

            if (profileData?.role === "admin" || profileData?.role === "moderator") {
                const [{ count: sCount }, { count: eCount }, { count: mCount }] = await Promise.all([
                    supabase.from("services").select("*", { count: "exact", head: true }).eq("status", "pending"),
                    supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "pending"),
                    supabase.from("study_materials").select("*", { count: "exact", head: true }).eq("status", "pending"),
                ]);
                setPendingModerationCount((sCount || 0) + (eCount || 0) + (mCount || 0));
            }
        };

        fetchUserData();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // The server seed + the direct fetchUserData() already cover the first
            // load; skip INITIAL_SESSION so the fetch cascade doesn't run twice.
            if (_event === "INITIAL_SESSION") return;
            setUser(session?.user ?? null);
            if (!session) {
                setProfile(null);
                setPendingFriendRequests(0);
                setPendingModerationCount(0);
                setIsPremium(false);
            } else {
                fetchUserData();
            }
        });

        return () => subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { user, profile, pendingFriendRequests, pendingModerationCount, isPremium };
}
