import { supabase } from '@/lib/supabase';
import type {
  UtilizationRequest,
  UtilizationRequestDetail,
  UtilizationStatus,
  SupervisorUtilizationStats,
} from '@/types/database';

// ─── Create ───────────────────────────────────────────────────────────────────

export interface CreateUtilizationInput {
  machine_id: string;
  work_type: string;
  work_description?: string;
  raw_material_source: string;
  date: string;
  start_time: string;
  end_time: string;
  safety_acknowledged: boolean;
  roll_number?: string;
  branch?: string;
  year?: number;
  division?: string;
  batch?: string;
  team_name?: string;
  team_name_other?: string;
  permission_letter_url?: string;
}

export async function createUtilizationRequest(
  input: CreateUtilizationInput,
): Promise<UtilizationRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch machine to auto-assign supervisor (fallback to added_by)
  const { data: machine, error: machineErr } = await supabase
    .from('machines')
    .select('supervisor_id, added_by')
    .eq('id', input.machine_id)
    .single();

  if (machineErr) throw machineErr;

  const supervisorId = machine?.supervisor_id ?? machine?.added_by ?? null;

  const { data, error } = await supabase
    .from('machine_utilization_requests')
    .insert({
      user_id: user.id,
      machine_id: input.machine_id,
      supervisor_id: supervisorId,
      work_type: input.work_type,
      work_description: input.work_description || null,
      raw_material_source: input.raw_material_source,
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
      safety_acknowledged: input.safety_acknowledged,
      roll_number: input.roll_number || null,
      branch: input.branch || null,
      year: input.year || null,
      division: input.division || null,
      batch: input.batch || null,
      team_name: input.team_name || null,
      team_name_other: input.team_name_other || null,
      permission_letter_url: input.permission_letter_url || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23P01') {
      throw new Error(
        'This time slot conflicts with an existing utilization request. Please choose a different time.',
      );
    }
    throw error;
  }

  return data as UtilizationRequest;
}

// ─── Student queries ──────────────────────────────────────────────────────────

export async function getUserUtilizationRequests(): Promise<UtilizationRequestDetail[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('utilization_request_details')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as UtilizationRequestDetail[];
}

// ─── Supervisor queries ───────────────────────────────────────────────────────

export async function getSupervisorUtilizationRequests(filters?: {
  status?: UtilizationStatus;
  machine_id?: string;
  date?: string;
}): Promise<UtilizationRequestDetail[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('utilization_request_details')
    .select('*')
    .eq('supervisor_id', user.id)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.machine_id) query = query.eq('machine_id', filters.machine_id);
  if (filters?.date) query = query.eq('date', filters.date);

  const { data, error } = await query;
  if (error) throw error;
  return data as UtilizationRequestDetail[];
}

export async function getSupervisorStats(): Promise<SupervisorUtilizationStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_supervisor_utilization_stats', {
    p_supervisor_id: user.id,
  });
  if (error) throw error;
  return data as SupervisorUtilizationStats;
}

// ─── Admin queries ────────────────────────────────────────────────────────────

export async function getAllUtilizationRequests(filters?: {
  status?: UtilizationStatus;
  machine_id?: string;
  date?: string;
  department?: string;
}): Promise<UtilizationRequestDetail[]> {
  let query = supabase
    .from('utilization_request_details')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.machine_id) query = query.eq('machine_id', filters.machine_id);
  if (filters?.date) query = query.eq('date', filters.date);
  if (filters?.department) query = query.eq('user_department', filters.department);

  const { data, error } = await query;
  if (error) throw error;
  return data as UtilizationRequestDetail[];
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────

export async function approveUtilizationRequest(
  requestId: string,
): Promise<UtilizationRequest> {
  const { data, error } = await supabase
    .from('machine_utilization_requests')
    .update({ status: 'approved' as UtilizationStatus })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Unable to approve — you may not have permission for this request.');
  return data as UtilizationRequest;
}

export async function rejectUtilizationRequest(
  requestId: string,
  reason: string,
): Promise<UtilizationRequest> {
  const { data, error } = await supabase
    .from('machine_utilization_requests')
    .update({
      status: 'rejected' as UtilizationStatus,
      rejection_reason: reason,
    })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Unable to reject — you may not have permission for this request.');
  return data as UtilizationRequest;
}

export async function completeUtilizationRequest(
  requestId: string,
): Promise<UtilizationRequest> {
  const { data, error } = await supabase
    .from('machine_utilization_requests')
    .update({ status: 'completed' as UtilizationStatus })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Unable to complete — you may not have permission for this request.');
  return data as UtilizationRequest;
}

export async function notCompleteUtilizationRequest(
  requestId: string,
  reason: string,
): Promise<UtilizationRequest> {
  const { data, error } = await supabase
    .from('machine_utilization_requests')
    .update({
      status: 'not_completed' as UtilizationStatus,
      not_completed_reason: reason,
    })
    .eq('id', requestId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Unable to mark as not completed.');
  return data as UtilizationRequest;
}

// ─── Safety check (30-day window) ─────────────────────────────────────────────

export async function checkRecentSafetyAcknowledgement(
  machineId: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from('safety_acknowledgements')
    .select('id')
    .eq('user_id', user.id)
    .eq('machine_id', machineId)
    .gte('acknowledged_at', thirtyDaysAgo.toISOString())
    .maybeSingle();

  return !!data;
}
