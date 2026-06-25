-- =============================================================================
-- AUDIT6 — services vertical hardening (found by adversarial review; applied live).
-- =============================================================================

-- [HIGH] services INSERT bypass (identical to the events one): a leftover
-- permissive policy ("Auth users can create services.") let ANY authenticated
-- user create a service (even status='active'), bypassing the role gate and
-- moderation. Drop it; keep a single role-gated policy that pins non-staff
-- inserts to status='pending'.
DROP POLICY IF EXISTS "Auth users can create services." ON public.services;
DROP POLICY IF EXISTS "Staff, teachers and parliament can create services." ON public.services;
CREATE POLICY "Staff, teachers and parliament can create services." ON public.services
  FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('teacher', 'admin', 'moderator', 'parliament')
    )
    AND (
      status = 'pending'
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'moderator')
      )
    )
  );

-- [MEDIUM] reviews: the addReview action blocks self-review and duplicates, but
-- the INSERT RLS only checked reviewer_id = auth.uid(), so a direct insert could
-- bypass both. Enforce at the DB: one review per (service, reviewer), and no
-- reviewing your own service. (rating 1-5 is already a CHECK constraint.)
CREATE UNIQUE INDEX IF NOT EXISTS reviews_service_reviewer_unique
  ON public.reviews (service_id, reviewer_id);

CREATE OR REPLACE FUNCTION public.tr_review_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.services
    WHERE id = NEW.service_id AND owner_id = NEW.reviewer_id
  ) THEN
    RAISE EXCEPTION 'You cannot review your own service' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS review_guard ON public.reviews;
CREATE TRIGGER review_guard
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.tr_review_guard();
