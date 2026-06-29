"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, Upload } from "lucide-react";
import { bulkUpsertSchedule } from "@/app/schedule/manage/actions";
import { useT } from "@/hooks/useT";

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const RU_DAYS = ["пн", "вт", "ср", "чт", "пт", "сб"];

function parseDay(s: string): number {
    if (/^[1-6]$/.test(s)) return Number(s);
    const i = RU_DAYS.indexOf(s.toLowerCase().slice(0, 2));
    return i >= 0 ? i + 1 : NaN;
}

function splitCells(line: string): string[] {
    return (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());
}

type ParsedRow = {
    grade: number;
    class_letter: string;
    day_of_week: number;
    period: number;
    subject: string;
    teacher_name: string;
    room: string;
};

function parseRows(text: string): ParsedRow[] {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: ParsedRow[] = [];
    lines.forEach((line, idx) => {
        const c = splitCells(line);
        // Skip a header line (first line whose first cell isn't a grade number).
        if (idx === 0 && !/^\d+$/.test(c[0] ?? "")) return;
        out.push({
            grade: parseInt(c[0] ?? "", 10),
            class_letter: c[1] ?? "",
            day_of_week: parseDay(c[2] ?? ""),
            period: parseInt(c[3] ?? "", 10),
            subject: c[4] ?? "",
            teacher_name: c[5] ?? "",
            room: c[6] ?? "",
        });
    });
    return out;
}

export function ScheduleBulkImport() {
    const { t } = useT();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [validFrom, setValidFrom] = useState<string>(() => todayIso());
    const [validUntil, setValidUntil] = useState<string>("");
    const [text, setText] = useState("");
    const [rowErrors, setRowErrors] = useState<{ row: number; reason: string }[]>([]);
    const [isImporting, startImporting] = useTransition();

    const parsed = useMemo(() => parseRows(text), [text]);

    const handleImport = () => {
        setRowErrors([]);
        if (!validFrom || !validUntil) {
            toast.error(t("scheduleImport.datesRequired"));
            return;
        }
        if (parsed.length === 0) {
            toast.error(t("scheduleImport.nothing"));
            return;
        }
        const rows = parsed.map((p) => ({
            grade: Number.isFinite(p.grade) ? p.grade : 0,
            class_letter: p.class_letter,
            day_of_week: Number.isFinite(p.day_of_week) ? p.day_of_week : 0,
            period: Number.isFinite(p.period) ? p.period : 0,
            subject: p.subject,
            teacher_name: p.teacher_name,
            room: p.room,
        }));

        startImporting(async () => {
            const res = await bulkUpsertSchedule(rows, validFrom, validUntil);
            if (!res.success) {
                if (res.rowErrors && res.rowErrors.length > 0) setRowErrors(res.rowErrors);
                toast.error(res.error ?? t("scheduleImport.failed"));
                return;
            }
            toast.success(t("scheduleImport.done").replace("{count}", String(res.inserted ?? 0)));
            setText("");
            setRowErrors([]);
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={open}
                >
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Upload className="h-4 w-4 text-indigo-500" />
                        {t("scheduleImport.title")}
                    </CardTitle>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
                </button>
            </CardHeader>
            {open && (
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t("scheduleImport.hint")}</p>
                    <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                        {t("scheduleImport.format")}
                        {"\n9, А, 1, 1, Математика, Иванова, 204"}
                    </pre>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk_from" className="text-xs font-medium text-muted-foreground">{t("scheduleImport.validFrom")}</Label>
                            <Input id="bulk_from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bulk_until" className="text-xs font-medium text-muted-foreground">{t("scheduleImport.validUntil")}</Label>
                            <Input id="bulk_until" type="date" value={validUntil} min={validFrom} onChange={(e) => setValidUntil(e.target.value)} className="h-11" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="bulk_text" className="text-xs font-medium text-muted-foreground">{t("scheduleImport.dataLabel")}</Label>
                        <Textarea
                            id="bulk_text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={"9, А, 1, 1, Математика, Иванова, 204\n9, А, 1, 2, Физика, Петров, 301"}
                            className="min-h-[160px] resize-y font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t("scheduleImport.parsed").replace("{count}", String(parsed.length))}
                        </p>
                    </div>

                    {rowErrors.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:bg-red-950/30">
                            <p className="mb-1 font-semibold text-red-700">{t("scheduleImport.errorsTitle")}</p>
                            <ul className="space-y-0.5 text-red-600">
                                {rowErrors.slice(0, 12).map((e) => (
                                    <li key={e.row}>{t("scheduleImport.rowLabel").replace("{row}", String(e.row))}: {e.reason}</li>
                                ))}
                                {rowErrors.length > 12 && <li>…+{rowErrors.length - 12}</li>}
                            </ul>
                        </div>
                    )}

                    <Button
                        onClick={handleImport}
                        disabled={isImporting}
                        className="h-12 w-full gap-2 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700"
                    >
                        <Upload className="h-4 w-4" />
                        {isImporting ? t("scheduleImport.importing") : t("scheduleImport.importBtn")}
                    </Button>
                </CardContent>
            )}
        </Card>
    );
}
