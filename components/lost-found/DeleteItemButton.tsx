"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteLostItem } from "@/app/lost-found/actions";
import { useT } from "@/hooks/useT";

const REDIRECT_DIGEST = "NEXT_REDIRECT";

export function DeleteItemButton({ itemId }: { itemId: string }) {
    const { t } = useT();
    const [isDeleting, startDeleting] = useTransition();

    const doDelete = () => {
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
        <ConfirmDialog
            title={t("common.deleteTitle")}
            description={t("common.deleteIrreversible")}
            confirmLabel={t("common.delete")}
            onConfirm={doDelete}
            busy={isDeleting}
            trigger={
                <Button
                    type="button"
                    variant="outline"
                    disabled={isDeleting}
                    className="gap-2 border-red-200 text-red-600 hover:bg-red-50 font-bold"
                >
                    <Trash2 className="w-4 h-4" />
                    {t("lostFoundClaim.delete")}
                </Button>
            }
        />
    );
}
