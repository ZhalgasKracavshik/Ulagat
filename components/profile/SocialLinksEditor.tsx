"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/hooks/useT";

const SOCIAL_NETWORKS = [
    { value: "instagram", labelKey: "socialLinks.instagram", placeholder: "https://instagram.com/username" },
    { value: "telegram", labelKey: "socialLinks.telegram", placeholder: "https://t.me/username" },
    { value: "tiktok", labelKey: "socialLinks.tiktok", placeholder: "https://tiktok.com/@username" },
    { value: "youtube", labelKey: "socialLinks.youtube", placeholder: "https://youtube.com/@channel" },
    { value: "twitter", labelKey: "socialLinks.twitter", placeholder: "https://twitter.com/username" },
    { value: "github", labelKey: "socialLinks.github", placeholder: "https://github.com/username" },
    { value: "linkedin", labelKey: "socialLinks.linkedin", placeholder: "https://linkedin.com/in/name" },
    { value: "vk", labelKey: "socialLinks.vk", placeholder: "https://vk.com/id" },
    { value: "other", labelKey: "socialLinks.other", placeholder: "https://..." },
];

interface SocialLink {
    network: string;
    url: string;
}

interface SocialLinksEditorProps {
    initialLinks: SocialLink[];
}

export function SocialLinksEditor({ initialLinks }: SocialLinksEditorProps) {
    const { t } = useT();
    const [links, setLinks] = useState<SocialLink[]>(
        initialLinks.length > 0 ? initialLinks : []
    );

    function addLink() {
        if (links.length >= 5) return;
        setLinks([...links, { network: "instagram", url: "" }]);
    }

    function removeLink(index: number) {
        setLinks(links.filter((_, i) => i !== index));
    }

    function updateLink(index: number, field: keyof SocialLink, value: string) {
        const updated = [...links];
        updated[index] = { ...updated[index], [field]: value };
        setLinks(updated);
    }

    return (
        <div className="space-y-3">
            {/* Hidden input to send JSON data to server action */}
            <input type="hidden" name="social_links" value={JSON.stringify(links)} />

            {links.map((link, index) => {
                const networkInfo = SOCIAL_NETWORKS.find((n) => n.value === link.network);
                return (
                    <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

                        <Select
                            value={link.network}
                            onValueChange={(v) => updateLink(index, "network", v)}
                        >
                            <SelectTrigger className="w-[140px] shrink-0 bg-card">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SOCIAL_NETWORKS.map((sn) => (
                                    <SelectItem key={sn.value} value={sn.value}>
                                        {t(sn.labelKey)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Input
                            value={link.url}
                            onChange={(e) => updateLink(index, "url", e.target.value)}
                            placeholder={networkInfo?.placeholder || "https://..."}
                            className="flex-1 bg-card"
                        />

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-600 shrink-0"
                            onClick={() => removeLink(index)}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                );
            })}

            {links.length < 5 && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed"
                    onClick={addLink}
                >
                    <Plus className="w-4 h-4" />
                    {t("socialLinks.add")}
                </Button>
            )}

            {links.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                    {t("socialLinks.empty")}
                </p>
            )}
        </div>
    );
}
