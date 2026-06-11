"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveButtonProps extends ButtonProps {
    loadingText?: string;
    isLoading?: boolean; // Support external control
}

export function InteractiveButton({
    children,
    className,
    loadingText,
    isLoading: externalLoading,
    onClick,
    ...props
}: InteractiveButtonProps) {
    const { pending } = useFormStatus();
    const [internalLoading, setInternalLoading] = useState(false);

    const isPending = pending || externalLoading || internalLoading;

    async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        if (onClick) {
            setInternalLoading(true);
            try {
                await onClick(e);
            } finally {
                setInternalLoading(false);
            }
        }
    }

    return (
        <Button
            className={cn(
                "transition-all duration-200 active:scale-95",
                "hover:ring-2 hover:ring-offset-2 hover:ring-indigo-400/50",
                "focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600",
                className
            )}
            onClick={handleClick}
            disabled={isPending || props.disabled}
            {...props}
        >
            {isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText || children}
                </>
            ) : (
                children
            )}
        </Button>
    );
}
