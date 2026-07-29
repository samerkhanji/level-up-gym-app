-- GYM-APP departments schema (V2)
-- Everything the web-demo grew after V1: wallet & loyalty ledgers, cafe orders,
-- health facts with provenance, incidents/SOS, maintenance assets & work
-- orders, pool/recovery bookings, guest passes, lockers, support tickets,
-- payments ledger, leads, invoices, vehicles/family, and the app_events stream
-- that replaces the browser-only GymBus.
-- Same conventions as 0001: uuid PKs, created_at/updated_at, RLS added in 0005,
-- money/state transitions go through RPCs (0006) or Edge Functions.

create extension if not exists btree_gist;  -- lane-booking overlap exclusion

-- ---------- enum extensions ----------
-- Roles the demo added after V1. Safe on PG 12+ inside a migration because no
-- DML in this file uses the new values.
alter type staff_role add value if not exists 'instructor';
alter type staff_role add value if not exists 'maintenance';
alter type member_status add value if not exists 'suspended';
-- denial reasons the demo engine produces that V1 could not record
alter type deny_reason add value if not exists 'at_capacity';
alter type deny_reason add value if not exists 'account_suspended';

create type wallet_tx_type as enum ('topup','debit','refund','adjustment');
create type loyalty_tx_type as enum ('earn','redeem','adjustment');
create type order_status as enum
  ('placed','awaiting_payment','accepted','preparing','ready','collected','rejected','cancelled');
create type substitution_status as enum ('offered','accepted','declined');
create type health_fact_kind as enum ('allergy','injury','condition');
create type health_fact_source as enum
  ('member_declared','trainer_assessment','nutritionist_assessment','physio_clearance','medical_document');
create type incident_status as enum ('active','acknowledged','closed');
create type asset_status as enum ('available','limited','waiting_parts','out_of_service');
create type work_order_status as enum
  ('reported','triaged','in_progress','waiting_parts','repaired','verified','closed');
create type work_order_severity as enum ('normal','high','safety');
create type amenity_kind as enum ('pool_lane','recovery');
create type amenity_booking_status as enum ('booked','cancelled','completed','no_show');
create type guest_pass_status as enum ('issued','used','expired','cancelled');
create type ticket_kind as enum
  ('help','cancellation','upgrade','renewal','deletion_request','locker_open',
   'guest_pass','room_change','cover_request','class_proposal','other');
create type ticket_status as enum ('open','in_progress','resolved','rejected');
create type payment_status as enum ('paid','refunded','void');
create type actor_kind as enum ('member','staff','system');

-- ---------- import mapping ----------
-- The demo engine and the Google-Sheet era keyed everything by short text ids
-- (mbr_0001, stf_0002, ast_0001…). legacy_id lets the importer and the web
-- dashboards address rows by those ids during the cutover, then can be dropped.
alter table members  add column if not exists legacy_id text unique;
alter table staff    add column if not exists legacy_id text unique;
alter table plans    add column if not exists legacy_id text unique;
alter table classes  add column if not exists legacy_id text unique;

-- V1 plans lacked the guest quota the demo enforces on guest passes.
alter table plans add column if not exists guests_per_month integer not null default 1;

-- Small fields the demo persists that V1 had no home for.
alter table plans add column if not exists tier text;                 -- "Access","Performance"
alter table subscriptions add column if not exists auto_renew boolean not null default false;
alter table branches add column if not exists opens_at time;
alter table branches add column if not exists closes_at time;
alter table members add column if not exists default_trainer_id uuid references trainers(id);
alter table menu_items add constraint menu_price_nonneg check (price_usd >= 0);

-- Rooms existed in the demo engine (Studio B, Functional Zone, Pool) but not V1.
create table rooms (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  name text not null,
  capacity integer,
  created_at timestamptz not null default now()
);
alter table class_sessions add column if not exists room_id uuid references rooms(id);

