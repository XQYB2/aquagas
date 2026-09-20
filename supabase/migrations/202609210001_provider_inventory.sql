ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS auto_schedule boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS open_time time,
  ADD COLUMN IF NOT EXISTS close_time time,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0
    CHECK (stock_quantity >= 0);

NOTIFY pgrst, 'reload schema';
