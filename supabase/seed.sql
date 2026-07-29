-- GYM-APP demo seed — the DemoData world (web-demo/data.js) translated to SQL.
-- FOR THE STAGING/DEMO PROJECT ONLY. Never run against a project holding real
-- member data. UUIDs are fixed so re-running is idempotent (on conflict do
-- nothing) and so the web dashboards can address rows via legacy_id during
-- cutover. No credentials of any kind are seeded; auth accounts are linked
-- later by inviting each person and setting members.user_id / staff.user_id.

-- ---------- branch & gates ----------
insert into branches (id, name, capacity) values
  ('dd000000-0000-4000-a000-000000000001', 'City Center', 120)
on conflict do nothing;

insert into gates (id, branch_id, name, direction) values
  ('ee000000-0000-4000-a000-000000000001', 'dd000000-0000-4000-a000-000000000001', 'Main entrance', 'both')
on conflict do nothing;

-- ---------- plans ----------
insert into plans (id, legacy_id, name, duration_days, price_usd, freeze_days_allowed, guests_per_month) values
  ('cc000000-0000-4000-a000-000000000001', 'pln_1mo',  'Monthly',                  30, 95,  14, 1),
  ('cc000000-0000-4000-a000-000000000002', 'pln_6mo',  '6-Month · Performance',   182, 480, 30, 2),
  ('cc000000-0000-4000-a000-000000000003', 'pln_12mo', '12-Month · Performance',  365, 720, 45, 4)
on conflict do nothing;

-- ---------- members (mbr_0001 … mbr_0009) ----------
insert into members (id, legacy_id, full_name, phone, email, home_branch_id, joined_at) values
  ('aa000000-0000-4000-a000-000000000001', 'mbr_0001', 'Samer Khanji', '+961 70 123 456', 'samer@example.com',   'dd000000-0000-4000-a000-000000000001', '2026-03-01'),
  ('aa000000-0000-4000-a000-000000000002', 'mbr_0002', 'Jawad',        '+961 3 234 567',  'jawad@example.com',   'dd000000-0000-4000-a000-000000000001', '2026-05-12'),
  ('aa000000-0000-4000-a000-000000000003', 'mbr_0003', 'Mohamad',      '+961 71 345 678', 'mohamad@example.com', 'dd000000-0000-4000-a000-000000000001', '2026-01-20'),
  ('aa000000-0000-4000-a000-000000000004', 'mbr_0004', 'Pamela',       '+961 76 456 789', 'pamela@example.com',  'dd000000-0000-4000-a000-000000000001', '2026-02-08'),
  ('aa000000-0000-4000-a000-000000000005', 'mbr_0005', 'Lina Saab',    '+961 71 222 333', 'lina@example.com',    'dd000000-0000-4000-a000-000000000001', '2026-06-01'),
  ('aa000000-0000-4000-a000-000000000006', 'mbr_0006', 'Omar Khal',    '+961 76 444 555', 'omar@example.com',    'dd000000-0000-4000-a000-000000000001', '2026-04-18'),
  ('aa000000-0000-4000-a000-000000000007', 'mbr_0007', 'Maya Haddad',  '+961 71 555 777', 'maya@example.com',    'dd000000-0000-4000-a000-000000000001', '2026-06-22'),
  ('aa000000-0000-4000-a000-000000000008', 'mbr_0008', 'Jad Rahal',    '+961 76 888 999', 'jad@example.com',     'dd000000-0000-4000-a000-000000000001', '2026-07-02'),
  ('aa000000-0000-4000-a000-000000000009', 'mbr_0009', 'Hassan M.',    '+961 3 777 111',  'hassan@example.com',  'dd000000-0000-4000-a000-000000000001', '2026-05-30')
on conflict do nothing;

