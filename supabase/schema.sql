-- Supabase schema for Smart Hospital Resource Finder
-- Run inside the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- Core user profiles
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'hospital')),
  email text,
  full_name text,
  phone text,
  city text,
  hospital_id uuid,
  favorite_hospital_ids uuid[] default array[]::uuid[],
  created_at timestamptz not null default now()
);

-- Hospitals
create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  license_number text,
  email text,
  phone text,
  address text,
  city text,
  emergency_contact text,
  hospital_type text,
  created_at timestamptz not null default now()
);

alter table public.users
  add constraint users_hospital_id_fkey
  foreign key (hospital_id) references public.hospitals (id) on delete set null;

-- Shared resources
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  type text not null check (type in ('blood', 'doctor', 'medicine', 'icu_bed', 'oxygen', 'ventilator')),
  name text not null,
  quantity integer not null default 0,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Specialized inventory tables
create table if not exists public.blood_stock (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  blood_group text not null,
  units integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  name text not null,
  quantity integer not null default 0,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  name text not null,
  quantity integer not null default 0,
  available boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Bookings
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  resource_type text not null check (resource_type in ('blood', 'doctor', 'medicine', 'icu_bed', 'oxygen', 'ventilator')),
  quantity integer not null check (quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

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

-- Timestamp trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_resources_updated_at
before update on public.resources
for each row execute function public.set_updated_at();

create trigger set_blood_stock_updated_at
before update on public.blood_stock
for each row execute function public.set_updated_at();

create trigger set_equipment_updated_at
before update on public.equipment
for each row execute function public.set_updated_at();

create trigger set_medicines_updated_at
before update on public.medicines
for each row execute function public.set_updated_at();

-- Profile creation from auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, role, full_name, phone, city)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'user'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS policies
alter table public.users enable row level security;
alter table public.hospitals enable row level security;
alter table public.resources enable row level security;
alter table public.blood_stock enable row level security;
alter table public.equipment enable row level security;
alter table public.medicines enable row level security;
alter table public.bookings enable row level security;

-- Users
create policy "Users can view own profile" on public.users
for select
using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
for insert
with check (auth.uid() = id);

create policy "Users can update own profile" on public.users
for update
using (auth.uid() = id);

-- Hospitals
create policy "Hospitals can read" on public.hospitals
for select
to authenticated
using (true);

create policy "Hospitals can insert" on public.hospitals
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Hospitals can update" on public.hospitals
for update
to authenticated
using (auth.uid() = user_id);

-- Resources
create policy "Resources read" on public.resources
for select
to authenticated
using (true);

create policy "Resources write by hospital" on public.resources
for insert
to authenticated
with check (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Resources update by hospital" on public.resources
for update
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

-- Allow any authenticated user to update resource quantity (for booking stock reduction)
create policy "Resources update for booking" on public.resources
for update
to authenticated
using (true)
with check (true);

create policy "Resources delete by hospital" on public.resources
for delete
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

-- Inventory tables follow same pattern
create policy "Blood stock read" on public.blood_stock
for select
to authenticated
using (true);

create policy "Blood stock write" on public.blood_stock
for insert
to authenticated
with check (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Blood stock update" on public.blood_stock
for update
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Blood stock delete" on public.blood_stock
for delete
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Equipment read" on public.equipment
for select
to authenticated
using (true);

create policy "Equipment write" on public.equipment
for insert
to authenticated
with check (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Equipment update" on public.equipment
for update
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Equipment delete" on public.equipment
for delete
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Medicines read" on public.medicines
for select
to authenticated
using (true);

create policy "Medicines write" on public.medicines
for insert
to authenticated
with check (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Medicines update" on public.medicines
for update
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Medicines delete" on public.medicines
for delete
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

-- Bookings
create policy "Bookings read" on public.bookings
for select
to authenticated
using (
  patient_id = auth.uid()
  or exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);

create policy "Bookings insert" on public.bookings
for insert
to authenticated
with check (
  patient_id = auth.uid()
  and exists (
    select 1
    from public.resources
    where public.resources.id = resource_id
      and public.resources.hospital_id = hospital_id
      and public.resources.type = resource_type
  )
);

create policy "Bookings update by hospital" on public.bookings
for update
to authenticated
using (
  exists (
    select 1 from public.hospitals
    where public.hospitals.id = hospital_id
    and public.hospitals.user_id = auth.uid()
  )
);
