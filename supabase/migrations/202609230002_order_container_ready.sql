-- Customer confirmation that refill containers are ready for rider pickup.
alter table public.orders
  add column if not exists containers_ready_at timestamptz;

comment on column public.orders.containers_ready_at is
  'Time the customer confirmed that empty gallons or LPG cylinder were placed outside for pickup.';
