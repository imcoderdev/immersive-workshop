// Database types matching Supabase schema
export type UserRole = 'student' | 'faculty' | 'workshop_supervisor' | 'admin' | 'principal';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type MachineStatus = 'available' | 'reserved' | 'busy' | 'maintenance';
export type HotspotType = 'machine_info' | 'safety' | 'booking' | 'navigation';
export type WorkType = 'team_project' | 'final_year_project' | 'academic_event' | 'other';
export type RawMaterialSource = 'workshop_provided' | 'self_purchased';
export type UtilizationStatus = 'pending' | 'approved' | 'rejected' | 'completed';

/** Simplified hotspot category for CSS/UI usage */
export function hotspotCssType(type: HotspotType): string {
  switch (type) {
    case 'machine_info': return 'machine';
    case 'safety': return 'warning';
    case 'booking': return 'info';
    case 'navigation': return 'navigation';
    default: return 'info';
  }
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  department: string | null;
  phone: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Workshop {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  department: string | null;
  cover_image_url: string | null;
  welcome_audio_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Panorama {
  id: string;
  workshop_id: string;
  name: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Machine {
  id: string;
  workshop_id: string;
  name: string;
  description: string | null;
  technical_specs: Record<string, string>;
  images: string[];
  safety_video_url: string | null;
  audio_explanation_url: string | null;
  sop_pdf_url: string | null;
  status: MachineStatus;
  is_bookable: boolean;
  max_booking_hours: number;
  added_by: string | null;
  supervisor_id: string | null;
  department: string | null;
  shop_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hotspot {
  id: string;
  panorama_id: string;
  machine_id: string | null;
  target_panorama_id: string | null;
  type: HotspotType;
  label: string;
  description: string | null;
  pitch: number;
  yaw: number;
  icon: string;
  style: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  machine?: Machine;
}

export interface Booking {
  id: string;
  user_id: string;
  machine_id: string;
  workshop_id: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
  status: BookingStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingDetail extends Booking {
  user_name: string;
  user_email: string;
  user_department: string | null;
  machine_name: string;
  machine_status: MachineStatus;
  workshop_name: string;
  approver_name: string | null;
}

export interface SafetyAcknowledgement {
  id: string;
  user_id: string;
  machine_id: string;
  acknowledged_at: string;
  sop_version: string | null;
  ip_address: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminStats {
  total_machines: number;
  active_users: number;
  bookings_today: number;
  pending_approvals: number;
  approved_today: number;
  utilization_rate: number;
}

export interface WeeklyUsage {
  day: string;
  bookings: number;
}

export interface MachineUtilization {
  id: string;
  name: string;
  total_bookings: number;
  utilization: number;
}

/** Booking status → badge colour */
export function statusColor(status: BookingStatus): string {
  switch (status) {
    case 'pending': return 'bg-warning/15 text-warning';
    case 'approved': return 'bg-success/15 text-success';
    case 'rejected': return 'bg-destructive/15 text-destructive';
    case 'completed': return 'bg-primary/15 text-primary';
    case 'cancelled': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ─── Utilization Request Types ────────────────────────────────────────────────

export interface UtilizationRequest {
  id: string;
  user_id: string;
  machine_id: string;
  supervisor_id: string | null;
  work_type: WorkType;
  work_description: string | null;
  raw_material_source: RawMaterialSource;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  safety_acknowledged: boolean;
  status: UtilizationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UtilizationRequestDetail extends UtilizationRequest {
  user_name: string;
  user_email: string;
  user_department: string | null;
  user_phone: string | null;
  machine_name: string;
  machine_shop_type: string | null;
  machine_department: string | null;
  supervisor_name: string | null;
  supervisor_email: string | null;
}

export interface SupervisorUtilizationStats {
  total_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
}

/** Utilization status → badge colour */
export function utilizationStatusColor(status: UtilizationStatus): string {
  switch (status) {
    case 'pending': return 'bg-warning/15 text-warning';
    case 'approved': return 'bg-success/15 text-success';
    case 'rejected': return 'bg-destructive/15 text-destructive';
    case 'completed': return 'bg-primary/15 text-primary';
    default: return 'bg-muted text-muted-foreground';
  }
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  team_project: 'Team Project',
  final_year_project: 'Final Year Project',
  academic_event: 'Academic Event',
  other: 'Other',
};

export const RAW_MATERIAL_LABELS: Record<RawMaterialSource, string> = {
  workshop_provided: 'Workshop Provided',
  self_purchased: 'Self Purchased',
};
