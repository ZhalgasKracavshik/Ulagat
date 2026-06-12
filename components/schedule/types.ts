import type { SubstitutionType } from "@/types";

/** A lesson as displayed in one grid cell. */
export type LessonCell = {
    subject: string;
    teacher: string | null;
    room: string;
};

/** A substitution overlay for one grid cell. */
export type SubstitutionCell = {
    type: SubstitutionType;
    newSubject: string | null;
    newTeacher: string | null;
    newRoom: string | null;
    note: string | null;
};

export type DayCell = {
    period: number;
    lesson: LessonCell | null;
    substitution: SubstitutionCell | null;
};

export type DayColumn = {
    dayOfWeek: number; // 1 = Monday … 6 = Saturday
    date: string; // ISO date (yyyy-MM-dd)
    label: string; // short day name, e.g. "Mon"
    cells: DayCell[]; // always 8 entries, periods 1-8
};

/** What is actually happening in a slot once substitutions are applied. */
export function effectiveLesson(cell: DayCell): {
    subject: string | null;
    teacher: string | null;
    room: string | null;
    cancelled: boolean;
} {
    const { lesson, substitution } = cell;
    if (!substitution) {
        return lesson
            ? { subject: lesson.subject, teacher: lesson.teacher, room: lesson.room, cancelled: false }
            : { subject: null, teacher: null, room: null, cancelled: false };
    }
    if (substitution.type === 'cancellation') {
        return { subject: lesson?.subject ?? null, teacher: null, room: null, cancelled: true };
    }
    if (substitution.type === 'room_change') {
        return {
            subject: lesson?.subject ?? substitution.newSubject,
            teacher: lesson?.teacher ?? null,
            room: substitution.newRoom ?? lesson?.room ?? null,
            cancelled: false,
        };
    }
    // substitution
    return {
        subject: substitution.newSubject ?? lesson?.subject ?? null,
        teacher: substitution.newTeacher ?? null,
        room: substitution.newRoom ?? lesson?.room ?? null,
        cancelled: false,
    };
}
