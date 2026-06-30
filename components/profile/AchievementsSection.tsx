"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Plus, Trash2, X, Image as ImageIcon, Clock, BadgeCheck, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ACHIEVEMENT_TIERS, TIER_POINTS, type AchievementTier } from "@/lib/leaderboard";
import { useT } from "@/hooks/useT";

interface Achievement {
    id: string;
    title: string;
    description: string | null;
    achievement_date: string | null;
    image_url: string | null;
    tier: AchievementTier | null;
    status: 'pending' | 'verified' | 'rejected' | null;
    rejection_reason: string | null;
}

const TIER_LABEL_KEYS: Record<AchievementTier, string> = {
    school: 'achievementsSection.tierSchool',
    city: 'achievementsSection.tierCity',
    national: 'achievementsSection.tierNational',
};

function StatusBadge({ status, t }: { status: Achievement['status']; t: (key: string) => string }) {
    if (status === 'verified') {
        return (
            <Badge className="gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200 border border-green-200 shadow-none hover:bg-green-100">
                <BadgeCheck className="w-3 h-3" /> {t('achievementsSection.statusVerified')}
            </Badge>
        );
    }
    if (status === 'rejected') {
        return (
            <Badge className="gap-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border border-red-200 shadow-none hover:bg-red-100">
                <Ban className="w-3 h-3" /> {t('achievementsSection.statusRejected')}
            </Badge>
        );
    }
    return (
        <Badge className="gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border border-amber-200 shadow-none hover:bg-amber-100">
            <Clock className="w-3 h-3" /> {t('achievementsSection.statusPending')}
        </Badge>
    );
}

interface AchievementsProps {
    achievements: Achievement[];
    isOwner: boolean;
}

export function AchievementsSection({ achievements, isOwner }: AchievementsProps) {
    const { t } = useT();
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        try {
            const res = await fetch("/api/achievements", {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                setShowForm(false);
                setPreview(null);
                router.refresh();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        try {
            await fetch("/api/achievements", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            router.refresh();
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    {t('achievementsSection.title')}
                </h3>
                {isOwner && !showForm && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="w-4 h-4" />
                        {t('achievementsSection.add')}
                    </Button>
                )}
            </div>

            {/* Add Form */}
            {showForm && (
                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm">{t('achievementsSection.newAchievement')}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setPreview(null); }}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <form action={handleSubmit} className="space-y-3">
                            <Input name="title" placeholder={t('achievementsSection.titlePlaceholder')} required />
                            <Textarea name="description" placeholder={t('achievementsSection.descriptionPlaceholder')} className="min-h-[60px]" />
                            <Input name="achievement_date" type="date" />

                            {/* Tier (Phase 6) — determines points awarded after verification */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{t('achievementsSection.level')}</Label>
                                <select
                                    name="tier"
                                    defaultValue="school"
                                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    {ACHIEVEMENT_TIERS.map((tier) => (
                                        <option key={tier} value={tier}>
                                            {t('achievementsSection.levelTier', { tier: t(TIER_LABEL_KEYS[tier]), pts: TIER_POINTS[tier] })}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-muted-foreground">
                                    {t('achievementsSection.levelHint')}
                                </p>
                            </div>

                            {/* Image Upload */}
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {t('achievementsSection.certificatePhoto')}
                                </Label>
                                <Input
                                    ref={fileRef}
                                    name="image"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="cursor-pointer"
                                />
                                {preview && (
                                    <div className="relative rounded-lg overflow-hidden border">
                                        <img src={preview} alt="Preview" className="w-full max-h-48 object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <Button type="submit" size="sm" disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700">
                                {loading ? t('achievementsSection.uploading') : t('achievementsSection.save')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Achievement List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.length > 0 ? (
                    achievements.map((a) => (
                        <Card key={a.id} className="group overflow-hidden hover:shadow-md transition-all">
                            {a.image_url ? (
                                <div className="relative h-48 overflow-hidden">
                                    <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                                </div>
                            ) : (
                                <div className="h-1.5 bg-gradient-to-r from-amber-400 to-orange-400" />
                            )}
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-bold text-foreground">{a.title}</h4>
                                            <StatusBadge status={a.status} t={t} />
                                            {a.tier && (
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-muted">
                                                    {t(TIER_LABEL_KEYS[a.tier])}
                                                </Badge>
                                            )}
                                        </div>
                                        {a.description && (
                                            <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                                        )}
                                        {a.status === 'rejected' && a.rejection_reason && (
                                            <p className="text-xs text-red-600 mt-1">{t('achievementsSection.reason', { reason: a.rejection_reason })}</p>
                                        )}
                                        {a.achievement_date && (
                                            <span className="text-xs text-muted-foreground mt-2 block">
                                                📅 {new Date(a.achievement_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {isOwner && (
                                        <ConfirmDialog
                                            title={t("common.deleteTitle")}
                                            description={t("achievementsSection.deleteConfirm")}
                                            confirmLabel={t("common.delete")}
                                            onConfirm={() => handleDelete(a.id)}
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            }
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full text-center py-8 bg-muted rounded-xl border border-dashed">
                        <Award className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground text-sm">
                            {isOwner ? t('achievementsSection.emptyOwner') : t('achievementsSection.emptyOther')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
