-- Preserve the purchased product name on the order item so order history does
-- not depend on the current visibility or lifetime of the products row.
alter table public.order_items
  add column if not exists product_name text;

update public.order_items oi
set product_name = p.name
from public.products p
where p.id = oi.product_id
  and (oi.product_name is null or btrim(oi.product_name) = '');

create or replace function public.snapshot_order_item_product_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.product_name is null or btrim(new.product_name) = '' then
    select p.name into new.product_name
    from public.products p
    where p.id = new.product_id;
  end if;

  return new;
end;
$$;

drop trigger if exists order_items_snapshot_product_name on public.order_items;
create trigger order_items_snapshot_product_name
before insert or update of product_id, product_name on public.order_items
for each row execute function public.snapshot_order_item_product_name();

