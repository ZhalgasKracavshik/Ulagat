"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/hooks/useT";

interface YearFilterProps {
    /** Distinct years available across materials, sorted descending. */
    years: number[];
    /** Currently selected year (from ?year=) or null. */
    value: number | null;
    /** Other active filters to preserve when the year changes. */
    baseParams: Record<string, string>;
}

/** Year dropdown for the olympiad archive — navigates via the ?year= searchParam. */
export function YearFilter({ years, value, baseParams }: YearFilterProps) {
    const router = useRouter();
    const { t } = useT();

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const params = new URLSearchParams(baseParams);
        if (e.target.value) {
            params.set("year", e.target.value);
        }
        const qs = params.toString();
        router.push(qs ? `/olympiad?${qs}` : "/olympiad");
    }

    return (
        <select
            aria-label={t("olympiad.filterByYear")}
            value={value ?? ""}
            onChange={handleChange}
            className="h-9 rounded-full border border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
        >
            <option value="">{t("olympiad.allYears")}</option>
            {years.map((year) => (
                <option key={year} value={year}>
                    {year}
                </option>
            ))}
        </select>
    );
}
