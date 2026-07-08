"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/useT";

/** Shares the current event via the Web Share API, falling back to copying the
 *  link to the clipboard. Replaces the previously inert Share button (it sat in
 *  a server component and did nothing). */
export function ShareEventButton({ title }: { title: string }) {
    const { t } = useT();

    async function share() {
        const url = typeof window !== "undefined" ? window.location.href : "";
        try {
            if (navigator.share) {
                await navigator.share({ title, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success(t("events.linkCopied"));
            }
        } catch {
            // User dismissed the share sheet, or clipboard was blocked — ignore.
        }
    }

    return (
        <Button variant="outline" className="w-full" onClick={share}>
            <Share2 className="w-4 h-4 mr-2" /> {t("events.shareEvent")}
        </Button>
    );
}
