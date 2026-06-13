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
                    ? "Marked as found. Claimants have been notified."
                    : next === "claimed"
                        ? "Marked as returned to its owner."
                        : "Moved back to lost."
            );
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update status.";
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
                        Mark Lost
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
                        Mark Found (located)
                    </Button>
                )}
            </div>

            {status !== "claimed" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <HandHeart className="w-4 h-4 text-emerald-600" />
                        Hand back to owner
                    </p>
                    {claimants.length > 0 ? (
                        <>
                            <p className="text-xs text-slate-500">
                                Select which claimant physically received the item. Only registered claimants can be chosen.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Select value={selectedClaimant} onValueChange={setSelectedClaimant}>
                                    <SelectTrigger className="h-11 bg-white w-full sm:flex-grow">
                                        <SelectValue placeholder="Select the claimant…" />
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
                                    Mark Claimed
                                </Button>
                            </div>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">
                            No one has claimed this item yet — there is nobody to hand it to.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
