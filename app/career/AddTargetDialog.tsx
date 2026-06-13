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
import { addCareerTarget } from "./actions";

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
    triggerLabel = "Add target",
    compact = false,
}: {
    prefill?: Prefill;
    triggerLabel?: string;
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {compact ? (
                    <Button size="sm" variant="outline" className="gap-1.5">
                        <PlusCircle className="w-4 h-4" />
                        {triggerLabel}
                    </Button>
                ) : (
                    <Button className="gap-2">
                        <PlusCircle className="w-4 h-4" />
                        {triggerLabel}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <form
                    action={async (formData) => {
                        await addCareerTarget(formData);
                        setOpen(false);
                    }}
                    className="space-y-4"
                >
                    <DialogHeader>
                        <DialogTitle>Add target university</DialogTitle>
                        <DialogDescription>
                            Track a university and specialty you want to apply for, with its grant
                            cutoff and deadline.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="university">University</Label>
                        <Input
                            id="university"
                            name="university"
                            required
                            maxLength={200}
                            defaultValue={prefill?.university ?? ""}
                            placeholder="e.g. Nazarbayev University"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty</Label>
                        <Input
                            id="specialty"
                            name="specialty"
                            required
                            maxLength={200}
                            defaultValue={prefill?.specialty ?? ""}
                            placeholder="e.g. Computer Science"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cutoff_score">Grant cutoff (/140)</Label>
                            <Input
                                id="cutoff_score"
                                name="cutoff_score"
                                type="number"
                                min={0}
                                max={140}
                                defaultValue={prefill?.cutoff_score ?? ""}
                                placeholder="e.g. 120"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="grant_deadline">Grant deadline</Label>
                            <Input id="grant_deadline" name="grant_deadline" type="date" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full">
                            Add target
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
