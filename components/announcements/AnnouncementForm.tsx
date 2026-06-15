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
import type { AnnouncementCategory } from "@/types";

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
    { value: 'general', label: '📝 General' },
    { value: 'important', label: '❗ Important' },
    { value: 'assembly', label: '📢 Assembly' },
    { value: 'medical', label: '🏥 Medical' },
];

const ALL_GRADES = Array.from({ length: 11 }, (_, i) => i + 1);

export function AnnouncementForm() {
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
            toast.error("Enter a title for the announcement.");
            return;
        }
        if (!body.trim()) {
            toast.error("Enter the announcement text.");
            return;
        }
        if (!allGrades && selectedGrades.length === 0) {
            toast.error("Select at least one grade or check 'All grades'.");
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
                toast.error(result.error ?? "Failed to publish the announcement.");
                return;
            }

            if (result.emailsFailed) {
                toast.warning("Announcement published, but email notification failed — notify recipients manually.");
            } else if (result.emailsSkipped) {
                toast.success("Announcement published. Email sending is not configured (dev mode) — notification was logged instead.");
            } else if ((result.emailsSent ?? 0) > 0) {
                toast.success(`Announcement published. ${result.emailsSent} student(s) and parent(s) notified by email.`);
            } else {
                toast.success("Announcement published. No matching recipients found for email notification.");
            }

            router.push('/announcements');
            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="ann_title" className="text-sm font-semibold text-foreground">Title</Label>
                <Input
                    id="ann_title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Medical check-up for grades 5–7"
                    maxLength={200}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="ann_body" className="text-sm font-semibold text-foreground">Text</Label>
                <Textarea
                    id="ann_body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Full announcement text — it will be shown in the feed and emailed to students and parents."
                    className="resize-none min-h-[140px]"
                    maxLength={5000}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v as AnnouncementCategory)}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CATEGORY_OPTIONS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ann_expires" className="text-sm font-semibold text-foreground">
                        Visible until (optional)
                    </Label>
                    <Input
                        id="ann_expires"
                        type="date"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave empty to keep the announcement up indefinitely.</p>
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-sm font-semibold text-foreground">Target grades</Label>
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="ann_all_grades"
                        checked={allGrades}
                        onCheckedChange={(checked) => setAllGrades(checked === true)}
                    />
                    <Label htmlFor="ann_all_grades" className="font-medium text-foreground cursor-pointer">
                        All grades (whole school)
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
                    Pin to the top of the feed
                </Label>
            </div>

            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg h-12 rounded-xl shadow-lg gap-2"
            >
                <Send className="w-5 h-5" />
                {isSubmitting ? 'Publishing & notifying…' : 'Publish & Notify'}
            </Button>
        </div>
    );
}
