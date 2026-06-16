"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle } from "lucide-react";
import {
    UNIVERSITIES,
    UNIVERSITY_CITIES,
    REFERENCE_DATA_DISCLAIMER,
} from "@/data/universities";
import { AddTargetDialog } from "./AddTargetDialog";
import { useT } from "@/hooks/useT";

/**
 * Browse the reference list of KZ universities. Filter by city, or by the
 * specialty groups the student's subject combination unlocks. "Add as
 * target" copies a specialty into the student's career_targets.
 *
 * `readOnly` (parent/staff viewing another student) hides the add buttons.
 */
export function UniversityExplorer({
    unlockedGroups,
    readOnly = false,
}: {
    unlockedGroups: string[];
    readOnly?: boolean;
}) {
    const { t } = useT();
    const [city, setCity] = useState<string>("all");
    const [onlyUnlocked, setOnlyUnlocked] = useState(false);

    const unlockedSet = useMemo(() => new Set(unlockedGroups), [unlockedGroups]);
    const canFilterUnlocked = unlockedGroups.length > 0;

    const filtered = useMemo(() => {
        return UNIVERSITIES.map((uni) => {
            const specialties = uni.specialties.filter(
                (s) => !onlyUnlocked || unlockedSet.has(s.group),
            );
            return { uni, specialties };
        }).filter(
            ({ uni, specialties }) =>
                (city === "all" || uni.city === city) && specialties.length > 0,
        );
    }, [city, onlyUnlocked, unlockedSet]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    size="sm"
                    variant={city === "all" ? "secondary" : "ghost"}
                    className="rounded-full"
                    onClick={() => setCity("all")}
                >
                    {t("careerExplorer.allCities")}
                </Button>
                {UNIVERSITY_CITIES.map((c) => (
                    <Button
                        key={c}
                        size="sm"
                        variant={city === c ? "secondary" : "ghost"}
                        className="rounded-full"
                        onClick={() => setCity(c)}
                    >
                        {c}
                    </Button>
                ))}
                {canFilterUnlocked && (
                    <Button
                        size="sm"
                        variant={onlyUnlocked ? "default" : "outline"}
                        className="rounded-full ml-auto"
                        onClick={() => setOnlyUnlocked((v) => !v)}
                    >
                        {onlyUnlocked ? t("careerExplorer.showingComboOnly") : t("careerExplorer.matchCombo")}
                    </Button>
                )}
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{REFERENCE_DATA_DISCLAIMER}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(({ uni, specialties }) => (
                    <Card key={uni.id} className="border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">{uni.name}</CardTitle>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5" />
                                {uni.city}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {specialties.map((s) => (
                                <div
                                    key={s.name}
                                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {s.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    unlockedSet.has(s.group)
                                                        ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[10px]"
                                                        : "text-[10px]"
                                                }
                                            >
                                                {s.group}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                ~{s.approxCutoff}/140
                                            </span>
                                        </div>
                                    </div>
                                    {!readOnly && (
                                        <AddTargetDialog
                                            compact
                                            triggerLabel={t("careerExplorer.addTarget")}
                                            prefill={{
                                                university: uni.name,
                                                specialty: s.name,
                                                cutoff_score: s.approxCutoff,
                                            }}
                                        />
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
                {filtered.length === 0 && (
                    <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                        {t("careerExplorer.noMatch")}
                    </p>
                )}
            </div>
        </div>
    );
}
