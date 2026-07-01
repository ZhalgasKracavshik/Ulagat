/**
 * Pure timetable-grid parser shared by the .xlsx importer and its tests.
 *
 * The school's Excel files are weekly grids: rows = periods, columns = days,
 * each "subject" cell holds the subject on the first line and the teacher on
 * the next, with a separate room column per day. One file may hold every class
 * either as one sheet per class OR as several grids stacked on a single sheet —
 * this parser detects BOTH by scanning each sheet for every weekday-header row.
 *
 * No React and no exceljs imports here, so it can be unit-tested in Node
 * against synthetic fixtures.
 */

export type ParsedLesson = {
    day_of_week: number;
    period: number;
    subject: string;
    teacher_name: string;
    room: string;
};

export type SheetResult = {
    /** Display label for the grid (detected class or sheet name). */
    name: string;
    grade: string;
    letter: string;
    lessons: ParsedLesson[];
    /** True when a cell had grouped (1./2.) lessons — only the first is taken. */
    grouped: boolean;
};

/** Maps a header cell to a 1-6 weekday: Kazakh, Russian, English or a digit. */
export function dayFromHeader(raw: string): number {
    const s = (raw ?? "").toLowerCase().replace(/\s+/g, "");
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

/** Splits a subject cell into subject + teacher; flags grouped (1./2.) cells. */
export function parseSubjectCell(text: string): { subject: string; teacher: string; grouped: boolean } {
    const lines = (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return { subject: "", teacher: "", grouped: false };
    const grouped = lines.some((l) => /^\d+\./.test(l));
    const subject = lines[0].replace(/^\d+\.\s*/, "");
    const teacher = lines[1] && !/^\d+\./.test(lines[1]) ? lines[1] : "";
    return { subject, teacher, grouped };
}

/** Takes the first line of a room cell and drops a trailing "каб"/"каб." marker. */
export function cleanRoom(text: string): string {
    const first = (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean)[0] ?? "";
    return first.replace(/\s*каб\.?$/i, "").trim();
}

/**
 * Detects a class label like "9А", "9 Ә", "9-Б", "11 «В»" in a short cell.
 * Rejects rooms ("309 каб") and times ("08:00") so they are not misread.
 */
export function classFromText(text: string): { grade: string; letter: string } | null {
    const s = (text ?? "").trim();
    if (!s || s.length > 20) return null;
    if (/каб|\d\s*[:.]\s*\d/i.test(s)) return null; // room or time
    const m = s.match(/(?:^|[^\d])(\d{1,2})\s*[-–—«"'\s]*([А-ЯӘҒҚҢӨҰҮІA-Z])(?![а-яa-z]{3,})/u);
    if (!m) return null;
    const g = parseInt(m[1], 10);
    if (g < 1 || g > 11) return null;
    return { grade: String(g), letter: m[2].toUpperCase() };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Reads an exceljs worksheet into a dense 2D array of cell text. */
export function cellText(cell: any): string {
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

export function extractGrid(ws: any): string[][] {
    const grid: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
        const arr: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
            arr[colNumber - 1] = cellText(cell);
        });
        grid[rowNumber - 1] = arr;
    });
    for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = [];
    return grid;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Parses every class grid found on a single sheet. Returns one SheetResult per
 * grid (so a sheet with several stacked classes yields several results).
 */
export function parseGridsFromSheet(grid: string[][], sheetName: string): SheetResult[] {
    if (!grid || grid.length === 0) return [];

    // Every row that looks like a weekday header (>= 2 day names) starts a grid.
    const headers: { row: number; dayCols: { col: number; day: number }[] }[] = [];
    grid.forEach((rowArr, r) => {
        const raw: { col: number; day: number }[] = [];
        (rowArr ?? []).forEach((c, ci) => {
            const d = dayFromHeader(c ?? "");
            if (d > 0) raw.push({ col: ci, day: d });
        });
        // A merged day header (e.g. "Дүйсенбі" spanning the Предмет + Каб.
        // columns) can surface the same day name in the adjacent room
        // sub-column. Keep only the first column of each such run, otherwise
        // the room column is mistaken for another day and every lesson doubles.
        const cols: { col: number; day: number }[] = [];
        for (const dc of raw) {
            const prev = cols[cols.length - 1];
            if (prev && prev.day === dc.day && dc.col === prev.col + 1) continue;
            cols.push(dc);
        }
        if (cols.length >= 2) headers.push({ row: r, dayCols: cols });
    });
    if (headers.length === 0) return [];

    const results: SheetResult[] = [];
    headers.forEach((h, hi) => {
        const blockEnd = hi + 1 < headers.length ? headers[hi + 1].row : grid.length;

        // Period column: the column with the most 1-8 values within this block.
        let periodCol = 0;
        let bestHits = -1;
        for (let c = 0; c < 4; c++) {
            let hits = 0;
            for (let r = h.row + 1; r < blockEnd; r++) {
                if (/^[1-8]$/.test((grid[r]?.[c] ?? "").trim())) hits++;
            }
            if (hits > bestHits) {
                bestHits = hits;
                periodCol = c;
            }
        }

        const lessons: ParsedLesson[] = [];
        let grouped = false;
        for (let r = h.row + 1; r < blockEnd; r++) {
            const pv = (grid[r]?.[periodCol] ?? "").trim();
            if (!/^[1-8]$/.test(pv)) continue;
            const period = Number(pv);
            for (const { col, day } of h.dayCols) {
                const parsed = parseSubjectCell(grid[r]?.[col] ?? "");
                if (!parsed.subject) continue;
                if (parsed.grouped) grouped = true;
                lessons.push({
                    day_of_week: day,
                    period,
                    subject: parsed.subject,
                    teacher_name: parsed.teacher,
                    room: cleanRoom(grid[r]?.[col + 1] ?? ""),
                });
            }
        }
        if (lessons.length === 0) return;

        // Class label: look just above this grid (between the previous grid and here).
        const floor = hi > 0 ? headers[hi - 1].row + 1 : 0;
        let cls: { grade: string; letter: string } | null = null;
        for (let r = h.row - 1; r >= Math.max(floor, h.row - 4); r--) {
            for (const cell of grid[r] ?? []) {
                const c = classFromText(cell ?? "");
                if (c) {
                    cls = c;
                    break;
                }
            }
            if (cls) break;
        }
        // Single grid on the sheet: fall back to the sheet name (e.g. "9А").
        if (!cls && headers.length === 1) cls = classFromText(sheetName);

        results.push({
            name: cls ? `${cls.grade}${cls.letter}` : sheetName || "",
            grade: cls?.grade ?? "",
            letter: cls?.letter ?? "",
            lessons,
            grouped,
        });
    });

    return results;
}
