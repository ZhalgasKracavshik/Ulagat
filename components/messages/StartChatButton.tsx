"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { startConversation } from "@/app/messages/[id]/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function StartChatButton({ ownerId }: { ownerId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handledChatStart = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent linking if inside a Link component
        startTransition(async () => {
            try {
                const conversationId = await startConversation(ownerId);
                router.push(`/messages/${conversationId}`);
            } catch (error) {
                console.error("Failed to start chat:", error);
                // Ideally toast notification here.
                // Assuming error might be "Unauthorized" -> redirect to login manually or let Middleware handle
                router.push('/login');
            }
        });
    };

    return (
        <Button
            size="sm"
            className="rounded-full bg-green-500 hover:bg-green-600 shadow-green-200 shadow-lg text-white gap-1 px-4 z-10 relative"
            onClick={handledChatStart}
            disabled={isPending}
        >
            <MessageCircle className="w-4 h-4" />
            <span>{isPending ? 'Connecting...' : 'Chat'}</span>
        </Button>
    );
}
