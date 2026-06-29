"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react";
import { bulkUpsertSchedule } from "@/app/schedule/manage/actions";
import { REGISTRABLE_GRADES } from "@/lib/schedule/class-letter";
import { useT } from "@/hooks/useT";

function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type ParsedLesson = {
    day_of_week: number;
    period: number;
    subject: string;
    teacher_name: string;
    room: string;
};

type SheetResult = {
    name: string;
    grade: string;
    letter: string;
    lessons: ParsedLesson[];
    grouped: boolean;
};

/** Maps a header cell to a 1-6 weekday, supporting Kazakh, Russian, English and digits. */
function dayFromHeader(raw: string): number {
    const s = raw.toLowerCase().replace(/\s+/g, "");
    if (!s) return 0;
    if (/^[1-6]$/.test(s)) return Number(s);
    const prefixes: [string, number][] = [
        ["дүй", 1], ["дуй", 1], ["пон", 1], ["пн", 1], ["mon", 1],
        ["сей", 2], ["втор", 2], ["вт", 2], ["tue", 2],
        ["сәр", 3], ["сар", 3], ["сре", 3], ["ср", 3], ["wed", 3],
        ["бей", 4], ["чет", 4], ["чт", 4], ["thu", 4],
        ["жұм", 5], ["жум", 5], ["пят", 5], ["пт", 5], ["fri", 5],
        ["сен", 6], ["суб", 6], ["сб", 6], ["sat", 6],
    ];
    for (const [p, d] of prefixes) if (s.startsWith(p)) return d;
    return 0;
}

function parseSubjectCell(text: string): { subject: string; teacher: string; grouped: boolean } {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { subject: "", teacher: "", grouped: false };
    const grouped = lines.some((l) => /^\d+\./.test(l));
    const subject = lines[0].replace(/^\d+\.\s*/, "");
    const teacher = lines[1] && !/^\d+\./.test(lines[1]) ? lines[1] : "";
    return { subject, teacher, grouped };
}

function cleanRoom(text: string): string {
    const first = text.split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
    return first.replace(/\s*каб\.?$/i, "").trim();
}

