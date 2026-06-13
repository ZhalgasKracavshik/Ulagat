-- ============================================================
-- PHASE 8 — LOST & FOUND (Потеряшки)
-- Run once in the Supabase SQL Editor.
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS throughout,
-- safe to re-run.
--
--   lost_items         — posted lost/found items (status machine:
--                        lost → found → claimed)
--   lost_item_claims   — IMMUTABLE audit log of every "This is mine!"
--                        click (anti-fraud); staff-readable, no
--                        UPDATE / DELETE policies
--   lost-found bucket  — public-read photo storage
--
-- A guard trigger (tr_lost_item_guard) is the security backstop:
-- only parliament/moderator/admin may change an item's status, and
-- non-staff INSERTs are forced to an allowed status. claimed_at is
-- stamped automatically when status flips to 'claimed'.
-- ============================================================


-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('electronics', 'clothing', 'books', 'accessories', 'documents', 'other')),
  photo_url TEXT,
  location TEXT,
  -- 'lost' = someone lost it (looking for it); 'found' = someone found it /
  -- it's in the lost&found office; 'claimed' = returned to owner.
  status TEXT NOT NULL DEFAULT 'found' CHECK (status IN ('lost', 'found', 'claimed')),
  posted_by UUID NOT NULL REFERENCES public.profiles(id),
  claimed_by UUID REFERENCES public.profiles(id),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Immutable claim audit log (anti-fraud): every "This is mine!" click.
CREATE TABLE IF NOT EXISTS public.lost_item_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.lost_items(id) ON DELETE CASCADE,
  claimant_id UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, claimant_id)  -- one claim per user per item
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lost_items_status ON public.lost_items (status);
CREATE INDEX IF NOT EXISTS idx_lost_items_category ON public.lost_items (category);
CREATE INDEX IF NOT EXISTS idx_lost_items_created_at ON public.lost_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_item_claims_item_id ON public.lost_item_claims (item_id);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_item_claims ENABLE ROW LEVEL SECURITY;

-- ---------- lost_items ----------
-- SELECT: every authenticated user can browse the board.
DROP POLICY IF EXISTS "Authenticated users can view lost items" ON public.lost_items;
CREATE POLICY "Authenticated users can view lost items"
  ON public.lost_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT: student/teacher/parliament post for themselves
-- (posted_by = self). Moderators/admins may also post for completeness.
DROP POLICY IF EXISTS "Members can post lost items" ON public.lost_items;
CREATE POLICY "Members can post lost items"
  ON public.lost_items FOR INSERT
  WITH CHECK (
    posted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('student', 'teacher', 'parliament', 'moderator', 'admin')
    )
  );

-- UPDATE: only parliament/moderator/admin (status transitions). The
-- poster can NOT self-mark their item claimed — the guard trigger
-- additionally blocks any status change from non-staff.
DROP POLICY IF EXISTS "Staff can update lost items" ON public.lost_items;
CREATE POLICY "Staff can update lost items"
  ON public.lost_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  );

-- DELETE: the poster (mistaken / resolved post) or staff.
DROP POLICY IF EXISTS "Poster and staff can delete lost items" ON public.lost_items;
CREATE POLICY "Poster and staff can delete lost items"
  ON public.lost_items FOR DELETE
  USING (
    posted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  );

-- ---------- lost_item_claims (IMMUTABLE) ----------
-- INSERT: any authenticated user claims for themselves.
DROP POLICY IF EXISTS "Users can register claims" ON public.lost_item_claims;
CREATE POLICY "Users can register claims"
  ON public.lost_item_claims FOR INSERT
  WITH CHECK (
    claimant_id = auth.uid()
    AND auth.role() = 'authenticated'
  );

-- SELECT: the claimant sees their own claims; parliament/moderator/admin
-- see the full audit trail.
DROP POLICY IF EXISTS "Claimant and staff can view claims" ON public.lost_item_claims;
CREATE POLICY "Claimant and staff can view claims"
  ON public.lost_item_claims FOR SELECT
  USING (
    claimant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('parliament', 'moderator', 'admin')
    )
  );

-- NO UPDATE, NO DELETE policies — claims are an immutable audit log.


-- ============================================================
-- 3. STATUS GUARD TRIGGER
-- Security backstop mirroring tr_club_guard. Only parliament/
-- moderator/admin may set or change an item's status; non-staff
-- INSERTs are forced to an allowed status (lost/found, never
-- 'claimed'). claimed_at is stamped automatically when status flips
-- to 'claimed' and cleared when it flips away.
--
-- auth.uid() IS NULL (SQL editor / service role) passes through.
-- ============================================================

CREATE OR REPLACE FUNCTION public.tr_lost_item_guard()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  is_staff BOOLEAN;
BEGIN
  IF caller IS NULL THEN
    -- Service role / SQL editor: still keep claimed_at consistent.
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'claimed' AND NEW.claimed_at IS NULL THEN
        NEW.claimed_at := now();
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'claimed' THEN
        NEW.claimed_at := COALESCE(NEW.claimed_at, now());
      ELSE
        NEW.claimed_at := NULL;
        NEW.claimed_by := NULL;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller
      AND role IN ('parliament', 'moderator', 'admin')
  ) INTO is_staff;

  IF TG_OP = 'INSERT' THEN
    -- Non-staff may only open a post as 'lost' or 'found'.
    IF NOT is_staff AND NEW.status NOT IN ('lost', 'found') THEN
      NEW.status := 'found';
    END IF;
    NEW.claimed_by := NULL;
    NEW.claimed_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE.
  IF NOT is_staff
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only parliament, moderators and admins can change a lost item''s status';
  END IF;

  -- Keep claimed_at in sync with status whoever makes the change.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'claimed' THEN
      NEW.claimed_at := COALESCE(NEW.claimed_at, now());
    ELSE
      NEW.claimed_at := NULL;
      NEW.claimed_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_lost_item_guard ON public.lost_items;
