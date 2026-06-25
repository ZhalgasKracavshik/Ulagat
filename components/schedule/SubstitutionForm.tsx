"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createSubstitution } from "@/app/schedule/substitutions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BookOpen, Send, ChevronDown, Check, Repeat, Ban, DoorOpen } from "lucide-react";
import { BELL_SCHEDULE } from "@/lib/schedule/bells";
import { useT } from "@/hooks/useT";
import type { ScheduleEntry, SubstitutionType } from "@/types";

const TYPE_META: { value: SubstitutionType; labelKey: string; icon: typeof Repeat; tint: string; color: string }[] = [
    { value: "substitution", labelKey: "substitutions.typeSubstitution", icon: Repeat, tint: "bg-sky-100", color: "text-sky-600" },
    { value: "cancellation", labelKey: "substitutions.typeCancellation", icon: Ban, tint: "bg-red-100", color: "text-red-600" },
    { value: "room_change", labelKey: "substitutions.typeRoomChange", icon: DoorOpen, tint: "bg-violet-100", color: "text-violet-600" },
];

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoDayOfWeek(date: string): number {
    const day = new Date(date + "T00:00:00").getDay();
    return day === 0 ? 7 : day;
}

type KnownClass = { grade: number; letter: string };

/** Tappable field that opens a bottom sheet. 56px tall, finger-friendly. */
function FieldButton({
    label,
    value,
    placeholder,
    onClick,
}: {
    label: string;
    value: string;
    placeholder: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-14 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <span className="min-w-0">
                <span className="block text-xs font-medium text-muted-foreground">{label}</span>
                <span className={`block truncate text-base font-semibold ${value ? "text-foreground" : "text-muted-foreground/60"}`}>
                    {value || placeholder}
                </span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
    );
}

