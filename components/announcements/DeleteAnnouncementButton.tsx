"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAnnouncement } from "@/app/announcements/actions";

type DeleteAnnouncementButtonProps = {
    id: string;
};

export function DeleteAnnouncementButton({ id }: DeleteAnnouncementButtonProps) {
    const router = useRouter();
    const [isDeleting, startDeleting] = useTransition();

    const handleDelete = () => {
        startDeleting(async () => {
            const result = await deleteAnnouncement(id);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            toast.success("Announcement deleted.");
            router.refresh();
        });
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            aria-label="Delete announcement"
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
}
