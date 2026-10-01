-- ============================================================
-- FIX: Create the missing create_booking RPC function
-- Run this SQL in your Supabase SQL Editor:
--   https://supabase.com/dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create (or replace) the booking function
create or replace function public.create_booking(p_resource_id uuid, p_quantity integer)
returns table (booking_id uuid, remaining_quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resource record;
  v_remaining integer;
  v_booking_id uuid;
begin
  -- Must be authenticated
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  -- Validate quantity
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'quantity must be greater than 0';
  end if;

  -- Lock the resource row to prevent race conditions
  select id, hospital_id, type, quantity
  into v_resource
  from public.resources
  where id = p_resource_id
  for update;

  if not found then
    raise exception 'resource not found';
  end if;

  if v_resource.quantity < p_quantity then
    raise exception 'insufficient quantity';
  end if;

  -- Calculate remaining and update resource
  v_remaining := v_resource.quantity - p_quantity;

  update public.resources
  set quantity = v_remaining,
      available = v_remaining > 0
  where id = v_resource.id;

  -- Insert booking with pending status
  insert into public.bookings (patient_id, hospital_id, resource_id, resource_type, quantity, status)
  values (auth.uid(), v_resource.hospital_id, v_resource.id, v_resource.type, p_quantity, 'pending')
  returning id into v_booking_id;

  return query select v_booking_id, v_remaining;
end;
$$;

-- 2. Add RLS policy so any authenticated user can update resources
--    (needed for fallback booking when RPC is unavailable)
--    Drop first in case it already exists, then recreate.
do $$
begin
  -- Try to drop the policy if it exists (ignore errors)
  begin
    drop policy "Resources update for booking" on public.resources;
  exception when undefined_object then
    null;
  end;
end;
$$;

create policy "Resources update for booking" on public.resources
for update
to authenticated
using (true)
with check (true);

-- 3. Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
