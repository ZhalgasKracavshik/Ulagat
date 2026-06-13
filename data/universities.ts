// ============================================================
// Phase 12 — ЕНТ (UNT) reference data for the career tracker.
//
// ⚠️  APPROXIMATE REFERENCE DATA — VERIFY OFFICIALLY.
// The grant cutoff scores ("проходной балл") below are illustrative
// seed values in realistic ranges. Real cutoffs change every year and
// per specialty; students MUST confirm current figures on each
// university's official admissions page and the national portal.
// ============================================================

/** Total points available on the ЕНТ. */
export const ENT_MAX_TOTAL = 140;

/** Max points per individual subject (mandatory and profile alike). */
export const ENT_MAX_PER_SUBJECT = 40;

/**
 * The three mandatory ЕНТ subjects, keyed by the slug stored in
 * career_tracker.ent_scores. These are the same for every student.
 */
export const ENT_MANDATORY_SUBJECTS = [
    { key: 'math_literacy', label: 'Mathematics literacy' },
    { key: 'reading', label: 'Reading literacy' },
    { key: 'history', label: 'History of Kazakhstan' },
] as const;

/**
 * Profile subjects a student may choose as their two profile subjects.
 * The label is the canonical English name; it is also the value stored
 * in career_tracker.profile_subject_1 / _2.
 */
export const ENT_PROFILE_SUBJECTS = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Geography',
    'World History',
    'English',
    'Russian Literature',
    'Kazakh Literature',
    'Informatics',
    'Law',
    'Creative exam',
] as const;

export type EntProfileSubject = (typeof ENT_PROFILE_SUBJECTS)[number];

export function isEntProfileSubject(value: string): value is EntProfileSubject {
    return (ENT_PROFILE_SUBJECTS as readonly string[]).includes(value);
}

/** Convenience: every subject (mandatory + profile) with its display label. */
export const ENT_SUBJECTS = {
    mandatory: ENT_MANDATORY_SUBJECTS,
    profile: ENT_PROFILE_SUBJECTS,
} as const;

/**
 * Map of "profile subject A + profile subject B" → unlocked specialty
 * groups. The key is built with `combinationKey(a, b)` so order does not
 * matter. Covers the common BINOM combinations.
 */
export const SUBJECT_COMBINATIONS: Record<string, string[]> = {
    'Mathematics+Physics': ['Engineering', 'IT', 'Architecture', 'Energy'],
    'Mathematics+Informatics': ['IT', 'Data Science', 'Engineering', 'Finance'],
    'Mathematics+Geography': ['Economics', 'Logistics', 'Urban Planning'],
    'Physics+Informatics': ['IT', 'Robotics', 'Engineering'],
    'Biology+Chemistry': ['Medicine', 'Pharmacy', 'Biotechnology', 'Dentistry'],
    'Chemistry+Physics': ['Chemical Engineering', 'Materials Science', 'Energy'],
    'Geography+English': ['International Relations', 'Tourism', 'Logistics'],
    'Geography+World History': ['International Relations', 'Political Science', 'Law'],
    'World History+Law': ['Law', 'Political Science', 'Public Administration'],
    'English+World History': ['Journalism', 'International Relations', 'Translation'],
    'Kazakh Literature+English': ['Philology', 'Pedagogy', 'Translation'],
    'Russian Literature+English': ['Philology', 'Journalism', 'Translation'],
    'Creative exam+English': ['Design', 'Architecture', 'Media Arts'],
};

/**
 * Builds an order-independent key for a profile-subject pair so that
 * "Math+Physics" and "Physics+Math" both resolve to the same entry.
 */
export function combinationKey(a: string, b: string): string {
    return [a.trim(), b.trim()].sort((x, y) => x.localeCompare(y)).join('+');
}

/**
 * Returns the unlocked specialty groups for a profile-subject pair, or an
 * empty array if the combination is not in the reference table.
 */
export function unlockedSpecialties(
    subject1: string | null,
    subject2: string | null,
): string[] {
    if (!subject1 || !subject2) return [];
    return SUBJECT_COMBINATIONS[combinationKey(subject1, subject2)] ?? [];
}

export type UniversitySpecialty = {
    name: string;
    /** Specialty group this maps to (matches SUBJECT_COMBINATIONS values). */
    group: string;
    /** ⚠️ Approximate grant cutoff out of 140 — verify officially. */
    approxCutoff: number;
};

export type University = {
    id: string;
    name: string;
    city: string;
    specialties: UniversitySpecialty[];
};

/**
 * ~12 major Kazakhstan universities with a few sample specialties each.
 *
 * ⚠️  All `approxCutoff` values are APPROXIMATE REFERENCE DATA in the
 * realistic 90–135 / 140 range — they are NOT official and must be
 * verified on each university's admissions page before relying on them.
 */
