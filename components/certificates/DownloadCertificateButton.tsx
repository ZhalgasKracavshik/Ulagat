"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { getCertificateDownloadUrl } from "@/app/certificates/actions";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useT } from "@/hooks/useT";

/**
 * Fetches a short-lived signed URL for a ready certificate and starts the
 * download. The URL is minted per click (5-minute TTL) so nothing durable
 * ever leaks into the DOM or browser history.
 */
export function DownloadCertificateButton({ certificateId }: { certificateId: string }) {
    const { t } = useT();
    const [isLoading, startLoading] = useTransition();

    const handleDownload = () => {
        startLoading(async () => {
            const result = await getCertificateDownloadUrl(certificateId);
            if ("error" in result) {
                toast.error(result.error || t("certificates.downloadFailed"));
                return;
            }
            // The signed URL carries Content-Disposition: attachment, so this
            // triggers a file save rather than a navigation.
            window.location.href = result.url;
        });
    };

    return (
        <Button
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t("certificates.download")}
        </Button>
    );
}