-- ---------- payments ledger (generic; subscriptions keep their own price) ----------

create table payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id),
  amount_usd numeric(10,2) not null check (amount_usd >= 0),
  method text not null check (method in ('cash','card','wallet','transfer','other')),
  what text not null,                       -- "Monthly renewal", "PT package · 10"
  status payment_status not null default 'paid',
  refund_of uuid references payments(id),   -- set on refund rows
  staff_id uuid references staff(id),       -- who took it at the desk
  external_ref text,                        -- gateway reference when online
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_member_idx on payments (member_id, created_at desc);
create index payments_day_idx on payments (created_at desc);

-- ---------- wallet: append-only ledger, balance is the sum ----------

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  type wallet_tx_type not null,
  -- signed: topup/refund positive, debit negative; enforced per type
  amount_usd numeric(10,2) not null,
  reason text not null,
  payment_id uuid references payments(id),  -- the cash/card top-up behind a credit
  order_id uuid,                            -- FK added after cafe_orders exists
  staff_id uuid references staff(id),
  created_at timestamptz not null default now(),
  constraint wallet_sign check (
    (type in ('topup','refund') and amount_usd > 0)
    or (type = 'debit' and amount_usd < 0)
    or (type = 'adjustment')
  )
);
create index wallet_member_idx on wallet_transactions (member_id, created_at desc);

-- ---------- loyalty points: same ledger pattern ----------

create table loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  type loyalty_tx_type not null,
  points integer not null,
  reason text not null,                     -- "visit", "challenge", "redeem: shake"
  created_at timestamptz not null default now(),
  constraint loyalty_sign check (
    (type = 'earn' and points > 0)
    or (type = 'redeem' and points < 0)
    or (type = 'adjustment')
  )
);
create index loyalty_member_idx on loyalty_transactions (member_id, created_at desc);

-- ---------- cafe orders ----------

create table cafe_orders (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  status order_status not null default 'placed',
  -- totals computed server-side in place_cafe_order from menu_items prices
  total_usd numeric(10,2) not null check (total_usd >= 0),
  payment_method text not null check (payment_method in ('wallet','cash','card')),
  payment_id uuid references payments(id),
  pickup_code text,                          -- issued when status hits 'ready'
  substitution substitution_status,          -- null = no offer in play
  substitution_note text,                    -- what the cafe proposed and why
  rejected_reason text,
  handled_by_staff uuid references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cafe_orders_member_idx on cafe_orders (member_id, created_at desc);
create index cafe_orders_open_idx on cafe_orders (status)
  where status in ('placed','awaiting_payment','accepted','preparing','ready');

create table cafe_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references cafe_orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  name_snapshot text not null,               -- name/price frozen at order time
  price_snapshot_usd numeric(10,2) not null,
  qty integer not null default 1 check (qty > 0),
  notes text,
  created_at timestamptz not null default now()
);
create index cafe_order_items_order_idx on cafe_order_items (order_id);

alter table wallet_transactions
  add constraint wallet_order_fk foreign key (order_id) references cafe_orders(id);

-- ---------- health facts: one source of truth, provenance + precedence ----------
-- Mirrors DemoData.HealthService: each fact carries who recorded it, from
-- where, and a precedence rank (clinical > trainer > member-declared) so a
-- conflict has a defined winner. Role-scoped visibility lives in
-- health_facts_for() (0006) — matching HealthService.visibleTo — because RLS
-- cannot mask a single column (reception sees the flag but not the note).

create table health_facts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  kind health_fact_kind not null,
  label text not null,
  severity text not null default 'medium' check (severity in ('low','medium','high','review')),
  source health_fact_source not null,
  recorded_by_kind actor_kind not null,
  recorded_by_id uuid,                       -- members.id or staff.id per kind
  precedence integer not null default 2 check (precedence between 1 and 5),
  note text,
  retracted_at timestamptz,                  -- facts are never deleted, only retracted
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index health_facts_member_idx on health_facts (member_id) where retracted_at is null;

