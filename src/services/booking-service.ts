import { supabase } from '@/lib/supabase';
import type {
  Booking,
  BookingDetail,
  BookingStatus,
  SafetyAcknowledgement,
  AdminStats,
  WeeklyUsage,
  MachineUtilization,
} from '@/types/database';

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function createBooking(booking: {
  machine_id: string;
  workshop_id: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
}): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bookings')
    .insert({ ...booking, user_id: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === '23P01') {
      throw new Error('This time slot conflicts with an existing booking. Please choose a different time.');
    }
    throw error;
  }

  // Trigger n8n webhook for booking submission
  await triggerN8nWebhook('booking-submitted', data);

  return data as Booking;
}

export async function getUserBookings(): Promise<BookingDetail[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('booking_details')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) throw error;
  return data as BookingDetail[];
}

export async function getAllBookings(filters?: {
  status?: BookingStatus;
  date?: string;
  workshop_id?: string;
}): Promise<BookingDetail[]> {
  let query = supabase
    .from('booking_details')
    .select('*')
    .order('date', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.date) query = query.eq('date', filters.date);
  if (filters?.workshop_id) query = query.eq('workshop_id', filters.workshop_id);

  const { data, error } = await query;
  if (error) throw error;
  return data as BookingDetail[];
}

export async function approveBooking(bookingId: string): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'approved' as BookingStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  await triggerN8nWebhook('booking-approved', data);
  return data as Booking;
}

export async function rejectBooking(bookingId: string, reason: string): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'rejected' as BookingStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;

  await triggerN8nWebhook('booking-rejected', data);
  return data as Booking;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' as BookingStatus })
    .eq('id', bookingId);

  if (error) throw error;
}

// ─── Safety Acknowledgements ──────────────────────────────────────────────────

export async function acknowledgeSafety(machineId: string): Promise<SafetyAcknowledgement> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('safety_acknowledgements')
    .upsert(
      { user_id: user.id, machine_id: machineId, sop_version: '1.0' },
      { onConflict: 'user_id,machine_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as SafetyAcknowledgement;
}

export async function getUserSafetyAcknowledgements(): Promise<SafetyAcknowledgement[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('safety_acknowledgements')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data as SafetyAcknowledgement[];
}

export async function checkSafetyAcknowledgement(machineId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('safety_acknowledgements')
    .select('id')
    .eq('user_id', user.id)
    .eq('machine_id', machineId)
    .maybeSingle();

  return !!data;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc('get_admin_stats');
  if (error) throw error;
  return data as AdminStats;
}

export async function getWeeklyUsage(): Promise<WeeklyUsage[]> {
  const { data, error } = await supabase.rpc('get_weekly_usage');
  if (error) throw error;
  return (data ?? []) as WeeklyUsage[];
}

export async function getMachineUtilization(): Promise<MachineUtilization[]> {
  const { data, error } = await supabase.rpc('get_machine_utilization');
  if (error) throw error;
  return (data ?? []) as MachineUtilization[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getUserNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

// ─── N8N Webhook Trigger ──────────────────────────────────────────────────────

async function triggerN8nWebhook(event: string, payload: unknown): Promise<void> {
  const baseUrl = import.meta.env.VITE_N8N_WEBHOOK_BASE_URL;
  if (!baseUrl) {
    console.warn(`n8n webhook not configured. Skipping event: ${event}`);
    return;
  }

  try {
    await fetch(`${baseUrl}/${event}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error(`Failed to trigger n8n webhook (${event}):`, err);
  }
}
