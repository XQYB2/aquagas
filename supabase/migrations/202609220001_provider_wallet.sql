-- Provider wallet and payout ledger for centrally collected QR Ph payments.
create table if not exists public.platform_settings (
  id integer primary key default 1 check (id = 1),
  platform_name text not null default 'AquaGas',
  commission_rate numeric(5,2) not null default 5 check (commission_rate >= 0 and commission_rate <= 100),
  water_enabled boolean not null default true,
  lpg_enabled boolean not null default true,
  announcement text,
  announcement_active boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings(id) values (1) on conflict (id) do nothing;

create table if not exists public.provider_payouts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  reference_number text,
  admin_note text
);

create index if not exists provider_payouts_provider_requested_idx
  on public.provider_payouts(provider_id, requested_at desc);

alter table public.provider_payouts enable row level security;

drop policy if exists "Providers can view their payouts" on public.provider_payouts;
create policy "Providers can view their payouts" on public.provider_payouts
  for select using (
    exists (select 1 from public.providers p where p.id = provider_id and p.user_id = auth.uid())
  );

drop policy if exists "Admins can manage payouts" on public.provider_payouts;
create policy "Admins can manage payouts" on public.provider_payouts
  for all using (
    exists (select 1 from public.profiles profile where profile.id = auth.uid() and profile.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles profile where profile.id = auth.uid() and profile.role = 'admin')
  );

create or replace function public.request_provider_payout()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id uuid;
  v_commission numeric := 5;
  v_earned numeric := 0;
  v_reserved numeric := 0;
  v_available numeric := 0;
  v_payout_id uuid;
begin
  select id into v_provider_id from public.providers where user_id = auth.uid();
  if v_provider_id is null then raise exception 'Provider account not found'; end if;
  perform pg_advisory_xact_lock(hashtext(v_provider_id::text));

  select coalesce(commission_rate, 5) into v_commission from public.platform_settings where id = 1;
  select coalesce(sum(total_amount), 0) * (1 - v_commission / 100)
    into v_earned from public.orders
    where provider_id = v_provider_id and payment_method = 'qrph'
      and payment_status = 'paid' and status = 'delivered';
  select coalesce(sum(amount), 0) into v_reserved from public.provider_payouts
    where provider_id = v_provider_id and status in ('requested', 'processing', 'completed');
  v_available := round(v_earned - v_reserved, 2);
  if v_available <= 0 then raise exception 'No available balance to withdraw'; end if;

  insert into public.provider_payouts(provider_id, amount)
    values (v_provider_id, v_available) returning id into v_payout_id;
  return v_payout_id;
end;
$$;

revoke all on function public.request_provider_payout() from public;
grant execute on function public.request_provider_payout() to authenticated;
