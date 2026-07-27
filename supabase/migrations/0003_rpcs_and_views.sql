-- GYM-APP RPCs and views (V1)

-- ---------- reception manual override (dead phone / lost device) ----------
-- Security definer so it can write gym_sessions/access_events, but it
-- hard-requires an authorized staff role and a reason, and logs everything.

create or replace function manual_override(
  p_member_id uuid,
  p_branch_id uuid,
  p_direction text,          -- 'entry' | 'exit'
  p_reason text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_staff staff%rowtype;
  v_open gym_sessions%rowtype;
  v_sub_id uuid;
  v_session_id uuid;
begin
  select * into v_staff from staff
  where user_id = auth.uid() and is_active and deleted_at is null
    and role in ('owner','manager','reception');
  if not found then
    raise exception 'not_authorized';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'reason_required';
  end if;
  if p_direction not in ('entry','exit') then
    raise exception 'invalid_direction';
  end if;

  select * into v_open from gym_sessions
  where member_id = p_member_id and status = 'inside';

  if p_direction = 'entry' then
    if found then
      raise exception 'already_inside';
    end if;
    select id into v_sub_id from subscriptions
    where member_id = p_member_id and status = 'active'
      and starts_on <= current_date and ends_on >= current_date
    order by ends_on desc limit 1;
    if v_sub_id is null then
      raise exception 'no_active_subscription';
    end if;
    insert into gym_sessions (member_id, branch_id, subscription_id, entry_method, status)
    values (p_member_id, p_branch_id, v_sub_id, 'manual', 'inside')
    returning id into v_session_id;

    insert into access_events (member_id, branch_id, event_type, method, staff_id, override_reason)
    values (p_member_id, p_branch_id, 'manual_entry', 'manual', v_staff.id, p_reason);
  else
    if not found then
      raise exception 'not_inside';
    end if;
    update gym_sessions
    set exited_at = now(), exit_method = 'manual', status = 'completed'
    where id = v_open.id
    returning id into v_session_id;

    insert into access_events (member_id, branch_id, event_type, method, staff_id, override_reason)
    values (p_member_id, p_branch_id, 'manual_exit', 'manual', v_staff.id, p_reason);
  end if;

  insert into audit_log (actor_user_id, actor_role, action, entity, entity_id, details)
  values (auth.uid(), v_staff.role::text, 'manual_' || p_direction, 'gym_sessions', v_session_id,
          jsonb_build_object('member_id', p_member_id, 'reason', p_reason));

  return jsonb_build_object('ok', true, 'session_id', v_session_id);
end $$;

-- ---------- live occupancy (safe for members: counts only) ----------

create or replace function branch_occupancy(p_branch_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'inside', count(*),
    'capacity', (select capacity from branches where id = p_branch_id),
    'level', case
      when (select capacity from branches where id = p_branch_id) is null then 'unknown'
      when count(*)::float / nullif((select capacity from branches where id = p_branch_id), 0) < 0.4 then 'quiet'
      when count(*)::float / nullif((select capacity from branches where id = p_branch_id), 0) < 0.75 then 'moderate'
      else 'busy' end)
  from gym_sessions
  where branch_id = p_branch_id and status = 'inside'
$$;

-- ---------- member visit stats for the Visits screen ----------

create or replace function my_visit_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_member_id uuid;
  result jsonb;
begin
  select id into v_member_id from members where user_id = auth.uid() and deleted_at is null;
  if v_member_id is null then return '{}'::jsonb; end if;

  select jsonb_build_object(
    'visits_this_month', (
      select count(*) from gym_sessions
      where member_id = v_member_id
        and entered_at >= date_trunc('month', now())),
    'avg_duration_min', (
      select round(avg(duration_min)) from gym_sessions
      where member_id = v_member_id and duration_min is not null
        and entered_at >= now() - interval '90 days'),
    'most_visited_branch', (
      select b.name from gym_sessions g join branches b on b.id = g.branch_id
      where g.member_id = v_member_id
      group by b.name order by count(*) desc limit 1),
    'total_visits', (
      select count(*) from gym_sessions where member_id = v_member_id)
  ) into result;
  return result;
end $$;

-- ---------- nightly sweep: close sessions never checked out ----------
-- Run via pg_cron or a scheduled Edge Function. Sessions auto-closed at
-- 4 hours are flagged so the dashboard can list "never checked out".

create or replace function close_stale_sessions()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with closed as (
    update gym_sessions
    set exited_at = entered_at + interval '4 hours',
        status = 'completed',
        auto_closed = true
    where status = 'inside'
      and entered_at < now() - interval '4 hours'
    returning id)
  select count(*) into v_count from closed;
  return v_count;
end $$;

-- token hygiene: purge expired unused tokens (call from the same schedule)
create or replace function purge_expired_tokens()
returns integer language sql security definer set search_path = public as $$
  with del as (
    delete from entry_tokens
    where expires_at < now() - interval '1 hour'
    returning jti)
  select count(*)::int from del
$$;
