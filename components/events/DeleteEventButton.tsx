"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteEvent } from "@/app/events/actions";
import { useT } from "@/hooks/useT";

/** Delete an event behind a confirmation. Deletion also removes every
 *  registration, so a bare one-click button was too easy to trigger by mistake.
 *  deleteEvent redirects to /events on success, so we don't swallow that. */
export function DeleteEventButton({ id }: { id: string }) {
    const { t } = useT();
    const [busy, start] = useTransition();

    function onConfirm() {
        start(async () => {
            await deleteEvent(id);
        });
    }

    return (
        <ConfirmDialog
            title={t("common.deleteTitle")}
            description={t("events.confirmDelete")}
            confirmLabel={t("common.delete")}
            onConfirm={onConfirm}
            busy={busy}
            trigger={
                <Button variant="destructive" size="sm" className="shadow-lg" disabled={busy}>
                    {t("events.deleteEvent")}
                </Button>
            }
        />
    );
}
