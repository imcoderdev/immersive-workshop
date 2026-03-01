import { supabase } from '@/lib/supabase';
import type {
  ToolIssueRequest,
  ToolIssueDetail,
  ToolIssueStatus,
} from '@/types/database';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllToolIssueRequests(filters?: {
  status?: ToolIssueStatus;
  resource_id?: string;
}): Promise<ToolIssueDetail[]> {
  let query = supabase
    .from('tool_issue_details')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.resource_id) query = query.eq('resource_id', filters.resource_id);

  const { data, error } = await query;
  if (error) throw error;
  return data as ToolIssueDetail[];
}

export async function getUserToolIssueRequests(): Promise<ToolIssueDetail[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tool_issue_details')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ToolIssueDetail[];
}

export async function getFacultyToolIssueRequests(): Promise<ToolIssueDetail[]> {
  // Faculty sees requests for tools under their supervised resources
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get resources supervised by this faculty
  const { data: resources } = await supabase
    .from('resources')
    .select('id')
    .eq('supervisor_id', user.id);

  if (!resources || resources.length === 0) return [];

  const resourceIds = resources.map((r) => r.id);

  const { data, error } = await supabase
    .from('tool_issue_details')
    .select('*')
    .in('resource_id', resourceIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ToolIssueDetail[];
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createToolIssueRequest(payload: {
  resource_id: string;
  quantity_requested: number;
}): Promise<ToolIssueRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tool_issue_requests')
    .insert({
      user_id: user.id,
      resource_id: payload.resource_id,
      quantity_requested: payload.quantity_requested,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ToolIssueRequest;
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────

export async function approveToolIssueRequest(
  requestId: string,
): Promise<ToolIssueRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tool_issue_requests')
    .update({
      status: 'approved' as ToolIssueStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return data as ToolIssueRequest;
}

export async function rejectToolIssueRequest(
  requestId: string,
  reason: string,
): Promise<ToolIssueRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tool_issue_requests')
    .update({
      status: 'rejected' as ToolIssueStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', requestId)
    .select()
    .single();
  if (error) throw error;
  return data as ToolIssueRequest;
}

// ─── Issue / Return (use RPCs) ────────────────────────────────────────────────

export async function issueToolToStudent(requestId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.rpc('issue_tool', {
    p_request_id: requestId,
    p_faculty_id: user.id,
  });
  if (error) throw error;
}

export async function returnTool(
  requestId: string,
  condition: string,
): Promise<void> {
  const { error } = await supabase.rpc('return_tool', {
    p_request_id: requestId,
    p_condition: condition,
  });
  if (error) throw error;
}
