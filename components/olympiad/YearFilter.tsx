"use client";

import { useRouter } from "next/navigation";

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
            aria-label="Filter by year"
            value={value ?? ""}
            onChange={handleChange}
            className="h-9 rounded-full border border-border bg-card px-4 text-sm font-medium text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
        >
            <option value="">All years</option>
            {years.map((year) => (
                <option key={year} value={year}>
                    {year}
                </option>
            ))}
        </select>
    );
}
