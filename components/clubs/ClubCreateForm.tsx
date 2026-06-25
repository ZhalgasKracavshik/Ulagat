"use client";

import { useState } from "react";
import { createClub } from "@/app/clubs/actions";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { CLUB_CATEGORIES } from "@/lib/clubs";
import { CLUB_CATEGORY_ICONS } from "@/components/clubs/category-icons";
import { clubCategoryKey } from "@/lib/clubs-i18n";
import { useT } from "@/hooks/useT";

type LeaderCandidate = {
    id: string;
    full_name: string | null;
    role: string;
    grade: number | null;
    class_letter: string | null;
};

const INPUT = "h-12 border-border focus:ring-violet-500 rounded-lg shadow-sm";

export function ClubCreateForm({
    isStaff,
    leaderCandidates,
}: {
    isStaff: boolean;
    leaderCandidates: LeaderCandidate[];
}) {
    const { t } = useT();
    const [category, setCategory] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);

    return (
        <form action={createClub} className="space-y-6">
            {/* category is chosen via a bottom sheet; submit it through a hidden input */}
            <input type="hidden" name="category" value={category} required />

            <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">{t("clubNew.nameLabel")}</Label>
                <Input id="name" name="name" placeholder={t("clubNew.namePlaceholder")} required maxLength={120} className={INPUT} />
            </div>

            <div className={`grid grid-cols-1 gap-4 ${isStaff ? "md:grid-cols-2" : ""}`}>
                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">{t("clubNew.categoryLabel")}</Label>
                    <button
                        type="button"
                        onClick={() => setCategoryOpen(true)}
                        className="flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                    >
                        <span className={`truncate text-base ${category ? "font-medium text-foreground" : "text-muted-foreground/70"}`}>
                            {category ? t(clubCategoryKey(category)) : t("clubNew.categoryPlaceholder")}
                        </span>
                        <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                </div>

                {isStaff && (
                    <div className="space-y-1.5">
                        <Label htmlFor="leader_id" className="text-xs font-medium text-muted-foreground">{t("clubNew.leaderLabel")}</Label>
                        <Select name="leader_id">
                            <SelectTrigger id="leader_id" className="h-12 w-full rounded-lg border-border shadow-sm">
                                <SelectValue placeholder={t("clubNew.leaderPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {leaderCandidates.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.full_name || t("clubNew.unnamed")}
                                        {c.role === "parliament"
                                            ? t("clubNew.leaderParliament")
                                            : c.grade
                                                ? `${t("clubNew.leaderGrade", { grade: c.grade })}${c.class_letter ?? ""}`
                                                : t("clubNew.leaderStudent")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] italic text-muted-foreground">{t("clubNew.leaderHint")}</p>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium text-muted-foreground">{t("clubNew.descriptionLabel")}</Label>
                <Textarea
                    id="description"
                    name="description"
                    placeholder={t("clubNew.descriptionPlaceholder")}
                    className="min-h-[120px] resize-none rounded-lg border-border shadow-sm focus:ring-violet-500"
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t("clubNew.logoLabel")}</Label>
                <div className="rounded-lg border border-dashed border-border bg-muted/50 p-2">
                    <ImageUpload bucketName="club-logos" />
                </div>
            </div>

            <Button type="submit" className="mt-2 h-14 w-full rounded-xl bg-violet-600 text-lg font-bold text-white shadow-lg transition-all hover:bg-violet-700 active:scale-[0.98]">
                {t("clubNew.createClub")}
            </Button>

            {/* Category bottom sheet */}
            <Sheet open={categoryOpen} onOpenChange={setCategoryOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t("clubNew.categoryLabel")}</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-2">
                        {CLUB_CATEGORIES.map((c) => {
                            const Icon = CLUB_CATEGORY_ICONS[c] ?? Sparkles;
                            const active = category === c;
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                        setCategory(c);
                                        setCategoryOpen(false);
                                    }}
                                    className={`flex h-14 items-center gap-3 rounded-xl px-4 text-left text-base transition-colors ${active ? "bg-violet-50 font-semibold dark:bg-violet-950/40" : "hover:bg-muted"}`}
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
                                        <Icon className="h-5 w-5 text-violet-600" aria-hidden />
                                    </span>
                                    <span className="truncate">{t(clubCategoryKey(c))}</span>
                                    {active && <Check className="ml-auto h-5 w-5 shrink-0 text-violet-600" aria-hidden />}
                                </button>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </form>
    );
}
