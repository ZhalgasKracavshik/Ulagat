"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Hand } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { claimItem } from "@/app/lost-found/actions";

export function ClaimButton({ itemId }: { itemId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState("");
    const router = useRouter();

    async function handleClaim() {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.set("item_id", itemId);
            formData.set("note", note);
            await claimItem(formData);
            toast.success("Claim registered. A moderator will verify and contact you.");
            setOpen(false);
            setNote("");
            router.refresh();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to register your claim.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    if (!open) {
        return (
            <Button
                onClick={() => setOpen(true)}
                className="w-full gap-2 bg-teal-600 hover:bg-teal-700 font-bold text-lg h-12"
            >
                <Hand className="w-5 h-5" />
                This is mine!
            </Button>
        );
    }

    return (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
            <p className="text-sm text-slate-600">
                Add a detail only the real owner would know (optional) — it helps staff verify your claim.
            </p>
            <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="e.g. There's a blue sticker on the back and a math notebook inside."
                className="min-h-[80px] resize-none bg-white"
            />
            <div className="flex gap-2">
                <Button
                    onClick={handleClaim}
                    disabled={loading}
                    className="flex-grow gap-2 bg-teal-600 hover:bg-teal-700 font-bold"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hand className="w-4 h-4" />}
                    Confirm claim
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    disabled={loading}
                >
                    Cancel
                </Button>
            </div>
        </div>
    );
}
