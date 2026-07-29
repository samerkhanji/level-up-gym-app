-- GYM-APP department RPCs (V2)
-- Every rule the web-demo enforced client-side gets its authoritative server
-- home here. All functions are security definer with a hard role/identity
-- check at the top; money paths take a per-member advisory lock so balances
-- cannot be raced.

-- ---------- internal helpers ----------

create or replace function _event(
  p_type text, p_actor_kind actor_kind, p_actor uuid,
  p_subject uuid, p_payload jsonb
) returns void language sql security definer set search_path = public as $$
  insert into app_events (type, actor_kind, actor_id, subject_member_id, payload)
  values (p_type, p_actor_kind, p_actor, p_subject, coalesce(p_payload, '{}'::jsonb))
$$;

create or replace function _require_member()
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  v := current_member_id();
  if v is null then raise exception 'not_a_member'; end if;
  return v;
end $$;

create or replace function _require_staff(roles staff_role[])
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from staff
  where user_id = auth.uid() and is_active and deleted_at is null
    and role = any (roles);
  if v is null then raise exception 'not_authorized'; end if;
  return v;
end $$;

-- ---------- wallet & loyalty ----------

create or replace function wallet_balance(p_member uuid default null)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare v_member uuid;
begin
  v_member := coalesce(p_member, current_member_id());
  if v_member is null then raise exception 'not_a_member'; end if;
  -- fail CLOSED: `is distinct from` is null-safe (a plain <> against a null
  -- current_member_id() yields NULL and the guard would silently pass)
  if v_member is distinct from current_member_id()
     and not coalesce(has_role(array['owner','manager','reception','accountant']::staff_role[]), false) then
    raise exception 'not_authorized';
  end if;
  return coalesce((select sum(amount_usd) from wallet_transactions
                   where member_id = v_member), 0);
end $$;

create or replace function loyalty_balance(p_member uuid default null)
returns integer language plpgsql stable security definer set search_path = public as $$
declare v_member uuid;
begin
  v_member := coalesce(p_member, current_member_id());
  if v_member is null then raise exception 'not_a_member'; end if;
  if v_member is distinct from current_member_id()
     and not coalesce(has_role(array['owner','manager','reception']::staff_role[]), false) then
    raise exception 'not_authorized';
  end if;
  return coalesce((select sum(points) from loyalty_transactions
                   where member_id = v_member), 0)::int;
end $$;