-- ---------- incidents & SOS ----------

create table incidents (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'sos' check (kind in ('sos','injury','altercation','facility','other')),
  member_id uuid references members(id),
  type text,                                 -- "Injury — needs first aid"
  zone text,                                 -- "Free-weights area"
  status incident_status not null default 'active',
  acknowledged_by uuid references staff(id),
  acknowledged_at timestamptz,
  closed_at timestamptz,
  report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- an incident cannot close without a real report (DemoData rule, F-SAFE)
  constraint incident_close_requires_report
    check (status <> 'closed' or length(trim(coalesce(report, ''))) >= 5)
);
create index incidents_open_idx on incidents (status) where status <> 'closed';

create table incident_actions (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references incidents(id) on delete cascade,
  staff_id uuid references staff(id),
  action text not null,                      -- "acknowledged", "first aid given"
  created_at timestamptz not null default now()
);
create index incident_actions_idx on incident_actions (incident_id, created_at);

-- ---------- maintenance: assets & work orders ----------

create table assets (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  branch_id uuid references branches(id),
  name text not null,
  category text not null,                    -- "Cardio","Strength","Access","Aquatics"
  zone text,
  status asset_status not null default 'available',
  alt_asset_id uuid references assets(id),   -- suggested alternative when down
  last_inspection date,
  next_inspection date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index assets_status_idx on assets (status) where deleted_at is null;

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id),
  problem text not null,
  severity work_order_severity not null default 'normal',
  status work_order_status not null default 'reported',
  reporter_kind actor_kind not null default 'member',
  reporter_id uuid,                          -- members.id or staff.id
  assignee_staff_id uuid references staff(id),
  verified_by_staff uuid references staff(id),  -- return-to-service sign-off
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- verification must be a second pair of eyes (demo checklist rule)
  constraint verify_not_self check (
    verified_by_staff is null
    or assignee_staff_id is null
    or verified_by_staff <> assignee_staff_id
  )
);
create index work_orders_open_idx on work_orders (status) where status <> 'closed';
create index work_orders_asset_idx on work_orders (asset_id, created_at desc);

create table work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  status work_order_status,
  note text,
  staff_id uuid references staff(id),
  created_at timestamptz not null default now()
);
create index wo_events_idx on work_order_events (work_order_id, created_at);

-- ---------- pool lanes & recovery ----------
-- The exclusion constraint is the anti-double-booking rule the demo could
-- never actually enforce: no two booked slots may overlap on the same lane.

create table amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  kind amenity_kind not null,
  lane_number integer,                       -- pool_lane only
  service text,                              -- recovery only: "Ice bath", "Massage gun"
  price_usd numeric(10,2),                   -- null = included in membership
  payment_id uuid references payments(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status amenity_booking_status not null default 'booked',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NULL must not slip through: CHECK treats NULL as pass, and a NULL lane
  -- would also never collide in the exclusion constraint below
  constraint lane_required check (kind <> 'pool_lane'
    or (lane_number is not null and lane_number between 1 and 6)),
  constraint sane_slot check (ends_at > starts_at),
  constraint no_lane_overlap exclude using gist (
    lane_number with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (kind = 'pool_lane' and status = 'booked')
);
create index amenity_member_idx on amenity_bookings (member_id, starts_at desc);

-- ---------- guest passes ----------

create table guest_passes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  code text not null unique,                 -- "GST-…", server-generated
  guest_name text not null,
  guest_phone text,
  status guest_pass_status not null default 'issued',
  expires_at timestamptz not null,
  used_at timestamptz,
  checked_in_by uuid references staff(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guest_passes_member_idx on guest_passes (member_id, created_at desc);

-- ---------- lockers ----------

create table lockers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id),
  number integer not null,
  zone text not null default 'main',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (branch_id, zone, number)
);

