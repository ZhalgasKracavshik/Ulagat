"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useT } from "@/hooks/useT";

/**
 * Shows a one-time toast based on the ?status=success|cancel flag that Stripe
 * appends on redirect back from Checkout. The premium flip itself is driven by
 * the webhook, so success here only confirms the payment flow returned.
 */
export function CheckoutStatusToast({ status }: { status?: string }) {
    const { t } = useT();
    const shown = useRef(false);

    useEffect(() => {
        if (shown.current) return;
        if (status === "success") {
            toast.success(t("pricing.paymentReceived"));
            shown.current = true;
        } else if (status === "cancel") {
            toast.info(t("pricing.checkoutCanceled"));
            shown.current = true;
        }
    }, [status, t]);

    return null;
}
