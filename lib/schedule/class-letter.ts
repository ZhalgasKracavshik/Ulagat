/**
 * Canonical form of a class letter.
 *
 * Class letters are written in three places — profiles (set by the student),
 * schedule and substitutions (set by staff). Substitution emails are matched by
 * an EXACT string equality between a substitution's class_letter and each
 * student's profiles.class_letter, so any disagreement (stray whitespace, a
 * lower-case letter, "9a" vs "9A") makes the email silently reach nobody and
 * leaves the substitution unattached to the timetable.
 *
 * Normalising to trimmed + upper-case at every write point keeps the three
 * sources in agreement. (Note: this cannot merge visually-identical letters
 * from different scripts — Latin "A" vs Cyrillic "А" vs Kazakh "Ә" — so the
 * substitution form sources its class list from existing data instead of free
 * text. See components/schedule/SubstitutionForm.tsx.)
 */
export function normalizeClassLetter(value: string | null | undefined): string {
    return (value ?? '').trim().toUpperCase().slice(0, 3);
}

/**
 * Grades offered at registration (BINOM is a 5–11 gymnasium per the PRD).
 * Kept here so the registration form and any future class pickers agree.
 */
export const REGISTRABLE_GRADES = [5, 6, 7, 8, 9, 10, 11] as const;

/**
 * Canonical Kazakh class-letter set, used as the cold-start fallback at
 * registration when no real classes exist in the schedule yet. Once the
 * school has entered its timetable, students pick from the actual existing
 * classes instead (which guarantees an exact match for substitution emails).
 */
export const CLASS_LETTERS = ['А', 'Ә', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж'] as const;
