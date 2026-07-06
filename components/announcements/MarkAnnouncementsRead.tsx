"use client";

import { useEffect } from "react";
import { markAllAnnouncementsRead } from "@/app/announcements/read-actions";

/**
 * Fire-and-forget: marks all visible announcements read once when the
 * /announcements page mounts, so the nav unread badge clears after the user
 * has actually seen the list. Renders nothing.
 */
export function MarkAnnouncementsRead() {
    useEffect(() => {
        markAllAnnouncementsRead().catch(() => {
            // Non-fatal — the badge just stays until the next visit.
        });
    }, []);
    return null;
}
