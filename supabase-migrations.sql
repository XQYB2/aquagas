-- ============================================================
-- AquaGas — All Migrations (004 → 007)
-- Run in Supabase SQL Editor → New Query
-- ============================================================


-- ============================================================
-- Migration 004
-- Keeps providers.rating (and adds review_count) in sync with
-- the reviews table via a trigger.
-- ============================================================

ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS review_count int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.refresh_provider_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_provider_id uuid;
BEGIN
  target_provider_id := COALESCE(NEW.provider_id, OLD.provider_id);

  UPDATE public.providers
  SET
    rating       = COALESCE((SELECT AVG(rating) FROM public.reviews WHERE provider_id = target_provider_id), 0),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE provider_id = target_provider_id)
  WHERE id = target_provider_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.refresh_provider_rating();

-- Backfill existing providers
UPDATE public.providers p
SET
  rating       = COALESCE((SELECT AVG(rating) FROM public.reviews WHERE provider_id = p.id), 0),
  review_count = (SELECT COUNT(*) FROM public.reviews WHERE provider_id = p.id);


-- ============================================================
-- Migration 005
-- Allow anyone to read reviewer profile info so store pages
-- can show who left each review.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view reviewer profile info" ON public.profiles;
CREATE POLICY "Anyone can view reviewer profile info" ON public.profiles
  FOR SELECT USING (
    id IN (SELECT customer_id FROM public.reviews)
  );


-- ============================================================
-- Migration 006
-- Public storage bucket for store logos.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view store logos" ON storage.objects;
CREATE POLICY "Anyone can view store logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-logos');

DROP POLICY IF EXISTS "Providers can manage own store logo" ON storage.objects;
CREATE POLICY "Providers can manage own store logo" ON storage.objects
  FOR ALL USING (
    bucket_id = 'store-logos'
    AND auth.uid() IN (
      SELECT user_id FROM public.providers
      WHERE id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'store-logos'
    AND auth.uid() IN (
      SELECT user_id FROM public.providers
      WHERE id::text = (storage.foldername(name))[1]
    )
  );


-- ============================================================
-- Migration 007
-- New order flow columns: estimated delivery, pickup instruction,
-- and delivery coordinates for map features.
-- ============================================================

-- Allow providers to read profiles of customers who ordered from them
DROP POLICY IF EXISTS "Providers can view their customer profiles" ON public.profiles;
CREATE POLICY "Providers can view their customer profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT o.customer_id FROM public.orders o
      JOIN public.providers p ON p.id = o.provider_id
      WHERE p.user_id = auth.uid()
    )
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_delivery  text,
  ADD COLUMN IF NOT EXISTS pickup_instruction  text,
  ADD COLUMN IF NOT EXISTS delivery_lat        double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng        double precision;