/** A 56px option row used inside the bottom sheets. */
function OptionRow({ active, onSelect, children }: { active: boolean; onSelect: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-base transition-colors ${active ? "bg-sky-50 font-semibold dark:bg-sky-950/40" : "hover:bg-muted"}`}
        >
            {children}
            {active && <Check className="ml-auto h-5 w-5 shrink-0 text-sky-600" aria-hidden />}
        </button>
    );
}

export function SubstitutionForm({ classes }: { classes: KnownClass[] }) {
    const { t } = useT();
    const router = useRouter();
    const reduce = useReducedMotion();

    const [date, setDate] = useState<string>(() => todayIso());
    const [grade, setGrade] = useState<string>("");
    const [classLetter, setClassLetter] = useState<string>("");
    const [period, setPeriod] = useState<string>("");
    const [type, setType] = useState<SubstitutionType>("substitution");
    const [newSubject, setNewSubject] = useState("");
    const [newTeacher, setNewTeacher] = useState("");
    const [newRoom, setNewRoom] = useState("");
    const [note, setNote] = useState("");
    const [lessonResult, setLessonResult] = useState<{ key: string; lesson: ScheduleEntry | null } | null>(null);
    const [isSubmitting, startSubmitting] = useTransition();

    // Which bottom sheet is open.
    const [classOpen, setClassOpen] = useState(false);
    const [gradeOpen, setGradeOpen] = useState(false);
    const [periodOpen, setPeriodOpen] = useState(false);
    const [typeOpen, setTypeOpen] = useState(false);

    const letter = classLetter.trim();
    const slotComplete = Boolean(date && grade && letter && period);
    const slotKey = `${date}|${grade}|${letter}|${period}`;
    const hasClasses = classes.length > 0;

    useEffect(() => {
        if (!slotComplete) return;
        let cancelled = false;
        const fetchLesson = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("schedule")
                .select("*")
                .eq("grade", Number(grade))
                .eq("class_letter", letter)
                .eq("day_of_week", isoDayOfWeek(date))
                .eq("period", Number(period))
                .lte("valid_from", date)
                .gte("valid_until", date)
                .limit(1)
                .maybeSingle();
            if (!cancelled) setLessonResult({ key: slotKey, lesson: (data as ScheduleEntry | null) ?? null });
        };
        fetchLesson();
        return () => {
            cancelled = true;
        };
    }, [slotComplete, slotKey, date, grade, letter, period]);

    const lessonChecked = slotComplete && lessonResult?.key === slotKey;
    const scheduledLesson = lessonChecked ? lessonResult?.lesson ?? null : null;

    const periodMeta = BELL_SCHEDULE.find((b) => String(b.period) === period);
    const periodDisplay = periodMeta ? `${periodMeta.period} (${periodMeta.start}–${periodMeta.end})` : "";
    const classDisplay = grade && letter ? `${grade}${letter}` : "";
    const typeDisplay = t(`substitutions.type${type === "substitution" ? "Substitution" : type === "cancellation" ? "Cancellation" : "RoomChange"}`);

    const reveal = reduce
        ? {}
        : { initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: "easeOut" as const } };

    const handleSubmit = () => {
        if (!date || !grade || !classLetter.trim() || !period) {
            toast.error(t("substitutions.fillSlot"));
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
                toast.error(result.error ?? t("substitutions.saveFailed"));
                return;
            }
            if (result.emailsFailed) toast.warning(t("substitutions.emailFailed"));
            else if (result.emailsSkipped) toast.success(t("substitutions.emailSkipped"));
            else if ((result.emailsSent ?? 0) > 0) toast.success(t("substitutions.emailSent").replace("{count}", String(result.emailsSent)));
            else toast.success(t("substitutions.noRecipients"));

            setNewSubject("");
            setNewTeacher("");
            setNewRoom("");
            setNote("");
            router.refresh();
        });
    };

    return (
        <div className="space-y-5">
            {/* Slot: date, class, period */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                    <Label htmlFor="sub_date" className="text-xs font-medium text-muted-foreground">{t("substitutions.date")}</Label>
                    <Input id="sub_date" type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} className="h-14" />
                </div>

                {hasClasses ? (
                    <FieldButton label={t("substitutions.class")} value={classDisplay} placeholder={t("substitutions.classPlaceholder")} onClick={() => setClassOpen(true)} />
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <FieldButton label={t("substitutions.grade")} value={grade} placeholder={t("substitutions.gradePlaceholder")} onClick={() => setGradeOpen(true)} />
                        <div className="space-y-1.5">
                            <Label htmlFor="sub_letter" className="text-xs font-medium text-muted-foreground">{t("substitutions.classLetter")}</Label>
                            <Input
                                id="sub_letter"
                                value={classLetter}
                                onChange={(e) => setClassLetter(e.target.value.toUpperCase())}
                                placeholder={t("substitutions.classLetterPlaceholder")}
                                maxLength={3}
                                className="h-14 uppercase"
                            />
                        </div>
                    </div>
                )}

                <FieldButton label={t("substitutions.period")} value={periodDisplay} placeholder={t("substitutions.periodPlaceholder")} onClick={() => setPeriodOpen(true)} />
            </div>

            {/* Scheduled lesson preview */}
            <AnimatePresence mode="wait">
                {lessonChecked && (
                    <motion.div
                        key={scheduledLesson ? "has" : "none"}
                        {...reveal}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${scheduledLesson ? "border-sky-200 bg-sky-50 dark:bg-sky-950/40" : "border-amber-200 bg-amber-50 dark:bg-amber-950/40"}`}
                    >
                        <BookOpen className={`mt-0.5 h-4 w-4 shrink-0 ${scheduledLesson ? "text-sky-600" : "text-amber-600"}`} aria-hidden />
                        {scheduledLesson ? (
                            <p className="text-foreground">
                                {t("substitutions.scheduledLesson")} <strong>{scheduledLesson.subject}</strong>
                                {scheduledLesson.teacher_name && <>, {scheduledLesson.teacher_name}</>}
                                {scheduledLesson.room && <>, {t("substitutions.room")} {scheduledLesson.room}</>}
                            </p>
                        ) : (
                            <p className="text-amber-700">{t("substitutions.noLessonFound")}</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Type */}
            <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t("substitutions.type")}</Label>
                <FieldButton label={t("substitutions.type")} value={typeDisplay} placeholder="" onClick={() => setTypeOpen(true)} />
            </div>

            {/* Conditional fields */}
            <AnimatePresence initial={false}>
                {type !== "cancellation" && (
                    <motion.div {...reveal} className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {type === "substitution" && (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new_subject" className="text-xs font-medium text-muted-foreground">{t("substitutions.newSubject")}</Label>
                                    <Input id="new_subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder={t("substitutions.newSubjectPlaceholder")} className="h-14" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="new_teacher" className="text-xs font-medium text-muted-foreground">{t("substitutions.newTeacher")}</Label>
                                    <Input id="new_teacher" value={newTeacher} onChange={(e) => setNewTeacher(e.target.value)} placeholder={t("substitutions.newTeacherPlaceholder")} className="h-14" />
                                </div>
                            </>
                        )}
                        <div className="space-y-1.5">
                            <Label htmlFor="new_room" className="text-xs font-medium text-muted-foreground">{t("substitutions.newRoom")}</Label>
                            <Input id="new_room" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} placeholder={type === "room_change" ? t("substitutions.newRoomRequired") : t("substitutions.newRoomOptional")} className="h-14" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Note */}
            <div className="space-y-1.5">
                <Label htmlFor="sub_note" className="text-xs font-medium text-muted-foreground">{t("substitutions.note")}</Label>
                <Textarea id="sub_note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("substitutions.notePlaceholder")} className="min-h-[80px] resize-none" />
            </div>

            <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-14 w-full gap-2 rounded-xl bg-orange-500 text-lg font-bold text-white shadow-lg transition-all hover:bg-orange-600 active:scale-[0.99]"
            >
                <Send className="h-5 w-5" aria-hidden />
                {isSubmitting ? t("substitutions.submitting") : t("substitutions.submit")}
            </Button>

            {/* ---- Bottom sheets ---- */}
            <Sheet open={classOpen} onOpenChange={setClassOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t("substitutions.class")}</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto">
                        <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-4">
                            {classes.map((c) => {
                                const active = grade === String(c.grade) && letter === c.letter;
                                return (
                                    <button
                                        key={`${c.grade}|${c.letter}`}
                                        type="button"
                                        onClick={() => {
                                            setGrade(String(c.grade));
                                            setClassLetter(c.letter);
                                            setClassOpen(false);
                                        }}
                                        className={`flex h-14 items-center justify-center rounded-xl border text-lg font-bold transition-colors ${active ? "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40" : "border-input hover:bg-muted"}`}
                                    >
                                        {c.grade}{c.letter}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={gradeOpen} onOpenChange={setGradeOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t("substitutions.grade")}</SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-4 gap-2 pt-1 sm:grid-cols-6">
                        {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => {
                                    setGrade(String(g));
                                    setGradeOpen(false);
                                }}
                                className={`flex h-14 items-center justify-center rounded-xl border text-lg font-bold transition-colors ${grade === String(g) ? "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40" : "border-input hover:bg-muted"}`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={periodOpen} onOpenChange={setPeriodOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t("substitutions.period")}</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto">
                        {BELL_SCHEDULE.map((b) => (
                            <OptionRow
                                key={b.period}
                                active={period === String(b.period)}
                                onSelect={() => {
                                    setPeriod(String(b.period));
                                    setPeriodOpen(false);
                                }}
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-sm font-bold tabular-nums">{b.period}</span>
                                <span className="tabular-nums text-muted-foreground">{b.start}–{b.end}</span>
                            </OptionRow>
                        ))}
                    </div>
                </SheetContent>
            </Sheet>

            <Sheet open={typeOpen} onOpenChange={setTypeOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{t("substitutions.type")}</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-1 pt-1">
                        {TYPE_META.map((opt) => {
                            const Icon = opt.icon;
                            return (
                                <OptionRow
                                    key={opt.value}
                                    active={type === opt.value}
                                    onSelect={() => {
                                        setType(opt.value);
                                        setTypeOpen(false);
                                    }}
                                >
                                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${opt.tint}`}>
                                        <Icon className={`h-5 w-5 ${opt.color}`} aria-hidden />
                                    </span>
                                    {t(opt.labelKey)}
                                </OptionRow>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
