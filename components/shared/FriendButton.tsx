"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FriendButtonProps {
    targetUserId: string;
    currentUserId: string | null;
    initialStatus: "none" | "pending_sent" | "pending_received" | "accepted";
    friendshipId?: string;
}

export function FriendButton({ targetUserId, currentUserId, initialStatus, friendshipId }: FriendButtonProps) {
    const router = useRouter();
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);

    async function handleAction(action: string) {
        if (!currentUserId) {
            router.push("/login");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, targetUserId, friendshipId }),
            });

            const data = await res.json();

            if (data.success) {
                if (action === "add") setStatus("pending_sent");
                else if (action === "accept") setStatus("accepted");
                else if (action === "remove") setStatus("none");
                router.refresh();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (status === "accepted") {
        return (
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1 text-green-600 border-green-200 bg-green-50" disabled>
                    <UserCheck className="w-4 h-4" />
                    Friends
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleAction("remove")}
                    disabled={loading}
                >
                    <UserMinus className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    if (status === "pending_sent") {
        return (
            <Button variant="outline" size="sm" className="gap-1 text-amber-600" disabled>
                <Clock className="w-4 h-4" />
                Request Sent
            </Button>
        );
    }

    if (status === "pending_received") {
        return (
            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction("accept")}
                    disabled={loading}
                >
                    <UserCheck className="w-4 h-4" />
                    Accept
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500"
                    onClick={() => handleAction("remove")}
                    disabled={loading}
                >
                    Decline
                </Button>
            </div>
        );
    }

    // status === "none"
    return (
        <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => handleAction("add")}
            disabled={loading}
        >
            <UserPlus className="w-4 h-4" />
            {loading ? "Sending..." : "Add Friend"}
        </Button>
    );
}
