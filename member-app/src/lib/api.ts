import { getDeviceId } from '@/lib/device';
import { supabase } from '@/lib/supabase';

export type EntryPass = {
  allowed: boolean;
  reason?: string;
  message?: string;
  purpose?: 'entry' | 'exit';
  qr?: string;
  expires_at?: string;
  inside_since?: string | null;
  member?: { name: string; photo_url: string | null };
};

export async function issueEntryToken(branchId: string): Promise<EntryPass> {
  const deviceId = await getDeviceId();
  const { data, error } = await supabase.functions.invoke('issue-entry-token', {
    body: { device_id: deviceId, branch_id: branchId },
  });
  if (error) return { allowed: false, reason: 'network', message: 'Could not reach the gym server.' };
  return data as EntryPass;
}

export type OpenSession = {
  id: string;
  entered_at: string;
  branch_id: string;
  branches: { name: string } | null;
};

export async function getOpenSession(): Promise<OpenSession | null> {
  const { data } = await supabase
    .from('gym_sessions')
    .select('id, entered_at, branch_id, branches(name)')
    .eq('status', 'inside')
    .maybeSingle();
  return (data as unknown as OpenSession) ?? null;
}

export type Visit = {
  id: string;
  entered_at: string;
  exited_at: string | null;
  duration_min: number | null;
  entry_method: string;
  auto_closed: boolean;
  branches: { name: string } | null;
};

export async function getVisits(limit = 30): Promise<Visit[]> {
  const { data } = await supabase
    .from('gym_sessions')
    .select('id, entered_at, exited_at, duration_min, entry_method, auto_closed, branches(name)')
    .order('entered_at', { ascending: false })
    .limit(limit);
  return (data as unknown as Visit[]) ?? [];
}

export type VisitStats = {
  visits_this_month?: number;
  avg_duration_min?: number | null;
  most_visited_branch?: string | null;
  total_visits?: number;
};

export async function getVisitStats(): Promise<VisitStats> {
  const { data } = await supabase.rpc('my_visit_stats');
  return (data as VisitStats) ?? {};
}

export type Branch = { id: string; name: string };

export async function getBranches(): Promise<Branch[]> {
  const { data } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  return (data as Branch[]) ?? [];
}

export type Occupancy = { inside: number; capacity: number | null; level: string };

export async function getOccupancy(branchId: string): Promise<Occupancy | null> {
  const { data } = await supabase.rpc('branch_occupancy', { p_branch_id: branchId });
  return (data as Occupancy) ?? null;
}

export type Subscription = {
  id: string;
  starts_on: string;
  ends_on: string;
  status: string;
  freeze_days_used: number;
  plans: { name: string; duration_days: number; freeze_days_allowed: number } | null;
};

export async function getCurrentSubscription(): Promise<Subscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, starts_on, ends_on, status, freeze_days_used, plans(name, duration_days, freeze_days_allowed)')
    .in('status', ['active', 'frozen'])
    .order('ends_on', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as Subscription) ?? null;
}