-- ---------- subscriptions (status carries frozen/expired, per V1 model) ----------
insert into subscriptions (id, member_id, plan_id, starts_on, ends_on, status, price_paid_usd) values
  ('ab000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000001', 'cc000000-0000-4000-a000-000000000002', '2026-06-28', '2026-12-28', 'active',  480),
  ('ab000000-0000-4000-a000-000000000002', 'aa000000-0000-4000-a000-000000000002', 'cc000000-0000-4000-a000-000000000001', '2026-08-01', '2026-09-01', 'active',  95),
  ('ab000000-0000-4000-a000-000000000003', 'aa000000-0000-4000-a000-000000000003', 'cc000000-0000-4000-a000-000000000001', '2026-06-01', '2026-07-01', 'expired', 95),
  ('ab000000-0000-4000-a000-000000000004', 'aa000000-0000-4000-a000-000000000004', 'cc000000-0000-4000-a000-000000000002', '2026-07-15', '2027-01-15', 'frozen',  480),
  ('ab000000-0000-4000-a000-000000000005', 'aa000000-0000-4000-a000-000000000005', 'cc000000-0000-4000-a000-000000000001', '2026-10-02', '2026-11-02', 'active',  95),
  ('ab000000-0000-4000-a000-000000000006', 'aa000000-0000-4000-a000-000000000006', 'cc000000-0000-4000-a000-000000000001', '2026-09-20', '2026-10-20', 'active',  95),
  ('ab000000-0000-4000-a000-000000000007', 'aa000000-0000-4000-a000-000000000007', 'cc000000-0000-4000-a000-000000000002', '2026-08-01', '2027-02-01', 'active',  480),
  ('ab000000-0000-4000-a000-000000000008', 'aa000000-0000-4000-a000-000000000008', 'cc000000-0000-4000-a000-000000000001', '2026-08-30', '2026-09-30', 'active',  95),
  ('ab000000-0000-4000-a000-000000000009', 'aa000000-0000-4000-a000-000000000009', 'cc000000-0000-4000-a000-000000000001', '2026-09-05', '2026-10-05', 'active',  95)
on conflict do nothing;

-- ---------- staff (stf_0001 … stf_0007) ----------
insert into staff (id, legacy_id, full_name, role, branch_id) values
  ('bb000000-0000-4000-a000-000000000001', 'stf_0001', 'Lara',      'reception',    'dd000000-0000-4000-a000-000000000001'),
  ('bb000000-0000-4000-a000-000000000002', 'stf_0002', 'Karim H.',  'trainer',      'dd000000-0000-4000-a000-000000000001'),
  ('bb000000-0000-4000-a000-000000000003', 'stf_0003', 'Nour A.',   'cafe',         'dd000000-0000-4000-a000-000000000001'),
  ('bb000000-0000-4000-a000-000000000004', 'stf_0004', 'Rima D.',   'nutritionist', 'dd000000-0000-4000-a000-000000000001'),
  ('bb000000-0000-4000-a000-000000000005', 'stf_0005', 'Suhail M.', 'maintenance',  'dd000000-0000-4000-a000-000000000001'),
  ('bb000000-0000-4000-a000-000000000006', 'stf_0006', 'Tony A.',   'instructor',   'dd000000-0000-4000-a000-000000000001'),
  ('bb000000-0000-4000-a000-000000000007', 'stf_0007', 'Rita S.',   'instructor',   'dd000000-0000-4000-a000-000000000001')
on conflict do nothing;

insert into trainers (id, staff_id, specialties, session_price_usd) values
  ('b1000000-0000-4000-a000-000000000001', 'bb000000-0000-4000-a000-000000000002',
   array['Strength','Rehab'], 30)
on conflict do nothing;

-- pkg_0001: Samer's 10-session package with Karim, 7 used
insert into trainer_packages (id, member_id, trainer_id, total_sessions, used_sessions, price_usd) values
  ('b2000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000001',
   'b1000000-0000-4000-a000-000000000001', 10, 7, 300)
on conflict do nothing;

-- Samer is assigned to Karim; Lina and Omar train with him too (data.js trainerId)
-- (modelled via trainer_packages / bookings in production; noted here for import parity)

-- ---------- classes & today's sessions ----------
insert into classes (id, legacy_id, branch_id, name, instructor_staff_id, capacity) values
  ('a1000000-0000-4000-a000-000000000001', 'cls_0001', 'dd000000-0000-4000-a000-000000000001', 'HIIT Burn', 'bb000000-0000-4000-a000-000000000006', 18),
  ('a1000000-0000-4000-a000-000000000002', 'cls_0002', 'dd000000-0000-4000-a000-000000000001', 'Spin 45',   'bb000000-0000-4000-a000-000000000006', 20),
  ('a1000000-0000-4000-a000-000000000003', 'cls_0003', 'dd000000-0000-4000-a000-000000000001', 'Aqua Fit',  'bb000000-0000-4000-a000-000000000007', 12)
on conflict do nothing;

