"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ContactTutorButtonProps {
    otherUserId: string;
    currentUserId: string | null;
}

export function ContactTutorButton({ otherUserId, currentUserId }: ContactTutorButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Don't show the button if viewing your own content
    if (currentUserId === otherUserId) return null;

    async function handleClick() {
        if (!currentUserId) {
            router.push("/login");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/conversations/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otherUserId }),
            });

            const data = await res.json();

            if (data.conversationId) {
                router.push(`/messages/${data.conversationId}`);
            } else {
                alert("Failed to start conversation");
            }
        } catch (err) {
            console.error(err);
            alert("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Button
            onClick={handleClick}
            disabled={loading}
            className="w-full mt-4 gap-2 font-bold shadow-lg shadow-primary/20"
        >
            <MessageCircle className="w-4 h-4" />
            {loading ? "Opening chat..." : "Contact Tutor"}
        </Button>
    );
}
