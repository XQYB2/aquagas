create table if not exists public.customer_favorite_providers (
  customer_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, provider_id)
);

alter table public.customer_favorite_providers enable row level security;
drop policy if exists "Customers manage favorites" on public.customer_favorite_providers;
create policy "Customers manage favorites" on public.customer_favorite_providers
  for all to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