export const UNIVERSITIES: University[] = [
    {
        id: 'nu',
        name: 'Nazarbayev University',
        city: 'Astana',
        specialties: [
            { name: 'Computer Science', group: 'IT', approxCutoff: 135 },
            { name: 'Chemical Engineering', group: 'Chemical Engineering', approxCutoff: 130 },
            { name: 'Medicine', group: 'Medicine', approxCutoff: 134 },
        ],
    },
    {
        id: 'kbtu',
        name: 'Kazakh-British Technical University (KBTU)',
        city: 'Almaty',
        specialties: [
            { name: 'Information Systems', group: 'IT', approxCutoff: 122 },
            { name: 'Petroleum Engineering', group: 'Engineering', approxCutoff: 118 },
            { name: 'Finance', group: 'Finance', approxCutoff: 120 },
        ],
    },
    {
        id: 'sdu',
        name: 'SDU University',
        city: 'Kaskelen',
        specialties: [
            { name: 'Computer Science', group: 'IT', approxCutoff: 110 },
            { name: 'Pedagogy', group: 'Pedagogy', approxCutoff: 95 },
            { name: 'Biotechnology', group: 'Biotechnology', approxCutoff: 105 },
        ],
    },
    {
        id: 'iitu',
        name: 'International IT University (IITU)',
        city: 'Almaty',
        specialties: [
            { name: 'Software Engineering', group: 'IT', approxCutoff: 115 },
            { name: 'Data Science', group: 'Data Science', approxCutoff: 117 },
            { name: 'Media Communications', group: 'Media Arts', approxCutoff: 100 },
        ],
    },
    {
        id: 'kimep',
        name: 'KIMEP University',
        city: 'Almaty',
        specialties: [
            { name: 'International Relations', group: 'International Relations', approxCutoff: 112 },
            { name: 'Finance', group: 'Finance', approxCutoff: 114 },
            { name: 'Law', group: 'Law', approxCutoff: 110 },
        ],
    },
    {
        id: 'kaznu',
        name: 'Al-Farabi Kazakh National University (KazNU)',
        city: 'Almaty',
        specialties: [
            { name: 'Physics', group: 'Engineering', approxCutoff: 108 },
            { name: 'Journalism', group: 'Journalism', approxCutoff: 105 },
            { name: 'Biology', group: 'Biotechnology', approxCutoff: 106 },
        ],
    },
    {
        id: 'enu',
        name: 'L.N. Gumilyov Eurasian National University (ENU)',
        city: 'Astana',
        specialties: [
            { name: 'Political Science', group: 'Political Science', approxCutoff: 104 },
            { name: 'Architecture', group: 'Architecture', approxCutoff: 109 },
            { name: 'Law', group: 'Law', approxCutoff: 107 },
        ],
    },
    {
        id: 'satbayev',
        name: 'Satbayev University',
        city: 'Almaty',
        specialties: [
            { name: 'Energy Engineering', group: 'Energy', approxCutoff: 100 },
            { name: 'Robotics', group: 'Robotics', approxCutoff: 108 },
            { name: 'Materials Science', group: 'Materials Science', approxCutoff: 98 },
        ],
    },
    {
        id: 'almau',
        name: 'AlmaU (Almaty Management University)',
        city: 'Almaty',
        specialties: [
            { name: 'Economics', group: 'Economics', approxCutoff: 102 },
            { name: 'Logistics', group: 'Logistics', approxCutoff: 99 },
            { name: 'Tourism', group: 'Tourism', approxCutoff: 92 },
        ],
    },
    {
        id: 'astana-it',
        name: 'Astana IT University',
        city: 'Astana',
        specialties: [
            { name: 'Software Engineering', group: 'IT', approxCutoff: 116 },
            { name: 'Cybersecurity', group: 'IT', approxCutoff: 118 },
            { name: 'Big Data Analytics', group: 'Data Science', approxCutoff: 115 },
        ],
    },
    {
        id: 'kaznmu',
        name: 'Asfendiyarov Kazakh National Medical University (KazNMU)',
        city: 'Almaty',
        specialties: [
            { name: 'General Medicine', group: 'Medicine', approxCutoff: 120 },
            { name: 'Pharmacy', group: 'Pharmacy', approxCutoff: 110 },
            { name: 'Dentistry', group: 'Dentistry', approxCutoff: 118 },
        ],
    },
    {
        id: 'narxoz',
        name: 'Narxoz University',
        city: 'Almaty',
        specialties: [
            { name: 'Finance', group: 'Finance', approxCutoff: 100 },
            { name: 'Economics', group: 'Economics', approxCutoff: 98 },
            { name: 'Public Administration', group: 'Public Administration', approxCutoff: 95 },
        ],
    },
];

/** Distinct cities for the University Explorer filter. */
export const UNIVERSITY_CITIES = Array.from(
    new Set(UNIVERSITIES.map((u) => u.city)),
).sort((a, b) => a.localeCompare(b));

/** Disclaimer shown wherever reference cutoffs are displayed. */
export const REFERENCE_DATA_DISCLAIMER =
    'Approximate reference data — grant cutoffs change yearly. Verify officially on each university’s admissions page.';
