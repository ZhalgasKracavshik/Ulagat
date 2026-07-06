"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { savePushSubscription, removePushSubscription } from "@/app/settings/push-actions";
import { useT } from "@/hooks/useT";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "loading" | "hidden" | "ios-install" | "blocked" | "off" | "on";

/** Decode a base64url VAPID public key into the ArrayBuffer subscribe() wants. */
function urlBase64ToBuffer(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const buffer = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
    return buffer;
}

function isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
}

/**
 * Web-push opt-in for the current browser. Env-gated (no VAPID public key →
 * renders nothing). On iOS Safari, push only works once the PWA is installed to
 * the home screen, so an un-installed iOS visitor sees install instructions
 * instead of a permission button.
 */
export function PushToggle() {
    const { t } = useT();
    const [state, setState] = useState<State>("loading");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            if (!VAPID) return setState("hidden");
            if (isIos() && !isStandalone()) return setState("ios-install");
            const supported =
                "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
            if (!supported) return setState("hidden");
            if (Notification.permission === "denied") return setState("blocked");
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                const sub = reg ? await reg.pushManager.getSubscription() : null;
                setState(sub ? "on" : "off");
            } catch {
                setState("off");
            }
        })();
    }, []);

    async function enable() {
        setBusy(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") {
                setState(perm === "denied" ? "blocked" : "off");
                return;
            }
            const reg = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToBuffer(VAPID!),
            });
            const result = await savePushSubscription(sub.toJSON());
            if (!result.success) {
                await sub.unsubscribe();
                toast.error(result.error);
                setState("off");
                return;
            }
            setState("on");
            toast.success(t("push.enabled"));
        } catch (err) {
            console.error("[push] enable failed:", err);
            toast.error(t("push.failed"));
            setState("off");
        } finally {
            setBusy(false);
        }
    }

    async function disable() {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = reg ? await reg.pushManager.getSubscription() : null;
            if (sub) {
                await removePushSubscription(sub.endpoint);
                await sub.unsubscribe();
            }
            setState("off");
            toast.success(t("push.disabled"));
        } catch (err) {
            console.error("[push] disable failed:", err);
        } finally {
            setBusy(false);
        }
    }

    if (state === "loading" || state === "hidden") return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    {t("push.title")}
                    {state === "on" && (
                        <Badge className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400">
                            {t("push.statusOn")}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("push.body")}</p>

                {state === "ios-install" && (
                    <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted px-3 py-3">
                        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                        <p className="text-sm text-muted-foreground">{t("push.iosInstall")}</p>
                    </div>
                )}

                {state === "blocked" && (
                    <p className="text-sm text-red-600">{t("push.blocked")}</p>
                )}

                {state === "off" && (
                    <Button onClick={enable} disabled={busy} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                        {t("push.enable")}
                    </Button>
                )}

                {state === "on" && (
                    <Button variant="outline" onClick={disable} disabled={busy} className="gap-2">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                        {t("push.disable")}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
