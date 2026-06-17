"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { addCareerTarget } from "./actions";
import { useT } from "@/hooks/useT";

type Prefill = {
    university?: string;
    specialty?: string;
    cutoff_score?: number;
};

/**
 * "Add target university" dialog. Submits to the addCareerTarget server
 * action via a native form. Optionally pre-filled from the University
 * Explorer (then rendered as a compact trigger).
 */
export function AddTargetDialog({
    prefill,
    triggerLabel,
    compact = false,
}: {
    prefill?: Prefill;
    triggerLabel?: string;
    compact?: boolean;
}) {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const label = triggerLabel ?? t("careerDialog.addTarget");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {compact ? (
                    <Button size="sm" variant="outline" className="gap-1.5">
                        <PlusCircle className="w-4 h-4" />
                        {label}
                    </Button>
                ) : (
                    <Button className="gap-2">
                        <PlusCircle className="w-4 h-4" />
                        {label}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <form
                    action={async (formData) => {
                        const result = await addCareerTarget(formData);
                        if (result && "error" in result) {
                            toast.error(result.error);
                            return;
                        }
                        setOpen(false);
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>{t("careerDialog.title")}</DialogTitle>
                        <DialogDescription>
                            {t("careerDialog.description")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="university">{t("careerDialog.university")}</Label>
                        <Input
                            id="university"
                            name="university"
                            required
                            maxLength={200}
                            defaultValue={prefill?.university ?? ""}
                            placeholder={t("careerDialog.universityPlaceholder")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="specialty">{t("careerDialog.specialty")}</Label>
                        <Input
                            id="specialty"
                            name="specialty"
                            required
                            maxLength={200}
                            defaultValue={prefill?.specialty ?? ""}
                            placeholder={t("careerDialog.specialtyPlaceholder")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cutoff_score">{t("careerDialog.cutoff")}</Label>
                            <Input
                                id="cutoff_score"
                                name="cutoff_score"
                                type="number"
                                min={0}
                                max={140}
                                defaultValue={prefill?.cutoff_score ?? ""}
                                placeholder={t("careerDialog.cutoffPlaceholder")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grant_deadline">{t("careerDialog.deadline")}</Label>
                            <Input id="grant_deadline" name="grant_deadline" type="date" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full">
                            {t("careerDialog.addTarget")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
