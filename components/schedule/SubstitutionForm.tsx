"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createSubstitution } from "@/app/schedule/substitutions/actions";
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
import { BookOpen, Send } from "lucide-react";
import { BELL_SCHEDULE } from "@/lib/schedule/bells";
import type { ScheduleEntry, SubstitutionType } from "@/types";

const TYPE_OPTIONS: { value: SubstitutionType; label: string }[] = [
    { value: 'substitution', label: 'Substitution (new teacher/subject)' },
    { value: 'cancellation', label: 'Cancellation (lesson removed)' },
    { value: 'room_change', label: 'Room change' },
];

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDayOfWeek(date: string): number {
    const day = new Date(date + 'T00:00:00').getDay();
    return day === 0 ? 7 : day;
}

export function SubstitutionForm() {
    const router = useRouter();
    const [date, setDate] = useState<string>(() => todayIso());
    const [grade, setGrade] = useState<string>('');
    const [classLetter, setClassLetter] = useState<string>('');
    const [period, setPeriod] = useState<string>('');
    const [type, setType] = useState<SubstitutionType>('substitution');
    const [newSubject, setNewSubject] = useState('');
    const [newTeacher, setNewTeacher] = useState('');
    const [newRoom, setNewRoom] = useState('');
    const [note, setNote] = useState('');
    const [lessonResult, setLessonResult] = useState<{ key: string; lesson: ScheduleEntry | null } | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();

    const letter = classLetter.trim();
    const slotComplete = Boolean(date && grade && letter && period);
    const slotKey = `${date}|${grade}|${letter}|${period}`;

    // Show the originally scheduled lesson once the slot is fully selected
    useEffect(() => {
        if (!slotComplete) return;

        let cancelled = false;
        const fetchLesson = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('schedule')
                .select('*')
                .eq('grade', Number(grade))
                .eq('class_letter', letter)
                .eq('day_of_week', isoDayOfWeek(date))
                .eq('period', Number(period))
                .lte('valid_from', date)
                .gte('valid_until', date)
                .limit(1)
                .maybeSingle();

            if (!cancelled) {
                setLessonResult({ key: slotKey, lesson: (data as ScheduleEntry | null) ?? null });
            }
        };
        fetchLesson();
        return () => {
            cancelled = true;
        };
    }, [slotComplete, slotKey, date, grade, letter, period]);

    const lessonChecked = slotComplete && lessonResult?.key === slotKey;
    const scheduledLesson = lessonChecked ? lessonResult?.lesson ?? null : null;

    const handleSubmit = () => {
        if (!date || !grade || !classLetter.trim() || !period) {
            toast.error("Fill in the date, grade, class letter and period.");
            return;
        }

        startSubmitting(async () => {
            const result = await createSubstitution({
                date,
                grade: Number(grade),
                class_letter: classLetter.trim(),
                period: Number(period),
                type,
                subject: newSubject,
                substitute_teacher_name: newTeacher,
                room: newRoom,
                note,
            });

            if (!result.success) {
                toast.error(result.error ?? "Failed to save the substitution.");
                return;
            }

            if (result.emailsFailed) {
                toast.warning("Substitution saved, but email notification failed — notify the class manually.");
            } else if (result.emailsSkipped) {
                toast.success("Substitution saved. Email sending is not configured (dev mode) — notification was logged instead.");
            } else if ((result.emailsSent ?? 0) > 0) {
                toast.success(`Substitution saved. ${result.emailsSent} student(s) and parent(s) notified by email.`);
            } else {
                toast.success("Substitution saved. No matching recipients found for email notification.");
            }

            setNewSubject('');
            setNewTeacher('');
            setNewRoom('');
            setNote('');
            router.refresh();
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sub_date" className="text-sm font-semibold text-slate-700">Date</Label>
                    <Input
                        id="sub_date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>
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
                    <Label htmlFor="sub_letter" className="text-sm font-semibold text-slate-700">Class letter</Label>
                    <Input
                        id="sub_letter"
                        value={classLetter}
                        onChange={(e) => setClassLetter(e.target.value)}
                        placeholder="e.g. А"
                        maxLength={3}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Period</Label>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            {BELL_SCHEDULE.map((b) => (
                                <SelectItem key={b.period} value={String(b.period)}>
                                    {b.period} ({b.start}–{b.end})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {lessonChecked && (
                <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${scheduledLesson ? 'bg-sky-50 border-sky-200' : 'bg-amber-50 border-amber-200'}`}>
                    <BookOpen className={`w-4 h-4 mt-0.5 shrink-0 ${scheduledLesson ? 'text-sky-600' : 'text-amber-600'}`} />
                    {scheduledLesson ? (
                        <p className="text-slate-700">
                            Scheduled lesson: <strong>{scheduledLesson.subject}</strong>
                            {scheduledLesson.teacher_name && <> — {scheduledLesson.teacher_name}</>}
                            {scheduledLesson.room && <>, Room {scheduledLesson.room}</>}
                        </p>
                    ) : (
                        <p className="text-amber-700">
                            No lesson found in the timetable for this slot. You can still save the substitution.
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as SubstitutionType)}>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {type !== 'cancellation' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {type === 'substitution' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="new_subject" className="text-sm font-semibold text-slate-700">New subject</Label>
                                <Input
                                    id="new_subject"
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    placeholder="Leave empty to keep the subject"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new_teacher" className="text-sm font-semibold text-slate-700">New teacher</Label>
                                <Input
                                    id="new_teacher"
                                    value={newTeacher}
                                    onChange={(e) => setNewTeacher(e.target.value)}
                                    placeholder="Substitute teacher's name"
                                />
                            </div>
                        </>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="new_room" className="text-sm font-semibold text-slate-700">New room</Label>
                        <Input
                            id="new_room"
                            value={newRoom}
                            onChange={(e) => setNewRoom(e.target.value)}
                            placeholder={type === 'room_change' ? 'Required' : 'Optional'}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="sub_note" className="text-sm font-semibold text-slate-700">Note (optional)</Label>
                <Textarea
                    id="sub_note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Shown to students and parents, e.g. 'Bring your textbooks to room 305'"
                    className="resize-none min-h-[80px]"
                />
            </div>

            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg h-12 rounded-xl shadow-lg gap-2"
            >
                <Send className="w-5 h-5" />
                {isSubmitting ? 'Saving & notifying…' : 'Save & Notify Class'}
            </Button>
        </div>
    );
}
