-- Snapshot the provider's chosen payout destination on each request.
alter table public.provider_payouts
  add column if not exists payout_method text,
  add column if not exists account_name text,
  add column if not exists account_number text,
  add column if not exists bank_name text;

alter table public.provider_payouts
  drop constraint if exists provider_payouts_payout_method_check;
alter table public.provider_payouts
  add constraint provider_payouts_payout_method_check
  check (payout_method is null or payout_method in ('gcash', 'bank'));

drop function if exists public.request_provider_payout();
create function public.request_provider_payout(
  p_payout_method text,
  p_account_name text,
  p_account_number text,
  p_bank_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_provider_id uuid;
  v_commission numeric := 5;
  v_earned numeric := 0;
  v_reserved numeric := 0;
  v_available numeric := 0;
  v_payout_id uuid;
begin
  if p_payout_method not in ('gcash', 'bank') then raise exception 'Choose GCash or bank transfer'; end if;
  if length(trim(coalesce(p_account_name, ''))) < 2 then raise exception 'Account name is required'; end if;
  if length(regexp_replace(coalesce(p_account_number, ''), '[^0-9]', '', 'g')) < 8 then raise exception 'Enter a valid account number'; end if;
  if p_payout_method = 'bank' and length(trim(coalesce(p_bank_name, ''))) < 2 then raise exception 'Bank name is required'; end if;

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

  insert into public.provider_payouts(provider_id, amount, payout_method, account_name, account_number, bank_name)
    values (v_provider_id, v_available, p_payout_method, trim(p_account_name), trim(p_account_number), nullif(trim(coalesce(p_bank_name, '')), ''))
    returning id into v_payout_id;
  return v_payout_id;
end;
$$;

revoke all on function public.request_provider_payout(text, text, text, text) from public;
grant execute on function public.request_provider_payout(text, text, text, text) to authenticated;

