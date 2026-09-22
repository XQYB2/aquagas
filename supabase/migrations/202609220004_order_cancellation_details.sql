-- Provider cancellation details shown consistently on web and mobile.
alter table public.orders add column if not exists cancel_reason text;

comment on column public.orders.cancel_reason is
  'Customer-visible reason supplied when a provider cancels an order.';
