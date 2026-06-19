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
