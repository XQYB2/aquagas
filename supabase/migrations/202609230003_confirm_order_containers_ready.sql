-- Allow a customer to confirm that refill containers are ready without
-- granting broad UPDATE access to the order row.
create or replace function public.confirm_order_containers_ready(p_order_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_confirmed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.orders
  set containers_ready_at = coalesce(containers_ready_at, now()),
      updated_at = now()
  where id = p_order_id
    and customer_id = auth.uid()
    and status = 'awaiting_pickup'
  returning containers_ready_at into v_confirmed_at;

  if v_confirmed_at is null then
    raise exception 'This order cannot be confirmed for pickup';
  end if;

  return v_confirmed_at;
end;
$$;

revoke all on function public.confirm_order_containers_ready(uuid) from public;
grant execute on function public.confirm_order_containers_ready(uuid) to authenticated;

