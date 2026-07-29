-- GYM-APP Row-Level Security for department tables (V2)
-- Same model as 0002: members read their own rows; staff access is role-gated;
-- anything involving money, safety, or state transitions writes through the
-- security-definer RPCs in 0006 (or Edge Functions) — clients never write
-- ledgers or event streams directly.

-- ---------- helpers ----------

create or replace function current_staff_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from staff where user_id = auth.uid() and is_active and deleted_at is null
$$;

-- ---------- enable RLS on the new tables ----------
-- (0002's catch-all loop ran before these existed.)

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'payments','wallet_transactions','loyalty_transactions',
      'cafe_orders','cafe_order_items','health_facts',
      'incidents','incident_actions','assets','work_orders','work_order_events',
      'amenity_bookings','guest_passes','lockers','locker_assignments',
      'support_tickets','ticket_events','leads','invoices',
      'member_vehicles','family_links','app_events','rooms'])
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ---------- payments ----------

create policy "member reads own payments"
  on payments for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception','accountant']::staff_role[]));
-- writes: RPCs / Edge Functions only

-- ---------- wallet & loyalty ledgers: read-only for everyone ----------

create policy "member reads own wallet"
  on wallet_transactions for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception','accountant']::staff_role[]));

create policy "member reads own loyalty"
  on loyalty_transactions for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- cafe ----------

create policy "member reads own orders"
  on cafe_orders for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','cafe','reception']::staff_role[]));

create policy "order items follow their order"
  on cafe_order_items for select to authenticated
  using (exists (select 1 from cafe_orders o
                 where o.id = order_id
                   and (o.member_id = current_member_id()
                        or has_role(array['owner','manager','cafe','reception']::staff_role[]))));
-- order creation and every status transition go through 0006 RPCs

-- ---------- health facts ----------
-- Direct table access is deliberately narrow: the member sees their own
-- record; the nutritionist (clinical owner) and management see all of it.
-- Every other role reads through health_facts_for() in 0006, which scopes
-- kinds per role and blanks the note for reception — matching
-- DemoData.HealthService.visibleTo. Trainers/instructors/cafe get NO direct
-- table read, so the scoping function is the only path.

create policy "member reads own health facts"
  on health_facts for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','nutritionist']::staff_role[]));

-- Provenance is pinned per author: nobody can forge a higher-authority source
-- or precedence than their role carries, and recorded_by must be the caller.
create policy "member declares own facts"
  on health_facts for insert to authenticated
  with check (member_id = current_member_id()
              and source = 'member_declared'
              and recorded_by_kind = 'member'
              and recorded_by_id = current_member_id()
              and precedence <= 2);

create policy "trainer records assessments"
  on health_facts for insert to authenticated
  with check (has_role(array['trainer']::staff_role[])
              and source = 'trainer_assessment'
              and recorded_by_kind = 'staff'
              and recorded_by_id = current_staff_id()
              and precedence <= 3);

create policy "nutritionist records clinical facts"
  on health_facts for insert to authenticated
  with check (has_role(array['nutritionist']::staff_role[])
              and source in ('nutritionist_assessment','physio_clearance','medical_document')
              and recorded_by_kind = 'staff'
              and recorded_by_id = current_staff_id());

-- a trainer may re-read facts they authored (insert … returning); everything
-- else goes through health_facts_for()
create policy "trainer reads own recorded facts"
  on health_facts for select to authenticated
  using (has_role(array['trainer']::staff_role[])
         and recorded_by_kind = 'staff'
         and recorded_by_id = current_staff_id());

create policy "nutritionist manages facts"
  on health_facts for update to authenticated
  using (has_role(array['owner','manager','nutritionist']::staff_role[]))
  with check (has_role(array['owner','manager','nutritionist']::staff_role[]));

-- ---------- incidents ----------

create policy "member reads own incidents"
  on incidents for select to authenticated
  using (member_id = current_member_id() or is_staff());

create policy "staff read incident actions"
  on incident_actions for select to authenticated
  using (is_staff());
-- raise/acknowledge/close via RPCs

-- ---------- assets & work orders ----------

create policy "assets readable by authenticated"
  on assets for select to authenticated using (deleted_at is null);

create policy "maintenance manages assets"
  on assets for all to authenticated
  using (has_role(array['owner','manager','maintenance']::staff_role[]))
  with check (has_role(array['owner','manager','maintenance']::staff_role[]));

-- Work orders carry no member PII, and any staff role can file one via
-- report_equipment(), so all staff may read them (a trainer must be able to
-- see the report they just filed).
create policy "reporter reads own work orders"
  on work_orders for select to authenticated
  using ((reporter_kind = 'member' and reporter_id = current_member_id())
         or is_staff());

create policy "maintenance updates work orders"
  on work_orders for update to authenticated
  using (has_role(array['owner','manager','maintenance']::staff_role[]))
  with check (has_role(array['owner','manager','maintenance']::staff_role[]));
