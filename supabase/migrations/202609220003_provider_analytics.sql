-- Manual/off-system provider sales used only for shop analytics.
create table if not exists public.provider_manual_sales (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  category text not null check (category in ('water','lpg','other')),
  quantity integer not null default 1 check (quantity > 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('cash','gcash','qrph','other')),
  customer_name text,
  notes text,
  sold_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists provider_manual_sales_provider_date_idx on public.provider_manual_sales(provider_id, sold_at desc);
alter table public.provider_manual_sales enable row level security;
drop policy if exists "Providers view manual sales" on public.provider_manual_sales;
create policy "Providers view manual sales" on public.provider_manual_sales for select using (exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()));
drop policy if exists "Providers delete manual sales" on public.provider_manual_sales;
create policy "Providers delete manual sales" on public.provider_manual_sales for delete using (exists(select 1 from public.providers p where p.id=provider_id and p.user_id=auth.uid()));
drop policy if exists "Admins view manual sales" on public.provider_manual_sales;
create policy "Admins view manual sales" on public.provider_manual_sales for select using (public.is_active_admin());

create or replace function public.record_provider_manual_sale(
  p_product_id uuid, p_category text, p_quantity integer, p_total_amount numeric,
  p_payment_method text, p_customer_name text, p_notes text, p_sold_at timestamptz,
  p_reduce_stock boolean default false
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_provider uuid; v_name text; v_category text; v_id uuid;
begin
  select id into v_provider from public.providers where user_id=auth.uid();
  if v_provider is null then raise exception 'Provider account not found'; end if;
  if p_quantity<1 or p_total_amount<0 then raise exception 'Invalid sale quantity or amount'; end if;
  if p_payment_method not in ('cash','gcash','qrph','other') then raise exception 'Invalid payment method'; end if;
  if p_product_id is not null then
    select name,category into v_name,v_category from public.products where id=p_product_id and provider_id=v_provider for update;
    if v_name is null then raise exception 'Product not found'; end if;
    if p_reduce_stock then
      update public.products set stock_quantity=stock_quantity-p_quantity where id=p_product_id and stock_quantity>=p_quantity;
      if not found then raise exception 'Not enough product stock'; end if;
    end if;
  else v_category:=p_category; end if;
  if v_category not in ('water','lpg','other') then v_category:='other'; end if;
  insert into public.provider_manual_sales(provider_id,product_id,product_name,category,quantity,total_amount,payment_method,customer_name,notes,sold_at)
  values(v_provider,p_product_id,v_name,v_category,p_quantity,p_total_amount,p_payment_method,nullif(trim(p_customer_name),''),nullif(trim(p_notes),''),p_sold_at)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.record_provider_manual_sale(uuid,text,integer,numeric,text,text,text,timestamptz,boolean) from public;
grant execute on function public.record_provider_manual_sale(uuid,text,integer,numeric,text,text,text,timestamptz,boolean) to authenticated;
