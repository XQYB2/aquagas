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
-- 008 — PayMongo payment columns
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
  ADD COLUMN IF NOT EXISTS paymongo_intent_id text;


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
-- 011 — Remove obsolete per-provider payment gateway credentials.
-- PayMongo credentials are server-only environment variables.
-- ============================================================

ALTER TABLE public.providers
  DROP COLUMN IF EXISTS konfirma_pk,
  DROP COLUMN IF EXISTS konfirma_sk,
  DROP COLUMN IF EXISTS konfirma_wallet_id,
  DROP COLUMN IF EXISTS konfirma_webhook_secret;

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS paylisten_session_id;


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


-- ============================================================
-- 014 — Batch delivery slots + orders columns
-- ============================================================

CREATE TABLE IF NOT EXISTS public.delivery_slots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week      int  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  time_hhmm        text NOT NULL, -- e.g. '09:00'
  max_orders       int  NOT NULL DEFAULT 20,
  cutoff_minutes   int  NOT NULL DEFAULT 60,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.delivery_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers manage own slots"
  ON public.delivery_slots FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()))
  WITH CHECK (provider_id IN (SELECT id FROM public.providers WHERE user_id = auth.uid()));

CREATE POLICY "Customers can read active slots"
  ON public.delivery_slots FOR SELECT TO authenticated
  USING (is_active = true);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'standard'
    CHECK (delivery_type IN ('standard', 'batch')),
  ADD COLUMN IF NOT EXISTS slot_id      uuid REFERENCES public.delivery_slots(id),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;


-- ============================================================
-- 015 — Add category + is_default to customer_addresses
-- ============================================================

ALTER TABLE public.customer_addresses
  ADD COLUMN IF NOT EXISTS category   text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Migrate existing label data to category
UPDATE public.customer_addresses SET category = label WHERE category IS NULL AND label IS NOT NULL;



-- ============================================================
-- 016 — Add cancel_reason to orders
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_reason text;


-- ============================================================
-- 017 — Add auto schedule columns to providers
-- ============================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS auto_schedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_time    time,
  ADD COLUMN IF NOT EXISTS close_time   time;

-- Provider contact/profile fields used by both web and mobile settings.
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS description text;


