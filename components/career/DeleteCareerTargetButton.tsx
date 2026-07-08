"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCareerTarget } from "@/app/career/actions";
import { useT } from "@/hooks/useT";

/** Delete a saved target university behind a confirmation — a bare one-click
 *  form permanently removed it with no undo. */
export function DeleteCareerTargetButton({ targetId }: { targetId: string }) {
    const { t } = useT();
    const router = useRouter();
    const [busy, start] = useTransition();

    function onConfirm() {
        start(async () => {
            try {
                const fd = new FormData();
                fd.set("target_id", targetId);
                await deleteCareerTarget(fd);
                router.refresh();
            } catch {
                toast.error(t("common.actionFailed"));
            }
        });
    }

    return (
        <ConfirmDialog
            title={t("common.deleteTitle")}
            description={t("common.deleteIrreversible")}
            confirmLabel={t("common.delete")}
            onConfirm={onConfirm}
            busy={busy}
            trigger={
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    className="text-muted-foreground hover:text-red-600 shrink-0"
                    aria-label={t("career.removeTarget")}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            }
        />
    );
}
