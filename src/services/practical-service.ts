import { supabase } from '@/lib/supabase';
import type {
  PracticalSession,
  PracticalSessionDetail,
  PracticalAttendance,
} from '@/types/database';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllPracticalSessions(): Promise<PracticalSessionDetail[]> {
  const { data, error } = await supabase
    .from('practical_session_details')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data as PracticalSessionDetail[];
}

export async function getFacultyPracticalSessions(): Promise<PracticalSessionDetail[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('practical_session_details')
    .select('*')
    .eq('faculty_id', user.id)
    .order('date', { ascending: false });
  if (error) throw error;
  return data as PracticalSessionDetail[];
}

export async function getPracticalSessionById(id: string): Promise<PracticalSessionDetail> {
  const { data, error } = await supabase
    .from('practical_session_details')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PracticalSessionDetail;
}

export async function getActiveSessions(filters?: {
  division?: string;
  batch?: string;
}): Promise<PracticalSessionDetail[]> {
  let query = supabase
    .from('practical_session_details')
    .select('*')
    .eq('active_status', true)
    .order('date', { ascending: false });

  if (filters?.division) query = query.eq('division', filters.division);
  if (filters?.batch) query = query.eq('batch', filters.batch);

  const { data, error } = await query;
  if (error) throw error;
  return data as PracticalSessionDetail[];
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createPracticalSession(payload: {
  shop_resource_id: string;
  division: string;
  batch: string;
  topic: string;
  date: string;
  start_time?: string;
  end_time?: string;
}): Promise<PracticalSession> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('practical_sessions')
    .insert({
      ...payload,
      faculty_id: user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PracticalSession;
}

export async function updatePracticalSession(
  id: string,
  updates: Partial<PracticalSession>,
): Promise<PracticalSession> {
  const { data, error } = await supabase
    .from('practical_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PracticalSession;
}

export async function endPracticalSession(id: string): Promise<PracticalSession> {
  const { data, error } = await supabase
    .from('practical_sessions')
    .update({ active_status: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PracticalSession;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function getSessionAttendance(sessionId: string): Promise<PracticalAttendance[]> {
  const { data, error } = await supabase
    .from('practical_attendance')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data as PracticalAttendance[];
}

export async function markAttendance(input: {
  sessionId: string;
  optionalComment?: string;
}): Promise<PracticalAttendance> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('practical_attendance')
    .insert({
      session_id: input.sessionId,
      user_id: user.id,
      optional_comment: input.optionalComment || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PracticalAttendance;
}

export async function checkMyAttendance(sessionId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('practical_attendance')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();

  return !!data;
}