CREATE TRIGGER tr_lost_item_guard
  BEFORE INSERT OR UPDATE ON public.lost_items
  FOR EACH ROW EXECUTE PROCEDURE public.tr_lost_item_guard();


-- ============================================================
-- 4. STORAGE — lost & found photos (public read; uploads limited to
-- the roles that can post: student/teacher/parliament/moderator/admin).
-- Same pattern as the club-logos bucket.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lost-found', 'lost-found', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Lost Found" ON storage.objects;
CREATE POLICY "Public Access Lost Found" ON storage.objects
  FOR SELECT USING (bucket_id = 'lost-found');

DROP POLICY IF EXISTS "Role Upload Lost Found" ON storage.objects;
CREATE POLICY "Role Upload Lost Found" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lost-found'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('student', 'teacher', 'parliament', 'moderator', 'admin')
    )
  );


-- ============================================================
-- SECURITY HARDENING (post-review of Phase 8)
-- Idempotent — safe to run on databases that already applied the
-- sections above.
-- ============================================================

-- ------------------------------------------------------------
-- P1-1: The guard trigger let an item be marked 'claimed' without a
-- matching row in the immutable claim log — staff (or the service
-- role) could set claimed_by to an arbitrary user who never clicked
-- "This is mine!", corrupting the anti-fraud audit trail.
--
-- Fix: require NEW.claimed_by IS NOT NULL AND a matching claim to
-- exist whenever NEW.status = 'claimed'. This is a data-integrity
-- invariant, not a permission check, so it runs for EVERY caller —
-- including the service role (auth.uid() IS NULL) — by sitting before
-- the early return. Staff are still bound by it: they may only hand an
-- item to someone who actually registered a claim. claimed_at is still
-- auto-stamped on the flip to 'claimed' and cleared on the way out.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_lost_item_guard()
RETURNS TRIGGER AS $$
DECLARE
  caller UUID := (SELECT auth.uid());
  is_staff BOOLEAN;
BEGIN
  -- Data-integrity invariant (applies to ALL callers, service role
  -- included): an item can only be 'claimed' by someone who has a
  -- registered claim in the immutable log.
  IF NEW.status = 'claimed' THEN
    IF NEW.claimed_by IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.lost_item_claims
      WHERE item_id = NEW.id AND claimant_id = NEW.claimed_by
    ) THEN
      RAISE EXCEPTION 'Cannot mark claimed: recipient has no registered claim for this item';
    END IF;
  END IF;

  IF caller IS NULL THEN
    -- Service role / SQL editor: still keep claimed_at consistent.
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'claimed' AND NEW.claimed_at IS NULL THEN
        NEW.claimed_at := now();
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'claimed' THEN
        NEW.claimed_at := COALESCE(NEW.claimed_at, now());
      ELSE
        NEW.claimed_at := NULL;
        NEW.claimed_by := NULL;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = caller
      AND role IN ('parliament', 'moderator', 'admin')
  ) INTO is_staff;

  IF TG_OP = 'INSERT' THEN
    -- Non-staff may only open a post as 'lost' or 'found'.
    IF NOT is_staff AND NEW.status NOT IN ('lost', 'found') THEN
      NEW.status := 'found';
    END IF;
    NEW.claimed_by := NULL;
    NEW.claimed_at := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE.
  IF NOT is_staff
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only parliament, moderators and admins can change a lost item''s status';
  END IF;

  -- Keep claimed_at in sync with status whoever makes the change.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'claimed' THEN
      NEW.claimed_at := COALESCE(NEW.claimed_at, now());
    ELSE
      NEW.claimed_at := NULL;
      NEW.claimed_by := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_lost_item_guard ON public.lost_items;
CREATE TRIGGER tr_lost_item_guard
  BEFORE INSERT OR UPDATE ON public.lost_items
  FOR EACH ROW EXECUTE PROCEDURE public.tr_lost_item_guard();

-- ------------------------------------------------------------
-- P1-2: lost_item_claims.item_id is ON DELETE CASCADE, and the prior
-- DELETE policy ("Poster and staff can delete lost items") let any
-- poster delete their own item — cascading away (and destroying) the
-- immutable claim audit log. A poster could thus erase every
-- "This is mine!" record simply by deleting the post.
--
-- Fix: a poster may delete their item ONLY while no claims exist;
-- once anyone has claimed it, only staff (moderator/admin) may delete
-- it. Staff deletion is an intentional, audited administrative action.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Poster and staff can delete lost items" ON public.lost_items;
DROP POLICY IF EXISTS "Poster or staff can delete items" ON public.lost_items;
CREATE POLICY "Poster or staff can delete items"
  ON public.lost_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('moderator', 'admin')
    )
    OR (
      posted_by = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.lost_item_claims WHERE item_id = lost_items.id
      )
    )
  );
