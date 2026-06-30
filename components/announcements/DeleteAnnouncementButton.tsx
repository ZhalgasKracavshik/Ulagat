"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAnnouncement } from "@/app/announcements/actions";
import { useT } from "@/hooks/useT";

type DeleteAnnouncementButtonProps = {
    id: string;
};

export function DeleteAnnouncementButton({ id }: DeleteAnnouncementButtonProps) {
    const { t } = useT();
    const router = useRouter();
    const [isDeleting, startDeleting] = useTransition();

    const doDelete = () => {
        startDeleting(async () => {
            const result = await deleteAnnouncement(id);
            if ("error" in result) {
                toast.error(result.error);
                return;
            }
            toast.success(t("announcementForm.deleted"));
            router.refresh();
        });
    };

    return (
        <ConfirmDialog
            title={t("common.deleteTitle")}
            description={t("common.deleteIrreversible")}
            confirmLabel={t("common.delete")}
            onConfirm={doDelete}
            busy={isDeleting}
            trigger={
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isDeleting}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    aria-label={t("announcementForm.deleteAria")}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            }
        />
    );
}