-- creation via report_equipment() RPC so severity='safety' always isolates

create policy "staff read wo events"
  on work_order_events for select to authenticated
  using (is_staff());

-- free-text notes only, attributed to the caller; status transitions go
-- through wo_set_status() so nobody authors events as someone else
create policy "maintenance writes wo notes"
  on work_order_events for insert to authenticated
  with check (has_role(array['owner','manager','maintenance']::staff_role[])
              and staff_id = current_staff_id()
              and status is null);

-- ---------- amenity bookings ----------

create policy "member reads own amenity bookings"
  on amenity_bookings for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception','instructor']::staff_role[]));

-- cancel-only: a member may cancel their own future booking, nothing else —
-- no resurrecting cancelled slots, no editing times/lanes around the
-- exclusion constraint
create policy "member cancels own amenity booking"
  on amenity_bookings for update to authenticated
  using (member_id = current_member_id() and status = 'booked' and starts_at > now())
  with check (member_id = current_member_id() and status = 'cancelled');
-- creation via book_amenity() RPC (exclusion constraint does the real work)

create policy "reception manages amenity bookings"
  on amenity_bookings for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- guest passes ----------

create policy "member reads own guest passes"
  on guest_passes for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception']::staff_role[]));
-- issue/use via RPCs (quota + single-use enforcement)

-- ---------- lockers ----------

-- locker numbers are not sensitive, and a member must be able to re-read
-- which locker is theirs (join through locker_assignments)
create policy "lockers readable by authenticated"
  on lockers for select to authenticated using (is_active);

create policy "managers manage lockers"
  on lockers for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

create policy "member reads own locker assignment"
  on locker_assignments for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception']::staff_role[]));
-- assign/release/manual-open via RPCs

-- ---------- support tickets ----------

create policy "member reads own tickets"
  on support_tickets for select to authenticated
  using (member_id = current_member_id() or is_staff());

create policy "member opens tickets"
  on support_tickets for insert to authenticated
  with check (member_id = current_member_id()
              and raised_by_kind = 'member'
              and status = 'open');

create policy "staff open tickets"
  on support_tickets for insert to authenticated
  with check (is_staff() and raised_by_kind = 'staff');

create policy "staff manage tickets"
  on support_tickets for update to authenticated
  using (is_staff())
  with check (is_staff());

create policy "ticket events follow ticket read"
  on ticket_events for select to authenticated
  using (exists (select 1 from support_tickets t
                 where t.id = ticket_id
                   and (t.member_id = current_member_id() or is_staff())));

create policy "staff write ticket events"
  on ticket_events for insert to authenticated
  with check (is_staff());

-- ---------- leads: staff-only CRM ----------

create policy "reception works leads"
  on leads for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- invoices ----------

create policy "member reads own invoices"
  on invoices for select to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception','accountant']::staff_role[]));

create policy "accounting manages invoices"
  on invoices for all to authenticated
  using (has_role(array['owner','manager','accountant','reception']::staff_role[]))
  with check (has_role(array['owner','manager','accountant','reception']::staff_role[]));

-- ---------- vehicles & family ----------

create policy "member manages own vehicles"
  on member_vehicles for all to authenticated
  using (member_id = current_member_id()
         or has_role(array['owner','manager','reception']::staff_role[]))
  with check (member_id = current_member_id()
              or has_role(array['owner','manager','reception']::staff_role[]));

create policy "member reads own family links"
  on family_links for select to authenticated
  using (member_id = current_member_id()
         or related_member_id = current_member_id()
         or has_role(array['owner','manager','reception']::staff_role[]));

create policy "reception manages family links"
  on family_links for all to authenticated
  using (has_role(array['owner','manager','reception']::staff_role[]))
  with check (has_role(array['owner','manager','reception']::staff_role[]));

-- ---------- rooms ----------

create policy "rooms readable by authenticated"
  on rooms for select to authenticated using (true);

create policy "managers manage rooms"
  on rooms for all to authenticated
  using (has_role(array['owner','manager']::staff_role[]))
  with check (has_role(array['owner','manager']::staff_role[]));

-- ---------- app_events ----------
-- Members see events addressed to them plus a whitelist of genuinely public
-- broadcast types. A bare "subject is null" clause would leak staff-facing
-- broadcasts — raise_sos() deliberately writes SOS with a null subject so
-- every staff dashboard sees it, and members must NOT read other people's
-- emergencies. Staff see everything. Nobody inserts directly — only RPCs
-- (security definer) and Edge Functions.

create policy "member reads own events"
  on app_events for select to authenticated
  using (subject_member_id = current_member_id()
         or is_staff()
         or (subject_member_id is null
             and type in ('announcement','asset-status','class-cancelled')));
