"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/hooks/useT";

interface EventRegistrationButtonProps {
    eventId: string;
    isRegistered: boolean;
    isFull: boolean;
    isExpired: boolean;
    /** True when the registration deadline (Almaty date) has passed. */
    deadlinePassed?: boolean;
}

export function EventRegistrationButton({
    eventId,
    isRegistered: initialIsRegistered,
    isFull,
    isExpired,
    deadlinePassed = false
}: EventRegistrationButtonProps) {
    const { t } = useT();
    const [loading, setLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(initialIsRegistered);
    const router = useRouter();

    async function handleToggle() {
        setLoading(true);
        try {
            const method = isRegistered ? "DELETE" : "POST";
            const res = await fetch("/api/events/register", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event_id: eventId }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || t("events.toastGenericError"));
                return;
            }

            setIsRegistered(!isRegistered);
            toast.success(isRegistered ? t("events.toastUnregistered") : t("events.toastRegistered"));
            router.refresh();
        } catch (err) {
            toast.error(t("events.toastUpdateFailed"));
        } finally {
            setLoading(false);
        }
    }

    if (isExpired && !isRegistered) {
        return (
            <Button disabled className="w-full text-lg h-12 font-bold mb-2">
                {t("events.eventExpired")}
            </Button>
        );
    }

    if (deadlinePassed && !isRegistered) {
        return (
            <Button disabled variant="secondary" className="w-full text-lg h-12 font-bold mb-2">
                {t("events.registrationClosed")}
            </Button>
        );
    }

    if (isFull && !isRegistered) {
        return (
            <Button disabled variant="secondary" className="w-full text-lg h-12 font-bold mb-2">
                {t("events.eventFull")}
            </Button>
        );
    }

    return (
        <Button
            onClick={handleToggle}
            disabled={loading}
            variant={isRegistered ? "outline" : "default"}
            className={`w-full text-lg h-12 font-bold transition-all ${!isRegistered ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-xl" : ""
                }`}
        >
            {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRegistered ? (
                <>
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                    {t("events.unregister")}
                </>
            ) : (
                t("events.registerNow")
            )}
        </Button>
    );
}
