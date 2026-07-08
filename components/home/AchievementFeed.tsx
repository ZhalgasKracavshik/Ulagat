"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VenetianMask, Medal } from "lucide-react";
import ReactionButtons from "@/components/achievements/ReactionButtons";
import { anonymousPseudonym } from "@/lib/leaderboard";
import { useT } from "@/hooks/useT";
import type { FeedAchievement } from "@/lib/achievements/feed";

const TIER_STYLES: Record<FeedAchievement["tier"], string> = {
    school: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    city: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    national: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

/** School-wide feed of freshly verified achievements (evening dashboard). */
export function AchievementFeed({ items }: { items: FeedAchievement[] }) {
    const { t } = useT();
    if (items.length === 0) return null; // empty pilot DB: hide the block entirely

    return (
        <section className="mt-7">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
                <Medal className="h-4 w-4 text-amber-500" />
                {t("feed.title")}
            </h2>
            <ul className="space-y-2">
                {items.map((a) => {
                    const anon = a.author_anonymous;
                    const name = anon ? anonymousPseudonym(a.user_id, t("leaderboard.anonymousName")) : a.author_name;
                    return (
                        <li
                            key={a.id}
                            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                        >
                            <Avatar className="h-9 w-9 shrink-0">
                                {!anon && a.author_avatar && (
                                    <AvatarImage src={a.author_avatar} className="object-cover" />
                                )}
                                <AvatarFallback>
                                    {anon ? (
                                        <VenetianMask className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        name?.[0]
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                {anon ? (
                                    <span className="text-sm font-semibold text-foreground">
                                        {name}
                                    </span>
                                ) : (
                                    <Link
                                        href={`/profile/${a.user_id}`}
                                        className="text-sm font-semibold text-foreground hover:underline"
                                    >
                                        {name}
                                    </Link>
                                )}
                                <p className="truncate text-xs text-muted-foreground">
                                    {a.title}
                                    <span
                                        className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TIER_STYLES[a.tier]}`}
                                    >
                                        {t(`feed.tier.${a.tier}`)}
                                    </span>
                                </p>
                            </div>
                            <ReactionButtons achievementId={a.id} initial={a.reactions} compact />
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