function classFromName(name: string): { grade: string; letter: string } {
    const m = name.match(/(\d{1,2})\s*([A-Za-zА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі])/u);
    return m ? { grade: m[1], letter: m[2].toUpperCase() } : { grade: "", letter: "" };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function cellText(cell: any): string {
    const v = cell?.value;
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
    if (typeof v === "object") {
        if (Array.isArray(v.richText)) return v.richText.map((t: any) => t.text ?? "").join("");
        if (typeof v.text === "string") return v.text;
        if (v.result != null) return String(v.result);
    }
    return "";
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<SheetResult[]> {
    const mod: any = await import("exceljs");
    const ExcelJS = mod.default ?? mod;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const results: SheetResult[] = [];

    wb.eachSheet((ws: any) => {
        // Build a dense 2D grid of cell text.
        const grid: string[][] = [];
        ws.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
            const arr: string[] = [];
            row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
                arr[colNumber - 1] = cellText(cell);
            });
            grid[rowNumber - 1] = arr;
        });
        if (grid.length === 0) return;

        // Find the header row with the most weekday matches.
        let headerRow = -1;
        let headerDayCols: { col: number; day: number }[] = [];
        grid.forEach((rowArr, r) => {
            const cols: { col: number; day: number }[] = [];
            (rowArr ?? []).forEach((c, ci) => {
                const day = dayFromHeader(c ?? "");
                if (day > 0) cols.push({ col: ci, day });
            });
            if (cols.length > headerDayCols.length) {
                headerDayCols = cols;
                headerRow = r;
            }
        });
        if (headerRow < 0 || headerDayCols.length < 2) return;

        // Detect the period column (numbers 1-8) among the first few columns.
        let periodCol = 0;
        let bestHits = -1;
        for (let c = 0; c < 4; c++) {
            let hits = 0;
            for (let r = headerRow + 1; r < grid.length; r++) {
                const val = (grid[r]?.[c] ?? "").trim();
                if (/^[1-8]$/.test(val)) hits++;
            }
            if (hits > bestHits) {
                bestHits = hits;
                periodCol = c;
            }
        }

        const lessons: ParsedLesson[] = [];
        let grouped = false;
        for (let r = headerRow + 1; r < grid.length; r++) {
            const periodVal = (grid[r]?.[periodCol] ?? "").trim();
            if (!/^[1-8]$/.test(periodVal)) continue;
            const period = Number(periodVal);
            for (const { col, day } of headerDayCols) {
                const subjText = grid[r]?.[col] ?? "";
                const roomText = grid[r]?.[col + 1] ?? "";
                const parsed = parseSubjectCell(subjText);
                if (!parsed.subject) continue;
                if (parsed.grouped) grouped = true;
                lessons.push({
                    day_of_week: day,
                    period,
                    subject: parsed.subject,
                    teacher_name: parsed.teacher,
                    room: cleanRoom(roomText),
                });
            }
        }
        if (lessons.length === 0) return;

        const cls = classFromName(ws.name ?? "");
        results.push({ name: ws.name ?? "", grade: cls.grade, letter: cls.letter, lessons, grouped });
    });

    return results;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function ScheduleExcelImport() {
    const { t } = useT();
    const router = useRouter();
    const [validFrom, setValidFrom] = useState<string>(() => todayIso());
    const [validUntil, setValidUntil] = useState<string>("");
    const [sheets, setSheets] = useState<SheetResult[] | null>(null);
    const [parsing, setParsing] = useState(false);
    const [isImporting, startImporting] = useTransition();

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setParsing(true);
        setSheets(null);
        try {
            const buf = await file.arrayBuffer();
            const parsed = await parseWorkbook(buf);
            if (parsed.length === 0) {
                toast.error(t("scheduleExcel.noSheets"));
            }
            setSheets(parsed);
        } catch (err) {
            console.error("xlsx parse error", err);
            toast.error(t("scheduleExcel.readFailed"));
        } finally {
            setParsing(false);
        }
    };

    const updateSheet = (idx: number, patch: Partial<SheetResult>) => {
        setSheets((prev) => (prev ? prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)) : prev));
    };

    const totalLessons = (sheets ?? []).reduce((n, s) => n + s.lessons.length, 0);

    const handleImport = () => {
        if (!sheets || sheets.length === 0) return;
        if (!validFrom || !validUntil) {
            toast.error(t("scheduleExcel.datesRequired"));
            return;
        }
        const missing = sheets.some((s) => s.lessons.length > 0 && (!s.grade || !s.letter.trim()));
        if (missing) {
            toast.error(t("scheduleExcel.needClass"));
            return;
        }
        const rows = sheets.flatMap((s) =>
            s.lessons.map((L) => ({
                grade: parseInt(s.grade, 10),
                class_letter: s.letter.trim(),
                day_of_week: L.day_of_week,
                period: L.period,
                subject: L.subject,
                teacher_name: L.teacher_name,
                room: L.room,
            }))
        );
        if (rows.length === 0) {
            toast.error(t("scheduleExcel.nothing"));
            return;
        }
        startImporting(async () => {
            const res = await bulkUpsertSchedule(rows, validFrom, validUntil);
            if (!res.success) {
                toast.error(res.error ?? t("scheduleExcel.failed"));
                return;
            }
            toast.success(t("scheduleExcel.done").replace("{count}", String(res.inserted ?? 0)));
            setSheets(null);
            router.refresh();
        });
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    {t("scheduleExcel.title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t("scheduleExcel.hint")}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="xls_from" className="text-xs font-medium text-muted-foreground">{t("scheduleExcel.validFrom")}</Label>
                        <Input id="xls_from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="xls_until" className="text-xs font-medium text-muted-foreground">{t("scheduleExcel.validUntil")}</Label>
                        <Input id="xls_until" type="date" value={validUntil} min={validFrom} onChange={(e) => setValidUntil(e.target.value)} className="h-11" />
                    </div>
                </div>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted">
                    {parsing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
                    {parsing ? t("scheduleExcel.parsing") : t("scheduleExcel.choose")}
                    <input
                        type="file"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                </label>

                {sheets && sheets.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">
                            {t("scheduleExcel.detected").replace("{sheets}", String(sheets.length)).replace("{lessons}", String(totalLessons))}
                        </p>
                        <div className="space-y-2">
                            {sheets.map((s, idx) => (
                                <div key={idx} className="rounded-xl border border-border p-3">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={s.name}>
                                            {t("scheduleExcel.sheet")}: {s.name || "—"}
                                        </span>
                                        <select
                                            aria-label={t("scheduleExcel.grade")}
                                            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                                            value={s.grade}
                                            onChange={(e) => updateSheet(idx, { grade: e.target.value })}
                                        >
                                            <option value="">{t("scheduleExcel.grade")}</option>
                                            {REGISTRABLE_GRADES.map((g) => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                        <Input
                                            aria-label={t("scheduleExcel.letter")}
                                            value={s.letter}
                                            onChange={(e) => updateSheet(idx, { letter: e.target.value.toUpperCase() })}
                                            placeholder={t("scheduleExcel.letter")}
                                            maxLength={3}
                                            className="h-9 w-16 text-center uppercase"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {t("scheduleExcel.lessonsCount").replace("{count}", String(s.lessons.length))}
                                        </span>
                                    </div>
                                    {s.grouped && (
                                        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            {t("scheduleExcel.warnGrouped")}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <Button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="h-12 w-full gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                        >
                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                            {isImporting ? t("scheduleExcel.importing") : t("scheduleExcel.importBtn")}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
