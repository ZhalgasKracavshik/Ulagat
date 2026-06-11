"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteScheduleCell, upsertScheduleCell } from "@/app/schedule/manage/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { BELL_SCHEDULE } from "@/lib/schedule/bells";
import type { ScheduleEntry } from "@/types";

const DAYS = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
];

type CellDraft = {
    day_of_week: number;
    period: number;
    subject: string;
    teacher_name: string;
    room: string;
    valid_from: string;
    valid_until: string;
    /** id of the existing schedule row (if editing), enables Delete */
    existingId: string | null;
};

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function plusDaysIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ScheduleGridEditor() {
    const [grade, setGrade] = useState<string>('');
    const [classLetter, setClassLetter] = useState<string>('');
    const [referenceDate, setReferenceDate] = useState<string>(() => todayIso());
    const [entries, setEntries] = useState<ScheduleEntry[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [draft, setDraft] = useState<CellDraft | null>(null);
    const [isSaving, startSaving] = useTransition();

    const classReady = Boolean(grade && classLetter.trim() && referenceDate);

    const loadEntries = useCallback(async () => {
        if (!classReady) return;
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('schedule')
                .select('*')
                .eq('grade', Number(grade))
                .eq('class_letter', classLetter.trim())
                .lte('valid_from', referenceDate)
                .gte('valid_until', referenceDate);

            if (error) {
                toast.error("Failed to load the timetable.");
                return;
            }
            setEntries((data ?? []) as ScheduleEntry[]);
            setLoaded(true);
        } finally {
            setIsLoading(false);
        }
    }, [classReady, grade, classLetter, referenceDate]);

    // Auto-load when the class selection is complete / changes
    useEffect(() => {
        setLoaded(false);
        setEntries([]);
        if (!classReady) return;
        const timer = setTimeout(() => {
            void loadEntries();
        }, 300); // small debounce while typing the class letter
        return () => clearTimeout(timer);
    }, [classReady, loadEntries]);

    const findEntry = (day: number, period: number): ScheduleEntry | null =>
        entries.find((e) => e.day_of_week === day && e.period === period) ?? null;

    const openCell = (day: number, period: number) => {
        const existing = findEntry(day, period);
        setDraft({
            day_of_week: day,
            period,
            subject: existing?.subject ?? '',
            teacher_name: existing?.teacher_name ?? '',
            room: existing?.room ?? '',
            valid_from: existing?.valid_from ?? referenceDate,
            valid_until: existing?.valid_until ?? plusDaysIso(90),
            existingId: existing?.id ?? null,
        });
    };

    const handleSave = () => {
        if (!draft) return;
        if (!draft.subject.trim()) {
            toast.error("Subject is required.");
            return;
        }
        startSaving(async () => {
            const result = await upsertScheduleCell({
                grade: Number(grade),
                class_letter: classLetter.trim(),
                day_of_week: draft.day_of_week,
                period: draft.period,
                subject: draft.subject,
                teacher_name: draft.teacher_name,
                room: draft.room,
                valid_from: draft.valid_from,
                valid_until: draft.valid_until,
            });
            if (result.success) {
                toast.success("Lesson saved.");
                setDraft(null);
                await loadEntries();
            } else {
                toast.error(result.error ?? "Failed to save the lesson.");
            }
        });
    };

    const handleDelete = () => {
        if (!draft?.existingId) return;
        const id = draft.existingId;
        startSaving(async () => {
            const result = await deleteScheduleCell(id);
            if (result.success) {
                toast.success("Lesson removed.");
                setDraft(null);
                await loadEntries();
            } else {
                toast.error(result.error ?? "Failed to delete the lesson.");
            }
        });
    };

    const draftDayLabel = draft ? DAYS.find((d) => d.value === draft.day_of_week)?.label ?? '' : '';
    const draftBell = draft ? BELL_SCHEDULE.find((b) => b.period === draft.period) : undefined;

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-xl shadow-sky-100/50 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Class</CardTitle>
                    <CardDescription>
                        Pick the class to edit. The grid shows the timetable version valid on the chosen date.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Grade</Label>
                        <Select value={grade} onValueChange={setGrade}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                                    <SelectItem key={g} value={String(g)}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="class_letter" className="text-sm font-semibold text-slate-700">Class letter</Label>
                        <Input
                            id="class_letter"
                            value={classLetter}
                            onChange={(e) => setClassLetter(e.target.value)}
                            placeholder="e.g. А"
                            maxLength={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reference_date" className="text-sm font-semibold text-slate-700">Valid on date</Label>
                        <Input
                            id="reference_date"
                            type="date"
                            value={referenceDate}
                            onChange={(e) => setReferenceDate(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {classReady && (
                <Card className="border-0 shadow-xl shadow-sky-100/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">
                            Weekly Grid — Class {grade}{classLetter.trim()}
                        </CardTitle>
                        <CardDescription>
                            Click a cell to add or edit a lesson. {isLoading && 'Loading…'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="px-3 py-2 text-left font-semibold text-slate-500 w-24 border-b">Period</th>
                                        {DAYS.map((d) => (
                                            <th key={d.value} className="px-2 py-2 text-left font-semibold text-slate-700 border-b">
                                                <span className="hidden lg:inline">{d.label}</span>
                                                <span className="lg:hidden">{d.short}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {BELL_SCHEDULE.map((bell) => (
                                        <tr key={bell.period} className="border-b last:border-b-0">
                                            <td className="px-3 py-2 align-top border-r bg-slate-50/50">
                                                <p className="font-bold text-slate-700">{bell.period}</p>
                                                <p className="text-[11px] text-slate-400">{bell.start}–{bell.end}</p>
                                            </td>
                                            {DAYS.map((d) => {
                                                const entry = findEntry(d.value, bell.period);
                                                return (
                                                    <td key={d.value} className="p-1 align-top">
                                                        <button
                                                            type="button"
                                                            onClick={() => openCell(d.value, bell.period)}
                                                            disabled={!loaded || isLoading}
                                                            className={`w-full min-h-[56px] rounded-lg border p-2 text-left transition-colors disabled:opacity-50 ${entry
                                                                ? 'border-sky-200 bg-sky-50/60 hover:bg-sky-100'
                                                                : 'border-dashed border-slate-200 hover:border-sky-300 hover:bg-sky-50/40'
                                                                }`}
                                                        >
                                                            {entry ? (
                                                                <span className="block space-y-0.5">
                                                                    <span className="block font-semibold text-slate-800 leading-tight">{entry.subject}</span>
                                                                    <span className="block text-xs text-slate-500">
                                                                        {entry.room && <>Room {entry.room}</>}
                                                                        {entry.room && entry.teacher_name && <> · </>}
                                                                        {entry.teacher_name}
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center justify-center text-slate-300">
                                                                    <Plus className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {draft?.existingId ? 'Edit lesson' : 'Add lesson'}
                        </DialogTitle>
                        <DialogDescription>
                            {draftDayLabel}, period {draft?.period}
                            {draftBell && <> ({draftBell.start}–{draftBell.end})</>} — Class {grade}{classLetter.trim()}
                        </DialogDescription>
                    </DialogHeader>

                    {draft && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cell_subject" className="text-sm font-semibold text-slate-700">Subject</Label>
                                <Input
                                    id="cell_subject"
                                    value={draft.subject}
                                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                                    placeholder="e.g. Mathematics"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cell_teacher" className="text-sm font-semibold text-slate-700">Teacher</Label>
                                    <Input
                                        id="cell_teacher"
                                        value={draft.teacher_name}
                                        onChange={(e) => setDraft({ ...draft, teacher_name: e.target.value })}
                                        placeholder="Teacher's name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cell_room" className="text-sm font-semibold text-slate-700">Room</Label>
                                    <Input
                                        id="cell_room"
                                        value={draft.room}
                                        onChange={(e) => setDraft({ ...draft, room: e.target.value })}
                                        placeholder="e.g. 305"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cell_valid_from" className="text-sm font-semibold text-slate-700">Valid from</Label>
                                    <Input
                                        id="cell_valid_from"
                                        type="date"
                                        value={draft.valid_from}
                                        onChange={(e) => setDraft({ ...draft, valid_from: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cell_valid_until" className="text-sm font-semibold text-slate-700">Valid until</Label>
                                    <Input
                                        id="cell_valid_until"
                                        type="date"
                                        value={draft.valid_until}
                                        onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        {draft?.existingId && (
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                disabled={isSaving}
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-2 mr-auto"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving…' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
