"use client";

import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveButtonProps extends ButtonProps {
    loadingText?: string;
    shouldShowLoader?: boolean;
}

export function InteractiveButton({
    children,
    className,
    loadingText,
    shouldShowLoader = true,
    onClick,
    ...props
}: InteractiveButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        if (shouldShowLoader) {
            setIsLoading(true);
            // Most actions here are links or form submissions, 
            // but we can simulate/show loader until navigation happens
        }
        if (onClick) await onClick(e);
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
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading && shouldShowLoader ? (
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
