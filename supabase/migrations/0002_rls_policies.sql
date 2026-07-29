-- GYM-APP Row-Level Security (V1)
-- Model: members read their own data; staff access is role-gated; writes that
-- involve money, access control, or anti-passback go through Edge Functions
-- using the service role (which bypasses RLS by design).

-- ---------- helpers ----------

create or replace function current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from members where user_id = auth.uid() and deleted_at is null
$$;

create or replace function current_staff_role()
returns staff_role language sql stable security definer set search_path = public as $$
  select role from staff where user_id = auth.uid() and is_active and deleted_at is null
$$;

create or replace function is_staff()
returns boolean language sql stable as $$
  select current_staff_role() is not null
$$;

-- coalesce matters: for a non-staff caller `current_staff_role() = any(...)`
-- is NULL, which fails closed inside RLS but fails OPEN in any negated
-- procedural check (`if not has_role(...)`). This must be a true predicate.
create or replace function has_role(roles staff_role[])
returns boolean language sql stable as $$
  select coalesce(current_staff_role() = any (roles), false)
$$;

-- ---------- enable RLS everywhere ----------

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------- branches / gates / plans / menu / classes: readable catalog ----------

create policy "branches readable by authenticated"
  on branches for select to authenticated using (true);
create policy "branches managed by managers"
  on branches for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

create policy "gates readable by staff"
  on gates for select to authenticated using (is_staff());
create policy "gates managed by managers"
  on gates for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

create policy "plans readable by authenticated"
  on plans for select to authenticated using (true);
create policy "plans managed by managers"
  on plans for all to authenticated
  using (has_role(array['owner','manager','accountant']::staff_role[]))
  with check (has_role(array['owner','manager','accountant']::staff_role[]));

create policy "menu readable by authenticated"
  on menu_items for select to authenticated using (true);
create policy "menu managed by cafe and managers"
  on menu_items for all to authenticated
  using (has_role(array['owner','manager','cafe']::staff_role[]))
  with check (has_role(array['owner','manager','cafe']::staff_role[]));

create policy "classes readable by authenticated"
  on classes for select to authenticated using (true);
create policy "classes managed by managers"
  on classes for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

create policy "class sessions readable by authenticated"
  on class_sessions for select to authenticated using (true);
create policy "class sessions managed by managers"
  on class_sessions for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

-- ---------- members ----------

create policy "member reads own profile"
  on members for select to authenticated
  using (user_id = auth.uid() or is_staff());
-- self-registration: a fresh account may create exactly its own profile
create policy "member creates own profile"
  on members for insert to authenticated
  with check (user_id = auth.uid());
create policy "reception manages members"
  on members for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

create policy "member reads own devices"
  on member_devices for select to authenticated
  using (member_id = current_member_id() or is_staff());
-- self-registration: bind the first device (unique index blocks a second one)
create policy "member registers own device"
  on member_devices for insert to authenticated
  with check (member_id = current_member_id());
create policy "reception manages devices"
  on member_devices for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- subscriptions ----------

create policy "member reads own subscriptions"
  on subscriptions for select to authenticated
  using (member_id = current_member_id() or is_staff());
create policy "reception manages subscriptions"
  on subscriptions for all to authenticated
  using (has_role(array['owner','manager','reception','accountant']::staff_role[]))
  with check (has_role(array['owner','manager','reception','accountant']::staff_role[]));

create policy "member reads own freezes"
  on subscription_freezes for select to authenticated
  using (exists (select 1 from subscriptions s
                 where s.id = subscription_id
                   and (s.member_id = current_member_id() or is_staff())));
create policy "reception manages freezes"
  on subscription_freezes for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- access control ----------
-- gym_sessions / access_events are written by Edge Functions (service role).
-- Clients only read.

create policy "member reads own gym sessions"
  on gym_sessions for select to authenticated
  using (member_id = current_member_id() or is_staff());

create policy "member reads own access events"
  on access_events for select to authenticated
  using (member_id = current_member_id() or is_staff());

