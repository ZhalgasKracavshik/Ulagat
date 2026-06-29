"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAnnouncement } from "@/app/announcements/actions";
import { useT } from "@/hooks/useT";

type DeleteAnnouncementButtonProps = {
    id: string;
};

/**
 * Delete with a two-click confirmation: the first click arms the button
 * ("Click again to confirm"); it disarms automatically after 3 seconds.
 */
export function DeleteAnnouncementButton({ id }: DeleteAnnouncementButtonProps) {
    const { t } = useT();
    const router = useRouter();
    const [isDeleting, startDeleting] = useTransition();
    const [armed, setArmed] = useState(false);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear the pending disarm timer on unmount.
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
            const result = await deleteAnnouncement(id);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            toast.success(t("announcementForm.deleted"));
            router.refresh();
        });
    };

    if (armed) {
        return (
            <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleClick}
                disabled={isDeleting}
                className="gap-1.5 text-xs"
                aria-label={t("announcementForm.deleteConfirmAria")}
            >
                <Trash2 className="w-3.5 h-3.5" />
                {t("announcementForm.deleteConfirm")}
            </Button>
        );
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            aria-label={t("announcementForm.deleteAria")}
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
}
