"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, PackageCheck, HandHeart, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateItemStatus } from "@/app/lost-found/actions";
import { useT } from "@/hooks/useT";
import type { LostItemStatus } from "@/types";

export type Claimant = {
    id: string;
    name: string;
};

export function StatusManager({
    itemId,
    status,
    claimants,
}: {
    itemId: string;
    status: LostItemStatus;
    claimants: Claimant[];
}) {
    const { t } = useT();
    const [loading, setLoading] = useState<LostItemStatus | null>(null);
    const [selectedClaimant, setSelectedClaimant] = useState<string>("");
    const router = useRouter();

    async function changeStatus(next: LostItemStatus, claimantId?: string) {
        setLoading(next);
        try {
            const formData = new FormData();
            formData.set("item_id", itemId);
            formData.set("status", next);
            if (claimantId) formData.set("claimant_id", claimantId);
            await updateItemStatus(formData);
            toast.success(
                next === "found"
                    ? t("lostFoundStatus.markedFound")
                    : next === "claimed"
                        ? t("lostFoundStatus.markedClaimed")
                        : t("lostFoundStatus.movedBackToLost")
            );
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : t("lostFoundStatus.updateFailed");
            toast.error(message);
        } finally {
            setLoading(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {status !== "lost" && (
                    <Button
                        variant="outline"
                        onClick={() => changeStatus("lost")}
                        disabled={loading !== null}
                        className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                        {loading === "lost" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {t("lostFoundStatus.markLost")}
                    </Button>
                )}
                {status !== "found" && (
                    <Button
                        variant="outline"
                        onClick={() => changeStatus("found")}
                        disabled={loading !== null}
                        className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                        {loading === "found" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                        {t("lostFoundStatus.markFound")}
                    </Button>
                )}
            </div>

            {status !== "claimed" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <HandHeart className="w-4 h-4 text-emerald-600" />
                        {t("lostFoundStatus.handBack")}
                    </p>
                    {claimants.length > 0 ? (
                        <>
                            <p className="text-xs text-muted-foreground">
                                {t("lostFoundStatus.selectClaimantHint")}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select value={selectedClaimant} onValueChange={setSelectedClaimant}>
                                    <SelectTrigger className="h-11 bg-card w-full sm:flex-grow">
                                        <SelectValue placeholder={t("lostFoundStatus.selectClaimant")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {claimants.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={() => changeStatus("claimed", selectedClaimant)}
                                    disabled={loading !== null || !selectedClaimant}
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 font-bold shrink-0"
                                >
                                    {loading === "claimed" ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHeart className="w-4 h-4" />}
                                    {t("lostFoundStatus.markClaimed")}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            {t("lostFoundStatus.noClaimants")}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