-- entry_tokens: service-role only; no client policies at all.

-- ---------- staff & trainers ----------

create policy "staff read staff"
  on staff for select to authenticated
  using (is_staff() or user_id = auth.uid());
create policy "managers manage staff"
  on staff for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

create policy "trainers readable by authenticated"
  on trainers for select to authenticated using (true);
create policy "trainer updates own profile"
  on trainers for update to authenticated
  using (exists (select 1 from staff s where s.id = staff_id and s.user_id = auth.uid()))
  with check (exists (select 1 from staff s where s.id = staff_id and s.user_id = auth.uid()));
create policy "managers manage trainers"
  on trainers for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

create policy "availability readable by authenticated"
  on trainer_availability for select to authenticated using (true);
create policy "trainer manages own availability"
  on trainer_availability for all to authenticated
  using (exists (select 1 from trainers t join staff s on s.id = t.staff_id
                 where t.id = trainer_id and s.user_id = auth.uid())
         or has_role(array['owner','manager']::staff_role[]))
  with check (exists (select 1 from trainers t join staff s on s.id = t.staff_id
                      where t.id = trainer_id and s.user_id = auth.uid())
              or has_role(array['owner','manager']::staff_role[]));

create policy "member reads own packages"
  on trainer_packages for select to authenticated
  using (member_id = current_member_id() or is_staff());
create policy "reception manages packages"
  on trainer_packages for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

create policy "member reads own trainer bookings"
  on trainer_bookings for select to authenticated
  using (member_id = current_member_id()
         or exists (select 1 from trainers t join staff s on s.id = t.staff_id
                    where t.id = trainer_id and s.user_id = auth.uid())
         or has_role(array['owner','manager','reception']::staff_role[]));
create policy "member creates booking request"
  on trainer_bookings for insert to authenticated
  with check (member_id = current_member_id() and status = 'requested');
create policy "member updates own booking"
  on trainer_bookings for update to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());
-- NOTE: trainer_notes is declared private to trainer+management; RLS cannot
-- scope columns, so the member client must never write it and a belt-and-
-- braces column guard belongs in a trigger when member self-service update
-- goes live.
create policy "trainer updates own bookings"
  on trainer_bookings for update to authenticated
  using (exists (select 1 from trainers t join staff s on s.id = t.staff_id
                 where t.id = trainer_id and s.user_id = auth.uid())
         or has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- class bookings ----------

create policy "member reads own class bookings"
  on class_bookings for select to authenticated
  using (member_id = current_member_id() or is_staff());
create policy "member books classes"
  on class_bookings for insert to authenticated
  with check (member_id = current_member_id());
create policy "member updates own class booking"
  on class_bookings for update to authenticated
  using (member_id = current_member_id());
create policy "staff manage class bookings"
  on class_bookings for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- nutrition ----------

create policy "member reads own meal plans"
  on meal_plans for select to authenticated
  using (member_id = current_member_id() or is_staff());
create policy "nutritionist manages meal plans"
  on meal_plans for all to authenticated
  using (has_role(array['owner','manager','nutritionist']::staff_role[]))
  with check (has_role(array['owner','manager','nutritionist']::staff_role[]));

create policy "member reads own meal plan items"
  on meal_plan_items for select to authenticated
  using (exists (select 1 from meal_plans p
                 where p.id = meal_plan_id
                   and (p.member_id = current_member_id() or is_staff())));
create policy "nutritionist manages meal plan items"
  on meal_plan_items for all to authenticated
  using (has_role(array['owner','manager','nutritionist']::staff_role[]))
  with check (has_role(array['owner','manager','nutritionist']::staff_role[]));

-- ---------- notifications & audit ----------

create policy "member reads own notifications"
  on notifications for select to authenticated
  using (member_id = current_member_id());
create policy "member marks notifications read"
  on notifications for update to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());

create policy "managers read audit log"
  on audit_log for select to authenticated
  using (has_role(array['owner','manager']::staff_role[]));