insert into class_sessions (id, class_id, starts_at, ends_at) values
  ('a2000000-0000-4000-a000-000000000001', 'a1000000-0000-4000-a000-000000000001', current_date + time '19:00', current_date + time '19:45'),
  ('a2000000-0000-4000-a000-000000000002', 'a1000000-0000-4000-a000-000000000002', current_date + time '18:00', current_date + time '18:45'),
  ('a2000000-0000-4000-a000-000000000003', 'a1000000-0000-4000-a000-000000000003', current_date + time '17:30', current_date + time '18:15')
on conflict do nothing;

-- bkg_0001/0002: Lina and Jawad booked into HIIT Burn
insert into class_bookings (id, class_session_id, member_id, status) values
  ('a2100000-0000-4000-a000-000000000001', 'a2000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000005', 'booked'),
  ('a2100000-0000-4000-a000-000000000002', 'a2000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000002', 'booked')
on conflict do nothing;

-- ---------- health facts (hf_0001 … hf_0005, provenance + precedence intact) ----------
insert into health_facts (id, member_id, kind, label, severity, source, recorded_by_kind, recorded_by_id, precedence, note) values
  ('a3000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000001', 'allergy',   'peanuts',                      'high',   'member_declared',    'member', 'aa000000-0000-4000-a000-000000000001', 2, 'Declared in the onboarding health questionnaire.'),
  ('a3000000-0000-4000-a000-000000000002', 'aa000000-0000-4000-a000-000000000001', 'injury',    'Right shoulder impingement',   'medium', 'trainer_assessment', 'staff',  'bb000000-0000-4000-a000-000000000002', 3, 'Avoid overhead / behind-neck pressing at end range; stop on any pinch.'),
  ('a3000000-0000-4000-a000-000000000003', 'aa000000-0000-4000-a000-000000000006', 'injury',    'ACL reconstruction (2025)',    'high',   'physio_clearance',   'staff',  'bb000000-0000-4000-a000-000000000004', 4, 'No deep jumps; leg extensions cleared by physio.'),
  ('a3000000-0000-4000-a000-000000000004', 'aa000000-0000-4000-a000-000000000007', 'allergy',   'milk',                         'high',   'member_declared',    'member', 'aa000000-0000-4000-a000-000000000007', 2, 'Declared at intake.'),
  ('a3000000-0000-4000-a000-000000000005', 'aa000000-0000-4000-a000-000000000007', 'condition', 'Pregnancy — 2nd trimester',    'review', 'member_declared',    'member', 'aa000000-0000-4000-a000-000000000007', 4, 'OB guidance on file; conservative targets, refer anything clinical.')
on conflict do nothing;

-- ---------- assets (ast_0001 …) ----------
insert into assets (id, legacy_id, branch_id, name, category, zone, status, last_inspection, next_inspection) values
  ('ff000000-0000-4000-a000-000000000011', 'ast_0011', 'dd000000-0000-4000-a000-000000000001', 'Treadmill #1',      'Cardio',   'Gym floor · row 1',  'available',     '2026-07-20', '2026-08-20'),
  ('ff000000-0000-4000-a000-000000000001', 'ast_0001', 'dd000000-0000-4000-a000-000000000001', 'Treadmill #3',      'Cardio',   'Gym floor · row 1',  'available',     '2026-07-20', '2026-08-20'),
  ('ff000000-0000-4000-a000-000000000002', 'ast_0002', 'dd000000-0000-4000-a000-000000000001', 'Leg press',         'Strength', 'Strength zone',      'available',     '2026-07-18', '2026-08-18'),
  ('ff000000-0000-4000-a000-000000000003', 'ast_0003', 'dd000000-0000-4000-a000-000000000001', 'Cable station A',   'Strength', 'Centre',             'available',     '2026-07-15', '2026-08-15'),
  ('ff000000-0000-4000-a000-000000000005', 'ast_0005', 'dd000000-0000-4000-a000-000000000001', 'Rowing machine #1', 'Cardio',   'Cardio mezzanine',   'waiting_parts', '2026-07-10', '2026-08-10'),
  ('ff000000-0000-4000-a000-000000000006', 'ast_0006', 'dd000000-0000-4000-a000-000000000001', 'Main gate scanner', 'Access',   'Entrance',           'limited',       '2026-07-25', '2026-08-25'),
  ('ff000000-0000-4000-a000-000000000009', 'ast_0009', 'dd000000-0000-4000-a000-000000000001', 'Pool',              'Aquatics', 'Lower level',        'available',     '2026-07-26', '2026-08-02')
