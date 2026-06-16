"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLostItem } from "@/app/lost-found/actions";
import { useT } from "@/hooks/useT";

const REDIRECT_DIGEST = "NEXT_REDIRECT";

/**
 * Delete with a two-click confirmation: the first click arms the button
 * ("Click again to confirm"); it disarms automatically after 3 seconds.
 * The server action redirects to /lost-found on success.
 */
export function DeleteItemButton({ itemId }: { itemId: string }) {
    const { t } = useT();
    const [isDeleting, startDeleting] = useTransition();
    const [armed, setArmed] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
        };
    }, []);

    const handleClick = () => {
        if (!armed) {
            setArmed(true);
            resetTimer.current = setTimeout(() => setArmed(false), 3000);
            return;
        }

        if (resetTimer.current) clearTimeout(resetTimer.current);
        setArmed(false);
        startDeleting(async () => {
            try {
                const formData = new FormData();
                formData.set("item_id", itemId);
                await deleteLostItem(formData);
                // Successful deletes redirect — control rarely returns here.
            } catch (err) {
                // The redirect surfaces as a thrown NEXT_REDIRECT — let it through.
                if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest).startsWith(REDIRECT_DIGEST)) {
                    throw err;
                }
                const message = err instanceof Error ? err.message : t("lostFoundClaim.deleteFailed");
                toast.error(message);
            }
        });
    };

    return (
        <Button
            type="button"
            variant={armed ? "destructive" : "outline"}
            onClick={handleClick}
            disabled={isDeleting}
            className={armed ? "gap-2 font-bold" : "gap-2 border-red-200 text-red-600 hover:bg-red-50 font-bold"}
        >
            <Trash2 className="w-4 h-4" />
            {armed ? t("lostFoundClaim.deleteConfirm") : t("lostFoundClaim.delete")}
        </Button>
    );
}
