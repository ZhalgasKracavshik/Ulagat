-- =============================================================================
-- Schedule/substitution reliability: normalize class_letter.
--
-- Substitution emails match a substitution's class_letter against each
-- student's profiles.class_letter by EXACT string equality. Any disagreement
-- (case or stray whitespace) makes the email reach nobody and leaves the
-- substitution unattached to the timetable. The app now normalizes class_letter
-- to trimmed + upper-case at every write point (lib/schedule/class-letter.ts);
-- this one-off pass aligns any pre-existing rows.
--
-- NOTE: this cannot merge visually-identical letters from different scripts
-- (Latin "A" vs Cyrillic "А" vs Kazakh "Ә"). The substitution form now sources
-- its class list from real data to avoid that class of typo.
-- Idempotent: only touches rows that are not already normalized.
-- =============================================================================

UPDATE public.profiles
  SET class_letter = upper(btrim(class_letter))
  WHERE class_letter IS NOT NULL
    AND class_letter <> upper(btrim(class_letter));

UPDATE public.schedule
  SET class_letter = upper(btrim(class_letter))
  WHERE class_letter <> upper(btrim(class_letter));

UPDATE public.substitutions
  SET class_letter = upper(btrim(class_letter))
  WHERE class_letter <> upper(btrim(class_letter));