create table locker_assignments (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid not null references lockers(id),
  member_id uuid not null references members(id),
  gym_session_id uuid references gym_sessions(id),
  assigned_at timestamptz not null default now(),
  released_at timestamptz,
  locked_at timestamptz,                     -- app-driven lock state; null = open
  opened_by_staff uuid references staff(id)  -- manual open at the desk, audited
);
-- a locker holds one member at a time; a member holds one locker at a time
create unique index one_holder_per_locker on locker_assignments (locker_id) where released_at is null;
create unique index one_locker_per_member on locker_assignments (member_id) where released_at is null;

-- ---------- support tickets ----------

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  kind ticket_kind not null,
  member_id uuid references members(id),
  raised_by_kind actor_kind not null default 'member',
  raised_by_id uuid,
  subject text not null,
  body text,
  status ticket_status not null default 'open',
  assigned_staff uuid references staff(id),
  resolved_at timestamptz,
  satisfaction_rating integer check (satisfaction_rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tickets_open_idx on support_tickets (status, created_at desc)
  where status in ('open','in_progress');
create index tickets_member_idx on support_tickets (member_id, created_at desc);

create table ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  status ticket_status,
  note text,
  staff_id uuid references staff(id),
  created_at timestamptz not null default now()
);
create index ticket_events_idx on ticket_events (ticket_id, created_at);

-- ---------- CRM leads ----------

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  source text,                               -- "Instagram", "Walk-in"
  stage text not null default 'new' check
    (stage in ('new','contacted','tour_scheduled','trial','joined','lost')),
  owner_staff_id uuid references staff(id),
  member_id uuid references members(id),     -- set when the lead converts
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- invoices ----------

create table invoices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  number text not null unique,               -- "INV-2026-0001"
  description text not null,
  amount_usd numeric(10,2) not null check (amount_usd >= 0),
  due_on date,
  status text not null default 'due' check (status in ('due','paid','void')),
  payment_id uuid references payments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_member_idx on invoices (member_id, created_at desc);

-- ---------- vehicles & family ----------

create table member_vehicles (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  plate text not null,
  label text,                                -- "Black RAV4"
  created_at timestamptz not null default now(),
  unique (member_id, plate)
);

create table family_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id),
  related_member_id uuid references members(id),  -- null for a non-member relative
  related_name text,                         -- free-text relative (e.g. Kids club child)
  relation text not null,                    -- "spouse","child","parent"
  created_at timestamptz not null default now(),
  unique (member_id, related_member_id),
  constraint not_self check (member_id is distinct from related_member_id),
  constraint someone_named check (related_member_id is not null or related_name is not null)
);

-- ---------- app_events: the server-side GymBus ----------
-- Append-only stream the dashboards subscribe to over Supabase Realtime,
-- replacing BroadcastChannel + the 60-event localStorage log. Rows are written
-- by RPCs/Edge Functions (service or security-definer), never raw by clients.
-- The idempotency ledger in bus.js becomes unnecessary: the domain tables are
-- authoritative, events are notifications only.

create table app_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,                        -- "gate-entry","sos","cafe-order",…
  actor_kind actor_kind not null default 'system',
  actor_id uuid,
  subject_member_id uuid references members(id),  -- null = broadcast
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index app_events_recent_idx on app_events (created_at desc);
create index app_events_member_idx on app_events (subject_member_id, created_at desc);

-- Realtime: publish the stream (publication exists on Supabase projects).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and tablename = 'app_events') then
    execute 'alter publication supabase_realtime add table app_events';
  end if;
end $$;

-- ---------- updated_at triggers for the new tables ----------

do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join pg_tables p on p.tablename = c.table_name and p.schemaname = 'public'
    where c.table_schema = 'public' and c.column_name = 'updated_at'
      and not exists (
        select 1 from pg_trigger g
        where g.tgname = c.table_name || '_set_updated_at')
  loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;
