-- audit8: persist a student's grade + class_letter from signup metadata.
--
-- Cold-start fix: the registration form now collects grade + class_letter for
-- students. Carrying them through the handle_new_user trigger (the same way
-- invite_code is carried for parents) makes a newly registered student
-- immediately reachable by the schedule view and substitution emails, without
-- a separate profile-edit step. Substitution targeting matches students by an
-- exact (grade, class_letter) equality, so a student with NULL class was
-- previously invisible to the platform's core morning feature.
--
-- Additive + guarded: non-student signups and missing/invalid values fall back
-- to NULL, so the trigger never throws on malformed metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  resolved_role text;
  invite text;
  bonded_student uuid;
BEGIN
  resolved_role := CASE WHEN NEW.raw_user_meta_data->>'role' IN ('student', 'parent')
                        THEN NEW.raw_user_meta_data->>'role'
                        ELSE 'student'
                   END;

  INSERT INTO public.profiles (id, full_name, avatar_url, role, grade, class_letter)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    resolved_role,
    CASE WHEN resolved_role = 'student'
              AND (NEW.raw_user_meta_data->>'grade') ~ '^[0-9]+$'
              AND (NEW.raw_user_meta_data->>'grade')::int BETWEEN 1 AND 11
         THEN (NEW.raw_user_meta_data->>'grade')::int
         ELSE NULL END,
    CASE WHEN resolved_role = 'student'
         THEN NULLIF(upper(trim(NEW.raw_user_meta_data->>'class_letter')), '')
         ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.award_reputation_points(NEW.id, 'Registration Bonus', 10, '{"message": "Welcome"}'::jsonb);

  IF resolved_role = 'parent' THEN
    invite := NEW.raw_user_meta_data->>'invite_code';
    IF invite IS NOT NULL AND length(trim(invite)) > 0 THEN
      UPDATE public.parent_invite_tokens
        SET used_at = now()
        WHERE token = trim(invite)
          AND used_at IS NULL
          AND expires_at > now()
        RETURNING student_id INTO bonded_student;

      IF bonded_student IS NOT NULL THEN
        INSERT INTO public.family_bonds (parent_id, student_id)
        VALUES (NEW.id, bonded_student)
        ON CONFLICT (parent_id, student_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
