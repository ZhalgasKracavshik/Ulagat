import type { SupabaseClient } from "@supabase/supabase-js";
import type { AchievementReactions } from "@/types";

export type FeedAchievement = {
    id: string;
    title: string;
    tier: "school" | "city" | "national";
    achievement_date: string | null;
    created_at: string;
    user_id: string;
    author_name: string;
    author_avatar: string | null;
    author_anonymous: boolean;
    reactions: AchievementReactions;
};

type ReactionRow = { achievement_id: string; user_id: string; kind: string };

/** Aggregates raw reaction rows into per-achievement UI state for `viewerId`. */
export function aggregateReactions(
    rows: ReactionRow[],
    achievementIds: string[],
    viewerId: string,
): Map<string, AchievementReactions> {
    const map = new Map<string, AchievementReactions>();
    for (const id of achievementIds) {
        map.set(id, { hearts: 0, claps: 0, myHeart: false, myClap: false });
    }
    for (const r of rows) {
        const agg = map.get(r.achievement_id);
        if (!agg) continue;
        if (r.kind === "heart") {
            agg.hearts += 1;
            if (r.user_id === viewerId) agg.myHeart = true;
        } else if (r.kind === "clap") {
            agg.claps += 1;
            if (r.user_id === viewerId) agg.myClap = true;
        }
    }
    return map;
}

type JoinedProfile = {
    full_name: string | null;
    avatar_url: string | null;
    leaderboard_anonymous: boolean | null;
};

/** Last N verified achievements school-wide, with author + reactions. */
export async function fetchAchievementFeed(
    supabase: SupabaseClient,
    viewerId: string,
    limit = 5,
): Promise<FeedAchievement[]> {
    const { data: achievements, error } = await supabase
        .from("achievements")
        .select(
            "id, title, tier, achievement_date, created_at, user_id, profiles:user_id(full_name, avatar_url, leaderboard_anonymous)",
        )
        .eq("status", "verified")
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error || !achievements || achievements.length === 0) {
        if (error) console.error("fetchAchievementFeed error:", error);
        return [];
    }

    const ids = achievements.map((a) => a.id as string);
    const { data: reactionRows, error: reactionsError } = await supabase
        .from("achievement_reactions")
        .select("achievement_id, user_id, kind")
        .in("achievement_id", ids);
    if (reactionsError) console.error("fetchAchievementFeed reactions error:", reactionsError);
    const reactions = aggregateReactions(reactionRows ?? [], ids, viewerId);

    return achievements.map((a) => {
        const p = (Array.isArray(a.profiles) ? a.profiles[0] : a.profiles) as
            | JoinedProfile
            | null;
        return {
            id: a.id as string,
            title: (a.title as string) ?? "",
            tier: (a.tier as FeedAchievement["tier"]) ?? "school",
            achievement_date: (a.achievement_date as string | null) ?? null,
            created_at: a.created_at as string,
            user_id: a.user_id as string,
            author_name: p?.full_name ?? "",
            author_avatar: p?.avatar_url ?? null,
            author_anonymous: p?.leaderboard_anonymous === true,
            reactions: reactions.get(a.id as string)!,
        };
    });
}
