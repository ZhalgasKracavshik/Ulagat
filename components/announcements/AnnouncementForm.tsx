"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAnnouncement } from "@/app/announcements/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Send } from "lucide-react";
import { useT } from "@/hooks/useT";
import type { AnnouncementCategory } from "@/types";

const CATEGORY_OPTIONS: { value: AnnouncementCategory; labelKey: string }[] = [
    { value: 'general', labelKey: 'announcementForm.catGeneral' },
    { value: 'important', labelKey: 'announcementForm.catImportant' },
    { value: 'assembly', labelKey: 'announcementForm.catAssembly' },
    { value: 'medical', labelKey: 'announcementForm.catMedical' },
];

const ALL_GRADES = Array.from({ length: 11 }, (_, i) => i + 1);

export function AnnouncementForm() {
    const { t } = useT();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [category, setCategory] = useState<AnnouncementCategory>('general');
    const [allGrades, setAllGrades] = useState(true);
    const [selectedGrades, setSelectedGrades] = useState<number[]>([]);
    const [pinned, setPinned] = useState(false);
    const [expiresAt, setExpiresAt] = useState('');
    const [isSubmitting, startSubmitting] = useTransition();

    const toggleGrade = (grade: number) => {
        setSelectedGrades((prev) =>
            prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade].sort((a, b) => a - b)
        );
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            toast.error(t('announcementForm.titleRequired'));
            return;
        }
        if (!body.trim()) {
            toast.error(t('announcementForm.bodyRequired'));
            return;
        }
        if (!allGrades && selectedGrades.length === 0) {
            toast.error(t('announcementForm.gradeRequired'));
            return;
        }

        startSubmitting(async () => {
            const result = await createAnnouncement({
                title,
                body,
                category,
                target_grades: allGrades ? null : selectedGrades,
                pinned,
                expires_at: expiresAt || null,
            });

            if (!result.success) {
                toast.error(result.error ?? t('announcementForm.publishFailed'));
                return;
            }

            if (result.emailsFailed) {
                toast.warning(t('announcementForm.emailFailed'));
            } else if (result.emailsSkipped) {
                toast.success(t('announcementForm.emailSkipped'));
            } else if ((result.emailsSent ?? 0) > 0) {
                toast.success(t('announcementForm.emailSent').replace('{count}', String(result.emailsSent)));
            } else {
                toast.success(t('announcementForm.noRecipients'));
            }

            router.push('/announcements');
            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="ann_title" className="text-sm font-semibold text-foreground">{t('announcementForm.title')}</Label>
                <Input
                    id="ann_title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('announcementForm.titlePlaceholder')}
                    maxLength={200}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="ann_body" className="text-sm font-semibold text-foreground">{t('announcementForm.text')}</Label>
                <Textarea
                    id="ann_body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('announcementForm.textPlaceholder')}
                    className="resize-none min-h-[140px]"
                    maxLength={5000}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">{t('announcementForm.category')}</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as AnnouncementCategory)}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORY_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ann_expires" className="text-sm font-semibold text-foreground">
                        {t('announcementForm.visibleUntil')}
                    </Label>
                    <Input
                        id="ann_expires"
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">{t('announcementForm.visibleUntilHint')}</p>
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">{t('announcementForm.targetGrades')}</Label>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="ann_all_grades"
                        checked={allGrades}
                        onCheckedChange={(checked) => setAllGrades(checked === true)}
                    />
                    <Label htmlFor="ann_all_grades" className="font-medium text-foreground cursor-pointer">
                        {t('announcementForm.allGrades')}
                    </Label>
                </div>
                {!allGrades && (
                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                        {ALL_GRADES.map((grade) => {
                            const selected = selectedGrades.includes(grade);
                            return (
                                <Button
                                    key={grade}
                                    type="button"
                                    variant={selected ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => toggleGrade(grade)}
                                    aria-pressed={selected}
                                    className={selected ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                                >
                                    {grade}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Checkbox
                    id="ann_pinned"
                    checked={pinned}
                    onCheckedChange={(checked) => setPinned(checked === true)}
                />
                <Label htmlFor="ann_pinned" className="font-medium text-foreground cursor-pointer">
                    {t('announcementForm.pinned')}
                </Label>
            </div>

            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg h-12 rounded-xl shadow-lg gap-2"
            >
                <Send className="w-5 h-5" />
                {isSubmitting ? t('announcementForm.submitting') : t('announcementForm.submit')}
            </Button>
        </div>
    );
}