on conflict do nothing;

-- Treadmill #3's suggested alternative is Treadmill #1
update assets set alt_asset_id = 'ff000000-0000-4000-a000-000000000011'
where id = 'ff000000-0000-4000-a000-000000000001' and alt_asset_id is null;

-- ---------- lockers 1–24 ----------
insert into lockers (branch_id, number, zone)
select 'dd000000-0000-4000-a000-000000000001', n, 'main'
from generate_series(1, 24) n
on conflict do nothing;

-- ---------- cafe menu (representative; production menu is managed in-app) ----------
insert into menu_items (id, category, name, price_usd, calories, protein_g, allergens) values
  ('a5000000-0000-4000-a000-000000000001', 'Shakes', 'Whey protein shake',   6.50, 220, 30, array['milk']),
  ('a5000000-0000-4000-a000-000000000002', 'Shakes', 'Peanut power shake',   7.00, 340, 28, array['peanuts','milk']),
  ('a5000000-0000-4000-a000-000000000003', 'Meals',  'Grilled chicken wrap', 9.00, 430, 38, array[]::text[]),
  ('a5000000-0000-4000-a000-000000000004', 'Meals',  'Tuna salad bowl',      8.50, 380, 32, array['fish']),
  ('a5000000-0000-4000-a000-000000000005', 'Drinks', 'Cold brew coffee',     4.00,  15,  1, array[]::text[]),
  ('a5000000-0000-4000-a000-000000000006', 'Drinks', 'Fresh orange juice',   5.00, 120,  2, array[]::text[])
on conflict do nothing;

-- ---------- opening balances (wallet / loyalty from data.js) ----------
insert into wallet_transactions (id, member_id, type, amount_usd, reason) values
  ('ac000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000001', 'adjustment', 68, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000002', 'aa000000-0000-4000-a000-000000000002', 'adjustment', 20, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000003', 'aa000000-0000-4000-a000-000000000003', 'adjustment',  5, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000004', 'aa000000-0000-4000-a000-000000000004', 'adjustment', 42, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000005', 'aa000000-0000-4000-a000-000000000005', 'adjustment', 15, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000006', 'aa000000-0000-4000-a000-000000000006', 'adjustment', 30, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000007', 'aa000000-0000-4000-a000-000000000007', 'adjustment', 55, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000008', 'aa000000-0000-4000-a000-000000000008', 'adjustment', 12, 'Opening balance (demo import)'),
  ('ac000000-0000-4000-a000-000000000009', 'aa000000-0000-4000-a000-000000000009', 'adjustment', 18, 'Opening balance (demo import)')
on conflict do nothing;

insert into loyalty_transactions (id, member_id, type, points, reason) values
  ('ad000000-0000-4000-a000-000000000001', 'aa000000-0000-4000-a000-000000000001', 'adjustment', 340, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000002', 'aa000000-0000-4000-a000-000000000002', 'adjustment',  90, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000003', 'aa000000-0000-4000-a000-000000000003', 'adjustment',  40, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000004', 'aa000000-0000-4000-a000-000000000004', 'adjustment', 210, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000005', 'aa000000-0000-4000-a000-000000000005', 'adjustment',  60, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000006', 'aa000000-0000-4000-a000-000000000006', 'adjustment',  75, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000007', 'aa000000-0000-4000-a000-000000000007', 'adjustment', 130, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000008', 'aa000000-0000-4000-a000-000000000008', 'adjustment',  25, 'Opening balance (demo import)'),
  ('ad000000-0000-4000-a000-000000000009', 'aa000000-0000-4000-a000-000000000009', 'adjustment',  55, 'Opening balance (demo import)')
on conflict do nothing;

-- ---------- CRM leads (led_0001 / led_0002) ----------
insert into leads (id, name, phone, source, stage, owner_staff_id) values
  ('a6000000-0000-4000-a000-000000000001', 'Rami Chidiac', '+961 3 987 654',  'Instagram', 'contacted',      'bb000000-0000-4000-a000-000000000001'),
  ('a6000000-0000-4000-a000-000000000002', 'Nadia F.',     '+961 71 111 222', 'Walk-in',   'tour_scheduled', 'bb000000-0000-4000-a000-000000000001')
on conflict do nothing;
