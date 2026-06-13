-- ============================================================
-- PHASE 13-14 — TWO-PHASE UI + FREEMIUM SUBSCRIPTIONS
-- Run once in the Supabase SQL Editor.
-- Idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS throughout,
-- safe to re-run.
--
-- Phase 13 (Two-phase Express/Full UI) is purely client-side
-- (localStorage + Almaty-time auto-detect) — no schema needed.
--
-- Phase 14 introduces the subscriptions table:
--   subscriptions — one row per user. Tracks the effective plan
--                   ('free' | 'premium'), Stripe identifiers and the
--                   current period end.
--
-- SECURITY MODEL (critical):
--   Rows are written ONLY by the Stripe webhook via the service-role
--   client (createAdminClient bypasses RLS). There are deliberately NO
--   client INSERT/UPDATE/DELETE policies, so a user can never
--   self-grant premium by writing directly through PostgREST.
--   Users (and staff) may only SELECT.
-- ============================================================


-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
  ON public.subscriptions (stripe_subscription_id);

-- ai_usage — one row per (user, day). Tracks the freemium AI question
-- quota. Incremented server-side via the service-role client when the AI
-- mentor launches; for now it is plumbing only.
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date
  ON public.ai_usage (user_id, date);


-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: own row, or staff (moderator/admin) for support/visibility.
DROP POLICY IF EXISTS "Owner and staff can view subscription" ON public.subscriptions;
CREATE POLICY "Owner and staff can view subscription"
  ON public.subscriptions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('moderator', 'admin')
    )
  );

-- NO client INSERT / UPDATE / DELETE policies on purpose.
-- The Stripe webhook writes via the service-role key, which bypasses
-- RLS. This guarantees a user can never mint premium for themselves.

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- SELECT: own usage only (so the UI can show "X of N questions used today").
DROP POLICY IF EXISTS "Owner can view ai usage" ON public.ai_usage;
CREATE POLICY "Owner can view ai usage"
  ON public.ai_usage FOR SELECT
  USING (user_id = auth.uid());

-- NO client INSERT / UPDATE / DELETE policies on purpose. The quota counter
-- is incremented server-side via the service-role client (which bypasses
-- RLS), so a user can never reset or fake their own usage.


-- ============================================================
-- 3. HELPER FUNCTION — effective plan
-- A convenience for SQL/RLS use. The app reads the table directly via
-- lib/subscription.ts, but this mirrors the same "expired → free" rule.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_premium(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = uid
      AND s.plan = 'premium'
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;


-- ============================================================
-- 4. updated_at touch trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.tr_subscriptions_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_subscriptions_touch ON public.subscriptions;
CREATE TRIGGER on_subscriptions_touch
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.tr_subscriptions_touch();