-- Reception records a cash/card top-up. Online gateway top-ups arrive through
-- an Edge Function using the service role — never from the member's client.
create or replace function wallet_topup(
  p_member uuid, p_amount numeric, p_method text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_payment uuid;
begin
  v_staff := _require_staff(array['owner','manager','reception']::staff_role[]);
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  if p_method not in ('cash','card') then raise exception 'invalid_method'; end if;

  insert into payments (member_id, amount_usd, method, what, staff_id)
  values (p_member, p_amount, p_method, 'Wallet top-up', v_staff)
  returning id into v_payment;

  insert into wallet_transactions (member_id, type, amount_usd, reason, payment_id, staff_id)
  values (p_member, 'topup', p_amount, 'Top-up at desk', v_payment, v_staff);

  perform _event('wallet-topup', 'staff', v_staff, p_member,
                 jsonb_build_object('amount', p_amount));
  return jsonb_build_object('ok', true, 'balance', wallet_balance(p_member));
end $$;

-- Atomic debit: advisory lock serializes per-member wallet writes so two
-- concurrent orders cannot both pass the balance check.
create or replace function _wallet_debit(
  p_member uuid, p_amount numeric, p_reason text, p_order uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount < 0 then raise exception 'invalid_amount'; end if;
  if p_amount = 0 then return; end if;   -- nothing to debit; avoid a 0-row that
                                          -- would violate wallet_sign
  perform pg_advisory_xact_lock(hashtext('wallet:' || p_member::text));
  if coalesce((select sum(amount_usd) from wallet_transactions
               where member_id = p_member), 0) < p_amount then
    raise exception 'insufficient_funds';
  end if;
  insert into wallet_transactions (member_id, type, amount_usd, reason, order_id)
  values (p_member, 'debit', -p_amount, p_reason, p_order);
end $$;

create or replace function redeem_points(p_points integer, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid;
begin
  v_member := _require_member();
  if p_points is null or p_points <= 0 then raise exception 'invalid_points'; end if;
  perform pg_advisory_xact_lock(hashtext('loyalty:' || v_member::text));
  if coalesce((select sum(points) from loyalty_transactions
               where member_id = v_member), 0) < p_points then
    raise exception 'insufficient_points';
  end if;
  insert into loyalty_transactions (member_id, type, points, reason)
  values (v_member, 'redeem', -p_points, coalesce(p_reason, 'redeem'));
  return jsonb_build_object('ok', true, 'balance', loyalty_balance(v_member));
end $$;

-- ---------- cafe ----------

-- Items arrive as [{menu_item_id, qty, notes}]. Prices are read from
-- menu_items HERE — a client-supplied total is never trusted.
create or replace function place_cafe_order(p_items jsonb, p_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member uuid; v_order uuid; v_total numeric := 0;
  v_item record; v_status order_status;
begin
  v_member := _require_member();
  if p_method not in ('wallet','cash','card') then raise exception 'invalid_method'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'empty_order'; end if;

  v_status := case when p_method = 'wallet' then 'placed' else 'awaiting_payment' end;
  insert into cafe_orders (member_id, status, total_usd, payment_method)
  values (v_member, v_status, 0, p_method)
  returning id into v_order;

  for v_item in
    select (e->>'menu_item_id')::uuid as menu_item_id,
           greatest(1, coalesce((e->>'qty')::int, 1)) as qty,
           e->>'notes' as notes
    from jsonb_array_elements(p_items) e
  loop
    insert into cafe_order_items (order_id, menu_item_id, name_snapshot, price_snapshot_usd, qty, notes)
    select v_order, m.id, m.name, m.price_usd, v_item.qty, v_item.notes
    from menu_items m
    where m.id = v_item.menu_item_id and m.is_available;
    if not found then raise exception 'item_unavailable'; end if;
  end loop;

  select sum(price_snapshot_usd * qty) into v_total
  from cafe_order_items where order_id = v_order;
  update cafe_orders set total_usd = v_total where id = v_order;

  if p_method = 'wallet' then
    perform _wallet_debit(v_member, v_total, 'Cafe order', v_order);
  end if;

  perform _event('cafe-order', 'member', v_member, v_member,
                 jsonb_build_object('orderId', v_order, 'total', v_total, 'method', p_method));
  return jsonb_build_object('ok', true, 'order_id', v_order, 'total', v_total);
end $$;

create or replace function cafe_set_order_status(
  p_order uuid, p_status order_status, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_ord cafe_orders%rowtype; v_code text;
begin
  v_staff := _require_staff(array['owner','manager','cafe','reception']::staff_role[]);
  select * into v_ord from cafe_orders where id = p_order for update;
  if not found then raise exception 'unknown_order'; end if;

  -- legal transitions only; anything else is a client bug or forgery
  if not (
    (v_ord.status = 'awaiting_payment' and p_status in ('placed','cancelled'))
    or (v_ord.status = 'placed'    and p_status in ('accepted','rejected'))
    or (v_ord.status = 'accepted'  and p_status in ('preparing','rejected'))
    or (v_ord.status = 'preparing' and p_status = 'ready')
    or (v_ord.status = 'ready'     and p_status = 'collected')
  ) then
    raise exception 'illegal_transition from % to %', v_ord.status, p_status;
  end if;

  if p_status = 'ready' then
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  end if;

  update cafe_orders
  set status = p_status,
      pickup_code = coalesce(v_code, pickup_code),
      rejected_reason = case when p_status = 'rejected' then p_note else rejected_reason end,
      handled_by_staff = v_staff
  where id = p_order;

  -- rejection of a wallet-paid order refunds automatically
  if p_status = 'rejected' and v_ord.payment_method = 'wallet' then
    insert into wallet_transactions (member_id, type, amount_usd, reason, order_id, staff_id)
    values (v_ord.member_id, 'refund', v_ord.total_usd, 'Order rejected', p_order, v_staff);
  end if;

  perform _event('cafe-order-status', 'staff', v_staff, v_ord.member_id,
                 jsonb_build_object('orderId', p_order, 'status', p_status,
                                    'pickupCode', v_code, 'note', p_note));
  return jsonb_build_object('ok', true, 'status', p_status, 'pickup_code', v_code);
end $$;

create or replace function cafe_offer_substitution(p_order uuid, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_member uuid;
begin
  v_staff := _require_staff(array['owner','manager','cafe']::staff_role[]);
  if p_note is null or length(trim(p_note)) < 3 then raise exception 'note_required'; end if;
  update cafe_orders set substitution = 'offered', substitution_note = p_note,
         handled_by_staff = v_staff
  where id = p_order and status in ('placed','accepted','preparing')
  returning member_id into v_member;
  if not found then raise exception 'unknown_or_closed_order'; end if;
  perform _event('cafe-substitution', 'staff', v_staff, v_member,
                 jsonb_build_object('orderId', p_order, 'note', p_note));
  return jsonb_build_object('ok', true);
end $$;

create or replace function respond_substitution(p_order uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid;
begin
  v_member := _require_member();
  update cafe_orders
  set substitution = case when p_accept then 'accepted' else 'declined' end
  where id = p_order and member_id = v_member and substitution = 'offered';
  if not found then raise exception 'no_pending_offer'; end if;
  perform _event('cafe-substitution-response', 'member', v_member, v_member,
                 jsonb_build_object('orderId', p_order, 'accepted', p_accept));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- health facts: role-scoped read ----------
-- The ONLY read path for trainer/instructor/cafe/reception, mirroring
-- DemoData.HealthService.visibleTo (0005 gives those roles no direct read):
--   nutritionist → everything        trainer   → allergies + injuries
--   instructor   → injuries only     cafe      → allergies only
--   reception    → high-severity flags with the note blanked

create or replace function health_facts_for(p_member uuid)
returns table (
  id uuid, kind health_fact_kind, label text, severity text,
  source health_fact_source, precedence integer, note text, created_at timestamptz
) language plpgsql stable security definer set search_path = public as $$
declare v_role staff_role;
begin
  if p_member = current_member_id() then
    return query select f.id, f.kind, f.label, f.severity, f.source, f.precedence, f.note, f.created_at
      from health_facts f where f.member_id = p_member and f.retracted_at is null;
    return;
  end if;
  v_role := current_staff_role();
  if v_role is null then raise exception 'not_authorized'; end if;
  return query
    select f.id, f.kind, f.label, f.severity, f.source, f.precedence,
           case when v_role = 'reception' then '' else f.note end,
           f.created_at
    from health_facts f
    where f.member_id = p_member and f.retracted_at is null
      and case v_role
        when 'nutritionist' then true
        when 'owner'        then true
        when 'manager'      then true
        when 'trainer'      then f.kind <> 'condition'
        when 'instructor'   then f.kind = 'injury'
        when 'cafe'         then f.kind = 'allergy'
        when 'reception'    then f.severity = 'high'
        else false
      end
    order by f.precedence desc, f.created_at desc;
end $$;

-- ---------- incidents & SOS ----------

create or replace function raise_sos(p_type text, p_zone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_inc uuid;
begin
  v_member := _require_member();
  insert into incidents (kind, member_id, type, zone)
  values ('sos', v_member, p_type, p_zone)
  returning id into v_inc;
  perform _event('sos', 'member', v_member, null,   -- broadcast: all staff must see it
                 jsonb_build_object('incidentId', v_inc, 'memberId', v_member,
                                    'sosType', p_type, 'zone', p_zone));
  return jsonb_build_object('ok', true, 'incident_id', v_inc);
end $$;

create or replace function acknowledge_incident(p_incident uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_member uuid;
begin
  v_staff := _require_staff(array['owner','manager','reception','trainer','instructor','maintenance','nutritionist','cafe']::staff_role[]);
  update incidents set status = 'acknowledged', acknowledged_by = v_staff, acknowledged_at = now()
  where id = p_incident and status = 'active'
  returning member_id into v_member;
  if not found then raise exception 'not_active'; end if;
  insert into incident_actions (incident_id, staff_id, action)
  values (p_incident, v_staff, 'acknowledged');
  perform _event('sos-acknowledged', 'staff', v_staff, v_member,
                 jsonb_build_object('incidentId', p_incident));
  return jsonb_build_object('ok', true);
end $$;

-- Closing requires a real report — the table constraint backs this up.
create or replace function close_incident(p_incident uuid, p_report text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_member uuid;
begin
  v_staff := _require_staff(array['owner','manager','reception']::staff_role[]);
  if p_report is null or length(trim(p_report)) < 5 then
    raise exception 'incident_report_required';
  end if;
  update incidents set status = 'closed', closed_at = now(), report = p_report
  where id = p_incident and status in ('active','acknowledged')
  returning member_id into v_member;
  if not found then raise exception 'unknown_or_closed'; end if;
  insert into incident_actions (incident_id, staff_id, action)
  values (p_incident, v_staff, 'closed');
  perform _event('incident-closed', 'staff', v_staff, v_member,
                 jsonb_build_object('incidentId', p_incident));
  return jsonb_build_object('ok', true);
end $$;

-- ---------- maintenance ----------

-- Members and staff report equipment; a safety report isolates the asset
-- immediately and tells every dashboard — the demo's rule, now atomic.
create or replace function report_equipment(
  p_asset uuid, p_problem text, p_severity work_order_severity default 'normal'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_member uuid; v_staff uuid; v_wo uuid;
  v_kind actor_kind; v_actor uuid; v_alt uuid;
begin
  v_member := current_member_id();
  if v_member is not null then
    v_kind := 'member'; v_actor := v_member;
  else
    v_staff := _require_staff(array['owner','manager','reception','trainer','instructor','maintenance','nutritionist','cafe']::staff_role[]);
    v_kind := 'staff'; v_actor := v_staff;
  end if;
  if p_problem is null or length(trim(p_problem)) < 3 then raise exception 'problem_required'; end if;

  insert into work_orders (asset_id, problem, severity, reporter_kind, reporter_id)
  values (p_asset, p_problem, p_severity, v_kind, v_actor)
  returning id into v_wo;
  insert into work_order_events (work_order_id, status, note)
  values (v_wo, 'reported', p_problem);

  if p_severity = 'safety' then
    update assets set status = 'out_of_service' where id = p_asset
    returning alt_asset_id into v_alt;
    perform _event('asset-status', v_kind, v_actor, null,
                   jsonb_build_object('assetId', p_asset, 'status', 'out_of_service',
                                      'altAssetId', v_alt, 'reason', 'auto-isolated: safety report'));
  end if;

  perform _event('equipment-report', v_kind, v_actor, v_member,
                 jsonb_build_object('workOrderId', v_wo, 'assetId', p_asset, 'severity', p_severity));
  return jsonb_build_object('ok', true, 'work_order_id', v_wo);
end $$;

create or replace function wo_set_status(
  p_wo uuid, p_status work_order_status, p_note text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_wo work_orders%rowtype;
begin
  v_staff := _require_staff(array['owner','manager','maintenance']::staff_role[]);
  select * into v_wo from work_orders where id = p_wo for update;
  if not found then raise exception 'unknown_work_order'; end if;

  -- return-to-service needs a verifier who is not the fixer. Without a
  -- recorded assignee the constraint verify_not_self is vacuous, so require
  -- one — skipping the in_progress step must not enable self-verification.
  if p_status = 'verified' then
    if v_wo.assignee_staff_id is null then
      raise exception 'verify_requires_assignee';
    end if;
    if v_wo.assignee_staff_id = v_staff then
      raise exception 'verify_requires_second_staff';
    end if;
    update work_orders set status = 'verified', verified_by_staff = v_staff where id = p_wo;
    update assets set status = 'available', last_inspection = current_date
    where id = v_wo.asset_id;
    perform _event('asset-status', 'staff', v_staff, null,
                   jsonb_build_object('assetId', v_wo.asset_id, 'status', 'available'));
  else
    update work_orders
    set status = p_status,
        assignee_staff_id = case when p_status = 'in_progress'
                                 then coalesce(assignee_staff_id, v_staff)
                                 else assignee_staff_id end
    where id = p_wo;
  end if;

  insert into work_order_events (work_order_id, status, note, staff_id)
  values (p_wo, p_status, p_note, v_staff);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- pool lanes & recovery ----------
-- The no_lane_overlap exclusion constraint is the actual enforcement; this
-- RPC just shapes the error and picks a free lane when none is named.

create or replace function book_amenity(
  p_kind amenity_kind, p_starts timestamptz, p_ends timestamptz,
  p_lane integer default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_lane integer; v_id uuid;
begin
  v_member := _require_member();
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    raise exception 'invalid_slot';
  end if;

  if p_kind = 'pool_lane' then
    if p_lane is not null then
      v_lane := p_lane;
    else
      select n into v_lane from generate_series(1, 6) n
      where not exists (
        select 1 from amenity_bookings b
        where b.kind = 'pool_lane' and b.status = 'booked' and b.lane_number = n
          and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_starts, p_ends))
      order by n limit 1;
      if v_lane is null then raise exception 'no_lane_free'; end if;
    end if;
  end if;

  begin
    insert into amenity_bookings (member_id, kind, lane_number, starts_at, ends_at)
    values (v_member, p_kind, v_lane, p_starts, p_ends)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'lane_taken';
  end;

  perform _event('amenity-booked', 'member', v_member, v_member,
                 jsonb_build_object('bookingId', v_id, 'kind', p_kind, 'lane', v_lane));
  return jsonb_build_object('ok', true, 'booking_id', v_id, 'lane', v_lane);
end $$;

-- ---------- guest passes ----------

create or replace function issue_guest_pass(p_guest_name text, p_guest_phone text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_quota integer; v_used integer; v_code text; v_id uuid;
begin
  v_member := _require_member();
  if p_guest_name is null or length(trim(p_guest_name)) < 2 then
    raise exception 'guest_name_required';
  end if;
  -- serialize per member: count-then-insert must not race past the quota
  perform pg_advisory_xact_lock(hashtext('guest:' || v_member::text));

  -- quota comes from the member's ACTIVE plan (demo: guestsPerMonth)
  select p.guests_per_month into v_quota
  from subscriptions s join plans p on p.id = s.plan_id
  where s.member_id = v_member and s.status = 'active'
    and s.starts_on <= current_date and s.ends_on >= current_date
  order by s.ends_on desc limit 1;
  if v_quota is null then raise exception 'no_active_subscription'; end if;

  select count(*) into v_used from guest_passes
  where member_id = v_member and status <> 'cancelled'
    and created_at >= date_trunc('month', now());
  if v_used >= v_quota then raise exception 'guest_quota_reached'; end if;

  v_code := 'GST-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
  insert into guest_passes (member_id, code, guest_name, guest_phone, expires_at)
  values (v_member, v_code, trim(p_guest_name), p_guest_phone, now() + interval '7 days')
  returning id into v_id;

  perform _event('guest-pass-issued', 'member', v_member, v_member,
                 jsonb_build_object('passId', v_id, 'code', v_code));
  return jsonb_build_object('ok', true, 'code', v_code,
                            'remaining', v_quota - v_used - 1);
end $$;

create or replace function use_guest_pass(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_pass guest_passes%rowtype;
begin
  v_staff := _require_staff(array['owner','manager','reception']::staff_role[]);
  select * into v_pass from guest_passes where code = upper(trim(p_code)) for update;
  if not found then raise exception 'unknown_code'; end if;
  if v_pass.status <> 'issued' then raise exception 'already_%', v_pass.status; end if;
  -- just raise: an UPDATE here would be rolled back by the exception anyway;
  -- a scheduled sweep (or the next issue attempt) can mark stale passes
  if v_pass.expires_at < now() then
    raise exception 'expired';
  end if;
  update guest_passes set status = 'used', used_at = now(), checked_in_by = v_staff
  where id = v_pass.id;
  perform _event('guest-pass-used', 'staff', v_staff, v_pass.member_id,
                 jsonb_build_object('passId', v_pass.id, 'guest', v_pass.guest_name));
  return jsonb_build_object('ok', true, 'guest_name', v_pass.guest_name,
                            'host_member_id', v_pass.member_id);
end $$;

-- ---------- lockers ----------

create or replace function assign_locker()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_locker uuid; v_number integer; v_session uuid;
begin
  v_member := _require_member();
  if exists (select 1 from locker_assignments
             where member_id = v_member and released_at is null) then
    raise exception 'already_assigned';
  end if;
  select id into v_session from gym_sessions
  where member_id = v_member and status = 'inside';

  -- atomic pick: skip lockers another transaction is grabbing right now
  select l.id, l.number into v_locker, v_number
  from lockers l
  where l.is_active
    and not exists (select 1 from locker_assignments a
                    where a.locker_id = l.id and a.released_at is null)
  order by l.number
  limit 1
  for update of l skip locked;
  if v_locker is null then raise exception 'no_locker_free'; end if;

  -- the NOT EXISTS above reads the statement snapshot; if a concurrent txn
  -- assigned the same locker, the one_holder_per_locker unique index is the
  -- real gate — surface it as a clean error rather than a raw 23505
  begin
    insert into locker_assignments (locker_id, member_id, gym_session_id)
    values (v_locker, v_member, v_session);
  exception when unique_violation then
    raise exception 'no_locker_free';
  end;
  return jsonb_build_object('ok', true, 'locker_number', v_number);
end $$;

create or replace function release_locker()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid;
begin
  v_member := _require_member();
  update locker_assignments set released_at = now()
  where member_id = v_member and released_at is null;
  if not found then raise exception 'no_locker_assigned'; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function staff_open_locker(p_member uuid, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_staff uuid; v_number integer;
begin
  v_staff := _require_staff(array['owner','manager','reception']::staff_role[]);
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'reason_required'; end if;
  update locker_assignments a set opened_by_staff = v_staff
  from lockers l
  where a.locker_id = l.id and a.member_id = p_member and a.released_at is null
  returning l.number into v_number;
  if not found then raise exception 'no_locker_assigned'; end if;
  insert into audit_log (actor_user_id, actor_role, action, entity, details)
  values (auth.uid(),
          (select role::text from staff where id = v_staff),  -- real caller role
          'locker_manual_open', 'locker_assignments',
          jsonb_build_object('member_id', p_member, 'locker', v_number, 'reason', p_reason));
  return jsonb_build_object('ok', true, 'locker_number', v_number);
end $$;

-- ---------- privacy: export & deletion (server-side F-PRIV-1) ----------

create or replace function export_my_data()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_member uuid; result jsonb;
begin
  v_member := _require_member();
  select jsonb_build_object(
    'exportedAt', now(),
    'member', (select to_jsonb(m) - 'user_id' from members m where m.id = v_member),
    'subscriptions', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
                      from subscriptions s where s.member_id = v_member),
    'visits', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
               from gym_sessions g where g.member_id = v_member),
    'payments', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
                 from payments p where p.member_id = v_member),
    'wallet', (select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb)
               from wallet_transactions w where w.member_id = v_member),
    'loyalty', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
                from loyalty_transactions l where l.member_id = v_member),
    'orders', (select coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
               from cafe_orders o where o.member_id = v_member),
    'trainerBookings', (select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
                        from trainer_bookings b where b.member_id = v_member),
    'classBookings', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
                      from class_bookings c where c.member_id = v_member),
    'amenityBookings', (select coalesce(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
                        from amenity_bookings a where a.member_id = v_member),
    'guestPasses', (select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
                    from guest_passes g where g.member_id = v_member),
    'healthFacts', (select coalesce(jsonb_agg(to_jsonb(h)), '[]'::jsonb)
                    from health_facts h where h.member_id = v_member and h.retracted_at is null),
    'tickets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
                from support_tickets t where t.member_id = v_member),
    'invoices', (select coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
                 from invoices i where i.member_id = v_member),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
                      from notifications n where n.member_id = v_member)
  ) into result;
  return result;
end $$;

-- Deletion request: files the ticket and freezes the account. Actual erasure
-- is a staff-reviewed process (billing/legal retention), like the demo says.
create or replace function request_account_deletion()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_ticket uuid;
begin
  v_member := _require_member();
  insert into support_tickets (kind, member_id, raised_by_kind, raised_by_id, subject, body)
  values ('deletion_request', v_member, 'member', v_member,
          'DELETION REQUEST — personal data',
          'Member requested account deletion. Verify identity, settle balances, then erase per retention policy.')
  returning id into v_ticket;
  update members set status = 'blocked', blocked_reason = 'deletion_requested'
  where id = v_member;
  perform _event('deletion-requested', 'member', v_member, v_member,
                 jsonb_build_object('ticketId', v_ticket));
  return jsonb_build_object('ok', true, 'ticket_id', v_ticket);
end $$;

-- ---------- lock down execute grants ----------
-- Postgres grants EXECUTE to PUBLIC by default, and PostgREST exposes every
-- function in the API schema. The _-prefixed helpers are SECURITY DEFINER
-- with NO caller check by design (their callers check) — left callable they
-- would let any client debit any wallet or forge app_events. The 0003
-- maintenance sweeps are cron/service entry points, not client API.

revoke execute on function _event(text, actor_kind, uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function _wallet_debit(uuid, numeric, text, uuid)
  from public, anon, authenticated;
revoke execute on function _require_member() from public, anon, authenticated;
revoke execute on function _require_staff(staff_role[]) from public, anon, authenticated;
revoke execute on function close_stale_sessions() from public, anon, authenticated;
revoke execute on function purge_expired_tokens() from public, anon, authenticated;
