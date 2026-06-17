"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { useT } from "@/hooks/useT";

interface Friend {
    id: string;
    full_name: string;
    avatar_url: string;
}

interface NewGroupFormProps {
    friends: Friend[];
}

export function NewGroupForm({ friends }: NewGroupFormProps) {
    const { t } = useT();
    const [name, setName] = useState("");
    const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function toggleFriend(id: string) {
        setSelectedFriends(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    }

    async function handleCreate() {
        if (!name.trim()) {
            setError(t("newGroup.nameRequired"));
            return;
        }
        if (selectedFriends.length === 0) {
            setError(t("newGroup.selectMember"));
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), member_ids: selectedFriends }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || t("newGroup.createFailed"));
            }

            const data = await res.json();
            router.push(`/messages/group/${data.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t("newGroup.createFailed"));
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background py-10 px-4">
            <div className="mx-auto max-w-lg space-y-6">
                <Link href="/messages" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-4 h-4" /> {t("newGroup.back")}
                </Link>

                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            {t("newGroup.title")}
                        </CardTitle>
                        <CardDescription>{t("newGroup.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="group-name">{t("newGroup.nameLabel")}</Label>
                            <Input
                                id="group-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("newGroup.namePlaceholder")}
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>{t("newGroup.addMembers", { count: selectedFriends.length })}</Label>
                            {friends.length > 0 ? (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            onClick={() => toggleFriend(friend.id)}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedFriends.includes(friend.id)
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200'
                                                    : 'bg-card hover:bg-muted border-border'
                                                }`}
                                        >
                                            <Checkbox checked={selectedFriends.includes(friend.id)} />
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={friend.avatar_url} />
                                                <AvatarFallback>{friend.full_name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium text-sm text-foreground">{friend.full_name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t("newGroup.noFriends")}
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <Button
                            onClick={handleCreate}
                            disabled={loading || !name.trim() || selectedFriends.length === 0}
                            className="w-full h-12 text-base font-bold gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t("newGroup.creating")}
                                </>
                            ) : (
                                t("newGroup.create")
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
