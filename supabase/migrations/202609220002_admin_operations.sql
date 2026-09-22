-- Admin permissions, audit trail, refunds, and provider document expiry.
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

create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  permission_role text not null default 'admin' check (permission_role in ('owner','admin','finance','support')),
  active boolean not null default true,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

insert into public.admin_members(user_id, permission_role)
select id, 'owner' from public.profiles where role = 'admin'
on conflict (user_id) do nothing;

create table if not exists public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','processing','completed','rejected','failed')),
  paymongo_refund_id text,
  reference_number text,
  admin_note text,
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);
create unique index if not exists one_open_refund_per_order on public.payment_refunds(order_id)
  where status in ('requested','processing','completed');

alter table public.providers add column if not exists business_permit_expires_at date;
alter table public.providers add column if not exists owner_id_expires_at date;

alter table public.admin_members enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.payment_refunds enable row level security;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p left join public.admin_members m on m.user_id = p.id
    where p.id = auth.uid() and p.role = 'admin' and coalesce(m.active, true)
  );
$$;

drop policy if exists "Admins manage members" on public.admin_members;
create policy "Admins manage members" on public.admin_members for all using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admins view audit logs" on public.admin_audit_logs;
create policy "Admins view audit logs" on public.admin_audit_logs for select using (public.is_active_admin());
drop policy if exists "Admins manage refunds" on public.payment_refunds;
create policy "Admins manage refunds" on public.payment_refunds for all using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "Admins manage providers" on public.providers;
create policy "Admins manage providers" on public.providers for all using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles" on public.profiles for all using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admins manage settings" on public.platform_settings;
create policy "Admins manage settings" on public.platform_settings for all using (public.is_active_admin()) with check (public.is_active_admin());

create or replace function public.capture_admin_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_id text; v_action text;
begin
  if not public.is_active_admin() then return coalesce(new, old); end if;
  v_id := coalesce(new.id::text, old.id::text);
  v_action := tg_table_name || '.' || lower(tg_op);
  insert into public.admin_audit_logs(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), v_action, tg_table_name, v_id, jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new)));
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_providers_admin on public.providers;
create trigger audit_providers_admin after update on public.providers for each row execute function public.capture_admin_audit();
drop trigger if exists audit_profiles_admin on public.profiles;
create trigger audit_profiles_admin after update on public.profiles for each row execute function public.capture_admin_audit();
drop trigger if exists audit_orders_admin on public.orders;
create trigger audit_orders_admin after update on public.orders for each row execute function public.capture_admin_audit();
drop trigger if exists audit_settings_admin on public.platform_settings;
create trigger audit_settings_admin after insert or update on public.platform_settings for each row execute function public.capture_admin_audit();
drop trigger if exists audit_refunds_admin on public.payment_refunds;
create trigger audit_refunds_admin after insert or update on public.payment_refunds for each row execute function public.capture_admin_audit();
drop trigger if exists audit_payouts_admin on public.provider_payouts;
create trigger audit_payouts_admin after update on public.provider_payouts for each row execute function public.capture_admin_audit();
