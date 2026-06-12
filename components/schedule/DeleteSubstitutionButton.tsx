"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSubstitution } from "@/app/schedule/substitutions/actions";

type DeleteSubstitutionButtonProps = {
    id: string;
};

export function DeleteSubstitutionButton({ id }: DeleteSubstitutionButtonProps) {
    const router = useRouter();
    const [isDeleting, startDeleting] = useTransition();

    const handleDelete = () => {
        startDeleting(async () => {
            const result = await deleteSubstitution(id);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            toast.success("Substitution deleted.");
            router.refresh();
        });
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            aria-label="Delete substitution"
        >
            <Trash2 className="w-4 h-4" />
        </Button>
    );
}
