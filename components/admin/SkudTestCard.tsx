"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, DoorOpen } from "lucide-react";
import { recordSkudEvent } from "@/app/admin/skud/actions";
import { useT } from "@/hooks/useT";
import type { SkudDirection } from "@/types";

type StudentOption = { id: string; full_name: string };

/** Collapsible manual-entry card for turnstile events (demo/testing until the
 *  real SKUD push is configured). Admin-only page; the action re-checks. */
export function SkudTestCard({ students }: { students: StudentOption[] }) {
    const { t } = useT();
    const [open, setOpen] = useState(false);
    const [studentId, setStudentId] = useState("");
    const [direction, setDirection] = useState<SkudDirection>("in");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function submit() {
        if (!studentId) return;
        setBusy(true);
        setMessage(null);
        const result = await recordSkudEvent(studentId, direction);
        setMessage(result.success ? t("skud.testSaved") : result.error);
        setBusy(false);
    }

    return (
        <Card>
            <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setOpen((v) => !v)}
            >
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        <DoorOpen className="h-4 w-4 text-indigo-500" />
                        {t("skud.testTitle")}
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                </CardTitle>
            </CardHeader>
            {open && (
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1 text-sm">
                        {t("skud.testStudent")}
                        <select
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                        >
                            <option value="">—</option>
                            {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.full_name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-sm">
                        {t("skud.testDirection")}
                        <select
                            value={direction}
                            onChange={(e) => setDirection(e.target.value as SkudDirection)}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
                        >
                            <option value="in">{t("skud.in")}</option>
                            <option value="out">{t("skud.out")}</option>
                        </select>
                    </label>
                    <Button onClick={submit} disabled={busy || !studentId}>
                        {t("skud.testSubmit")}
                    </Button>
                    {message && <p className="text-sm text-muted-foreground">{message}</p>}
                </CardContent>
            )}
        </Card>
    );
}
