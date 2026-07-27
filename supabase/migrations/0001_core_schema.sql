-- GYM-APP core schema (V1)
-- Conventions: uuid PKs, created_at/updated_at audit columns, soft delete via deleted_at
-- where rows are user-facing records, RLS on every table.

create extension if not exists pg_trgm;

-- ---------- helpers ----------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- enums ----------

create type staff_role as enum
  ('owner','manager','reception','trainer','nutritionist','cafe','accountant');

create type member_status as enum ('active','blocked');

create type subscription_status as enum ('active','frozen','expired','cancelled');

create type session_status as enum ('inside','completed');

create type access_method as enum ('qr','nfc','ble','manual');

create type access_event_type as enum
  ('entry_granted','entry_denied','exit_granted','exit_denied',
   'manual_entry','manual_exit');

create type deny_reason as enum
  ('no_subscription','subscription_expired','subscription_frozen','account_blocked',
   'unpaid_balance','wrong_branch','device_mismatch','already_inside','not_inside',
   'invalid_token','token_expired','token_replayed');

create type booking_status as enum
  ('requested','accepted','rejected','cancelled',
   'completed_pending_member','completed','no_show');

create type class_booking_status as enum
  ('booked','waitlist','cancelled','attended','no_show');

-- ---------- core: branches & gates ----------

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  -- geofence for checkout reminders (never authoritative for entry/exit)
  lat double precision,
  lng double precision,
  geofence_radius_m integer default 150,
  capacity integer,            -- max people for occupancy meter
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,                       -- "Main entrance", "Side exit"
  direction text not null check (direction in ('entry','exit','both')),
  -- shared secret for the gate device to authenticate against verify-entry
  api_key_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- members & devices ----------

create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  phone text unique,
  email text unique,
  photo_url text,
  status member_status not null default 'active',
  blocked_reason text,
  home_branch_id uuid references branches(id),
  balance_due_usd numeric(10,2) not null default 0,  -- unpaid amounts block entry
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index members_name_trgm on members using gin (full_name gin_trgm_ops);
create index members_phone_idx on members (phone);

create table member_devices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  device_id text not null,          -- stable install/device identifier
  platform text check (platform in ('ios','android')),
  model text,
  push_token text,
  is_active boolean not null default true,
  registered_at timestamptz not null default now(),
  replaced_at timestamptz,
  replaced_by_staff uuid,           -- set when reception swaps a device
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- exactly one active device per member
create unique index one_active_device_per_member
  on member_devices (member_id) where is_active;

-- ---------- plans & subscriptions ----------

create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- "Monthly", "Annual", "Off-peak"
  duration_days integer not null,
  price_usd numeric(10,2) not null,
  freeze_days_allowed integer not null default 0,
  off_peak_only boolean not null default false,
  all_branches boolean not null default true,
  branch_id uuid references branches(id),   -- set when plan is branch-specific
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  plan_id uuid not null references plans(id),
  starts_on date not null,
  ends_on date not null,                    -- extended when freezes apply
  status subscription_status not null default 'active',
  price_paid_usd numeric(10,2) not null,
  payment_method text not null default 'cash' check (payment_method in ('cash','card','transfer','other')),
  recorded_by_staff uuid,                   -- reception who took payment
  freeze_days_used integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_member_idx on subscriptions (member_id, status);

create table subscription_freezes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id),
  starts_on date not null,
  ends_on date not null,
  days integer not null,
  requested_by text not null default 'member' check (requested_by in ('member','staff')),
  staff_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- access control: sessions, events, tokens ----------

create table gym_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  branch_id uuid not null references branches(id),
  subscription_id uuid references subscriptions(id),
  device_id text,
  entry_gate_id uuid references gates(id),
  exit_gate_id uuid references gates(id),
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  entry_method access_method not null,
  exit_method access_method,
  status session_status not null default 'inside',
  duration_min integer generated always as
    (case when exited_at is null then null
     else greatest(0, floor(extract(epoch from (exited_at - entered_at)) / 60))::int end) stored,
  auto_closed boolean not null default false,   -- closed by nightly sweep, not a real exit
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- anti-passback: one open session per member
create unique index one_open_session_per_member
  on gym_sessions (member_id) where status = 'inside';
create index gym_sessions_branch_open on gym_sessions (branch_id) where status = 'inside';
create index gym_sessions_member_history on gym_sessions (member_id, entered_at desc);

create table access_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),     -- null when token was unresolvable
  branch_id uuid references branches(id),
  gate_id uuid references gates(id),
  event_type access_event_type not null,
  method access_method,
  deny_reason deny_reason,
  device_id text,
  token_jti uuid,
  staff_id uuid,                             -- who approved a manual override
  override_reason text,                      -- required for manual events
  details jsonb,
  created_at timestamptz not null default now()
);
create index access_events_member_idx on access_events (member_id, created_at desc);
create index access_events_branch_idx on access_events (branch_id, created_at desc);

-- short-lived entry tokens; replay protection via used_at
create table entry_tokens (
  jti uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  device_id text not null,
  branch_id uuid not null references branches(id),
  purpose text not null default 'entry' check (purpose in ('entry','exit')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index entry_tokens_expiry on entry_tokens (expires_at);

-- ---------- staff & trainers ----------

create table staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  role staff_role not null,
  branch_id uuid references branches(id),
  phone text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table trainers (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null unique references staff(id),
  bio text,
  specialties text[] not null default '{}',
  languages text[] not null default '{}',
  session_price_usd numeric(10,2),
  rating numeric(3,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trainer_availability (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id),
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create table trainer_packages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  trainer_id uuid not null references trainers(id),
  total_sessions integer not null,
  used_sessions integer not null default 0,
  price_usd numeric(10,2) not null,
  expires_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trainer_bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  trainer_id uuid not null references trainers(id),
  package_id uuid references trainer_packages(id),
  gym_session_id uuid references gym_sessions(id),   -- linked visit, when known
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status booking_status not null default 'requested',
  member_confirmed_at timestamptz,   -- member must confirm completion
  trainer_notes text,                -- private to trainer + management
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trainer_bookings_trainer_idx on trainer_bookings (trainer_id, starts_at);
create index trainer_bookings_member_idx on trainer_bookings (member_id, starts_at desc);

-- ---------- classes ----------

create table classes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  name text not null,
  description text,
  instructor_staff_id uuid references staff(id),
  capacity integer not null default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity_override integer,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
create index class_sessions_time_idx on class_sessions (starts_at);

create table class_bookings (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id),
  member_id uuid not null references members(id),
  status class_booking_status not null default 'booked',
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_session_id, member_id)
);

-- ---------- nutrition & cafe ----------

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),   -- null = all branches
  category text not null,                   -- "Meals","Drinks","Shakes","Supplements"
  name text not null,
  description text,
  price_usd numeric(10,2) not null,
  calories integer,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  allergens text[] not null default '{}',
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  assigned_by_staff uuid references staff(id),
  goal text not null,                        -- "weight_loss","muscle_gain",...
  title text not null,
  notes text,
  is_professional boolean not null default false,  -- true when set by licensed nutritionist
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references meal_plans(id),
  day_of_week integer check (day_of_week between 0 and 6),  -- null = every day
  meal_name text not null,                   -- "Breakfast","Post-workout"
  description text not null,
  calories integer,
  protein_g numeric(6,1),
  carbs_g numeric(6,1),
  fat_g numeric(6,1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- notifications & audit ----------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  type text not null,        -- "booking","renewal","checkout_reminder","announcement"
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_member_idx on notifications (member_id, created_at desc);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------

do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;
