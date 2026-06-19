-- =============================================================================
-- Security re-audit (audit3) — roles, parent-linking, admin panel.
--
-- Apply AFTER db/audit2-fixes.sql. Idempotent where possible.
-- Findings recorded in the audit of roles + parent invite + admin panel.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [CRITICAL] Self-escalation of role via profiles UPDATE (no WITH CHECK).
--
-- The previous "Users can update own profile." policy used USING (auth.uid()=id)
-- with NO WITH CHECK. Postgres reuses USING as the post-update check, which only
-- constrains `id` — so the row owner could freely set role='admin' (and tamper
-- external_skud_id) via a direct PostgREST PATCH. We pin both privileged columns
-- to their current values for self-service writes. Admin role/SKUD changes go
-- through the service-role client, which bypasses RLS and is unaffected.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND external_skud_id IS NOT DISTINCT FROM
        (SELECT p.external_skud_id FROM public.profiles p WHERE p.id = auth.uid())
  );


-- -----------------------------------------------------------------------------
-- [HIGH] Anonymous read of sensitive PII via profiles SELECT USING(true).
--
-- The "Public profiles are viewable by everyone." policy exposed phone,
-- external_skud_id (physical turnstile/SKUD card id of minors), grade and
-- class_letter to UNAUTHENTICATED callers using only the public anon key.
-- Restrict SELECT to authenticated users. (Display of names on the public
-- landing/leaderboard is behind auth already.) A follow-up should move
-- phone/external_skud_id into a staff-only table for column-level isolation.
--
-- NOTE: the in-app name-uniqueness probe during signup must now use the
-- service-role client (see app/login/actions.ts) since the pre-auth request is
-- anonymous and can no longer read profiles.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles." ON public.profiles;
CREATE POLICY "Authenticated users can view profiles." ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');


-- -----------------------------------------------------------------------------
-- [MEDIUM] external_skud_id has no uniqueness — duplicate badge ids resolve
-- ambiguously when matched by a turnstile webhook. Enforce a partial unique
-- index (NULLs allowed and not unique).
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS profiles_external_skud_id_unique
  ON public.profiles (external_skud_id)
  WHERE external_skud_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- [MEDIUM] Parent / student / staff cannot remove a family_bond (no DELETE
-- policy existed). Once linked, access to a child's data was permanent from
-- every in-app surface — a safeguarding concern. Allow the bonded parent, the
-- bonded student, or staff to delete the bond.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parent student or staff can remove bond." ON public.family_bonds;
CREATE POLICY "Parent student or staff can remove bond." ON public.family_bonds
  FOR DELETE USING (
    auth.uid() = parent_id
    OR auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','moderator'))
  );


-- -----------------------------------------------------------------------------
-- [HIGH #3 + MEDIUM #6] handle_new_user: clamp self-registerable roles to
-- (student, parent) and create the parent family_bond AT account-insert time.
--
-- #6: 'teacher' is removed from the self-registration clamp allowlist — teachers
--     are assigned by an admin, not self-registered.
-- #3: the previous flow created the family_bond in the signup server action,
--     AFTER an early return on the email-confirmation path — so confirmed-email
--     parents were never linked and the token was left unconsumed/replayable.
--     We now claim the token + create the bond inside this trigger (which fires
--     on the auth.users INSERT, i.e. at signup regardless of confirmation),
--     using the invite_code passed through raw_user_meta_data. SECURITY DEFINER
--     lets it write parent_invite_tokens/family_bonds past RLS.
--
-- Preserves the live award_reputation_points('Registration Bonus', 10) call.
-- -----------------------------------------------------------------------------
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

  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    resolved_role
  )
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.award_reputation_points(NEW.id, 'Registration Bonus', 10, '{"message": "Welcome"}'::jsonb);

  -- Parent linking: atomically claim a valid, unused, unexpired invite token and
  -- create the family bond. Runs even when email confirmation is pending.
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
