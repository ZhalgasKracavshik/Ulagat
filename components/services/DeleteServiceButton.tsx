"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteService } from "@/app/services/actions";
import { useT } from "@/hooks/useT";

/** Delete a service listing behind a confirmation — a bare one-click form
 *  removed it permanently with no undo. deleteService redirects to /services
 *  on success, so we don't swallow that. */
export function DeleteServiceButton({ id }: { id: string }) {
    const { t } = useT();
    const [busy, start] = useTransition();

    function onConfirm() {
        start(async () => {
            await deleteService(id);
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
                <Button variant="ghost" size="sm" disabled={busy} className="text-destructive hover:bg-red-50 hover:text-red-700">
                    {t("serviceDetail.deleteService")}
                </Button>
            }
        />
    );
}
