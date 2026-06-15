"use client";

import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useT } from "@/hooks/useT";

export type ClassOption = {
    grade: number;
    letter: string;
};

type ClassSelectorProps = {
    classes: ClassOption[];
    selectedGrade: number | null;
    selectedLetter: string | null;
};

/** Staff-only dropdown to view the schedule of any class. */
export function ClassSelector({ classes, selectedGrade, selectedLetter }: ClassSelectorProps) {
    const router = useRouter();
    const { t } = useT();

    const value =
        selectedGrade !== null && selectedLetter !== null
            ? `${selectedGrade}|${selectedLetter}`
            : undefined;

    return (
        <Select
            value={value}
            onValueChange={(v) => {
                const [grade, letter] = v.split('|');
                router.push(`/schedule?grade=${grade}&letter=${encodeURIComponent(letter)}`);
            }}
        >
            <SelectTrigger className="w-[180px] bg-card">
                <SelectValue placeholder={t('schedule.selectClass')} />
            </SelectTrigger>
            <SelectContent>
                {classes.map((c) => (
                    <SelectItem key={`${c.grade}|${c.letter}`} value={`${c.grade}|${c.letter}`}>
                        {t('schedule.classLabel', { label: `${c.grade}${c.letter}` })}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