-- ============================================================
-- 018 — Secure inventory reservation and payment-session locks
-- IMPORTANT: existing products start at zero stock intentionally. Providers
-- must enter a verified count before those products can be ordered.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0
    CHECK (stock_quantity >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS stock_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_session_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_session_token uuid,
  ADD COLUMN IF NOT EXISTS payment_capture_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_order_with_inventory(
  p_provider_id uuid,
  p_items jsonb,
  p_delivery_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_payment_method text,
  p_notes text DEFAULT NULL,
  p_delivery_type text DEFAULT 'standard',
  p_slot_id uuid DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_product public.products%ROWTYPE;
  v_item record;
  v_slot public.delivery_slots%ROWTYPE;
  v_slot_orders integer;
BEGIN
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_delivery_address IS NULL OR length(trim(p_delivery_address)) = 0 THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  IF p_payment_method NOT IN ('cod', 'qrph') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;
  IF p_delivery_type NOT IN ('standard', 'batch') THEN
    RAISE EXCEPTION 'Unsupported delivery type';
  END IF;

  SELECT delivery_fee INTO v_delivery_fee
  FROM public.providers
  WHERE id = p_provider_id AND approval_status = 'active' AND is_open = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider is not available';
  END IF;

  IF p_delivery_type = 'batch' THEN
    IF p_slot_id IS NULL OR p_scheduled_at IS NULL OR p_scheduled_at <= now() THEN
      RAISE EXCEPTION 'A valid future batch slot is required';
    END IF;
    SELECT * INTO v_slot FROM public.delivery_slots
    WHERE id = p_slot_id AND provider_id = p_provider_id AND is_active = true
    FOR UPDATE;
    IF NOT FOUND OR p_scheduled_at <= now() + make_interval(mins => v_slot.cutoff_minutes) THEN
      RAISE EXCEPTION 'Batch slot is unavailable or past its cutoff';
    END IF;
    SELECT count(*) INTO v_slot_orders FROM public.orders
    WHERE slot_id = p_slot_id AND scheduled_at = p_scheduled_at AND status <> 'cancelled';
    IF v_slot_orders >= v_slot.max_orders THEN
      RAISE EXCEPTION 'Batch slot is full';
    END IF;
    v_delivery_fee := 0;
  ELSE
    p_slot_id := NULL;
    p_scheduled_at := NULL;
  END IF;

  FOR v_item IN
    SELECT product_id, sum(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
    GROUP BY product_id
    ORDER BY product_id
  LOOP
    IF v_item.product_id IS NULL OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Every item must have a product and positive quantity';
    END IF;
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    IF NOT FOUND OR v_product.provider_id <> p_provider_id OR NOT v_product.is_available THEN
      RAISE EXCEPTION 'A selected product is unavailable';
    END IF;
    IF v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for % (only % available)', v_product.name, v_product.stock_quantity;
    END IF;
    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
  END LOOP;

  INSERT INTO public.orders (
    customer_id, provider_id, status, total_amount, delivery_address,
    delivery_lat, delivery_lng, payment_method, payment_status, notes,
    delivery_type, slot_id, scheduled_at, stock_reserved_at
  ) VALUES (
    v_customer_id, p_provider_id,
    CASE WHEN p_payment_method = 'qrph' THEN 'pending_payment' ELSE 'placed' END,
    v_subtotal + v_delivery_fee, trim(p_delivery_address),
    p_delivery_lat, p_delivery_lng, p_payment_method, 'unpaid', NULLIF(trim(p_notes), ''),
    p_delivery_type, p_slot_id, p_scheduled_at, now()
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
  SELECT v_order_id, grouped.product_id, grouped.quantity, product.price
  FROM (
    SELECT product_id, sum(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
    GROUP BY product_id
  ) grouped
  JOIN public.products product ON product.id = grouped.product_id;

  UPDATE public.products product
  SET stock_quantity = product.stock_quantity - grouped.quantity,
      is_available = CASE WHEN product.stock_quantity - grouped.quantity = 0 THEN false ELSE product.is_available END
  FROM (
    SELECT product_id, sum(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity integer)
    GROUP BY product_id
  ) grouped
  WHERE product.id = grouped.product_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_inventory(uuid, jsonb, text, double precision, double precision, text, text, text, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(uuid, jsonb, text, double precision, double precision, text, text, text, uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_cancelled_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled'
     AND OLD.stock_reserved_at IS NOT NULL AND OLD.stock_released_at IS NULL THEN
    UPDATE public.products product
    SET stock_quantity = product.stock_quantity + item.quantity,
        is_available = true
    FROM public.order_items item
    WHERE item.order_id = OLD.id AND item.product_id = product.id;
    NEW.stock_released_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restore_stock_when_order_cancelled ON public.orders;
CREATE TRIGGER restore_stock_when_order_cancelled
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_cancelled_order_stock();

CREATE OR REPLACE FUNCTION public.restore_deleted_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stock_reserved_at IS NOT NULL AND OLD.stock_released_at IS NULL THEN
    UPDATE public.products product
    SET stock_quantity = product.stock_quantity + item.quantity,
        is_available = true
    FROM public.order_items item
    WHERE item.order_id = OLD.id AND item.product_id = product.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS restore_stock_when_order_deleted ON public.orders;
CREATE TRIGGER restore_stock_when_order_deleted
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_deleted_order_stock();

-- New checkout creation must go through the transactional function above.
REVOKE INSERT ON public.orders FROM authenticated;
REVOKE INSERT ON public.order_items FROM authenticated;
