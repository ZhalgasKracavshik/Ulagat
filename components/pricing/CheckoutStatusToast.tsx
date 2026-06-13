"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Shows a one-time toast based on the ?status=success|cancel flag that Stripe
 * appends on redirect back from Checkout. The premium flip itself is driven by
 * the webhook, so success here only confirms the payment flow returned.
 */
export function CheckoutStatusToast({ status }: { status?: string }) {
    const shown = useRef(false);

    useEffect(() => {
        if (shown.current) return;
        if (status === "success") {
            toast.success("Payment received — your Premium access is being activated.");
            shown.current = true;
        } else if (status === "cancel") {
            toast.info("Checkout canceled. You can upgrade anytime.");
            shown.current = true;
        }
    }, [status]);

    return null;
}
