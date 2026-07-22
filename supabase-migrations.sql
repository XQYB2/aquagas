-- ============================================================
-- AquaGas — Full Migration Script (run once in Supabase SQL Editor)
-- Covers migrations 004 → 008
-- ============================================================


-- ============================================================
-- 004 — Rating trigger & review_count column
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
-- 005 — Reviewer profile RLS (store pages can show who reviewed)
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view reviewer profile info" ON public.profiles;
CREATE POLICY "Anyone can view reviewer profile info" ON public.profiles
  FOR SELECT USING (
    id IN (SELECT customer_id FROM public.reviews)
  );


-- ============================================================
-- 006 — Store logos storage bucket
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
-- 007 — Order flow columns + provider can read customer profiles
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_delivery  text,
  ADD COLUMN IF NOT EXISTS pickup_instruction  text,
  ADD COLUMN IF NOT EXISTS delivery_lat        double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng        double precision;

DROP POLICY IF EXISTS "Providers can view their customer profiles" ON public.profiles;
CREATE POLICY "Providers can view their customer profiles" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT o.customer_id FROM public.orders o
      JOIN public.providers p ON p.id = o.provider_id
      WHERE p.user_id = auth.uid()
    )
  );


-- ============================================================
-- 008 — GCash / PayListen payment columns
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
  ADD COLUMN IF NOT EXISTS paylisten_session_id uuid;


-- ============================================================
-- 009 — Customers can cancel their own orders
--       COD: cancellable any time before picked_up
--       GCash: cancellable only while payment_status = 'unpaid'
-- ============================================================

DROP POLICY IF EXISTS "Customers can cancel their own placed orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can cancel their own orders" ON public.orders;
CREATE POLICY "Customers can cancel their own orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid()
    AND status = 'cancelled'
  );


-- ============================================================
-- 010 — Product images storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Product images are public" ON storage.objects;
CREATE POLICY "Product images are public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Providers can upload product images" ON storage.objects;
CREATE POLICY "Providers can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Providers can update product images" ON storage.objects;
CREATE POLICY "Providers can update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Providers can delete product images" ON storage.objects;
CREATE POLICY "Providers can delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images');


-- ============================================================
-- 011 — Per-provider Konfirma (PayAll) GCash payment keys
-- ============================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS konfirma_pk             text,
  ADD COLUMN IF NOT EXISTS konfirma_sk             text,
  ADD COLUMN IF NOT EXISTS konfirma_wallet_id      text,
  ADD COLUMN IF NOT EXISTS konfirma_webhook_secret text;


-- ============================================================
-- 012 — Allow pending_payment in orders.status check constraint
-- ============================================================

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending_payment',
    'placed',
    'confirmed',
    'awaiting_pickup',
    'picked_up',
    'being_prepared',
    'out_for_delivery',
    'delivered',
    'cancelled'
  ));


-- ============================================================
-- 013 — Add lat/lng/label to customer_addresses
-- ============================================================

ALTER TABLE public.customer_addresses
  ADD COLUMN IF NOT EXISTS lat   double precision,
  ADD COLUMN IF NOT EXISTS lng   double precision,
  ADD COLUMN IF NOT EXISTS label text;
