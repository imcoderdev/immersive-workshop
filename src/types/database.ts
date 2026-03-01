// Database types matching Supabase schema
// Only 3 active roles: student, faculty, admin
export type UserRole = 'student' | 'faculty' | 'admin';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'not_completed';
export type MachineStatus = 'available' | 'reserved' | 'busy' | 'maintenance';
export type HotspotType = 'machine_info' | 'safety' | 'booking' | 'navigation';
export type WorkType = 'first_year_practical' | 'team_project' | 'final_year_project' | 'academic_event' | 'other';
export type RawMaterialSource = 'workshop_provided' | 'self_purchased';
export type UtilizationStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'not_completed';
export type ResourceType = 'machine' | 'tool' | 'device' | 'shop';
export type ResourceStatus = 'active' | 'maintenance_required' | 'inactive';
export type SafetyType = 'shop' | 'machine' | 'tool';
export type ToolIssueStatus = 'pending' | 'approved' | 'issued' | 'returned' | 'rejected';
export type StudentBranch =
  | 'computer_engineering' | 'information_technology' | 'electronics_telecom'
  | 'ai_data_science' | 'cs_design' | 'electrical_engineering'
  | 'robotics_automation' | 'mechanical_engineering' | 'civil_engineering'
  | 'chemical_engineering';
export type TeamName = 'TBR' | 'TBQ' | 'Nikola' | 'Nemesis' | 'other';

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
  roll_number: string | null;
  branch: StudentBranch | null;
  year: number | null;
  division: string | null;
  batch: string | null;
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
  total_tools: number;
  total_shops: number;
  active_users: number;
  bookings_today: number;
  pending_approvals: number;
  pending_tool_issues: number;
  approved_today: number;
  utilization_rate: number;
  maintenance_due: number;
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

// ─── Resource Types (unified machines/tools/devices/shops) ────────────────────

export interface Resource {
  id: string;
  name: string;
  resource_type: ResourceType;
  shop_name: string | null;
  quantity: number | null;
  supervisor_id: string | null;
  maintenance_interval_days: number | null;
  last_maintenance_date: string | null;
  buffer_minutes: number;
  status: ResourceStatus;
  description: string | null;
  workshop_id: string | null;
  technical_specs: Record<string, string>;
  images: string[];
  safety_video_url: string | null;
  audio_explanation_url: string | null;
  sop_pdf_url: string | null;
  is_bookable: boolean;
  max_booking_hours: number;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceDetail extends Resource {
  supervisor_name: string | null;
  supervisor_email: string | null;
  next_maintenance_due: string | null;
}

// ─── Safety Module Types ─────────────────────────────────────────────────────

export interface SafetyModule {
  id: string;
  title: string;
  safety_type: SafetyType;
  resource_id: string | null;
  shop_name: string | null;
  audio_url: string;
  audio_duration_seconds: number;
  validity_days: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SafetyModuleAcknowledgement {
  id: string;
  user_id: string;
  safety_module_id: string;
  acknowledged_at: string;
  expires_at: string;
  playback_duration_verified: boolean;
  playback_started_at: string | null;
  playback_ended_at: string | null;
  created_at: string;
}

// ─── Practical Session Types ─────────────────────────────────────────────────

export interface PracticalSession {
  id: string;
  shop_resource_id: string;
  faculty_id: string;
  division: string;
  batch: string;
  topic: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  active_status: boolean;
  created_at: string;
}

export interface PracticalSessionDetail extends PracticalSession {
  shop_name: string;
  shop_label: string | null;
  faculty_name: string;
  faculty_email: string;
  attendance_count: number;
}

export interface PracticalAttendance {
  id: string;
  session_id: string;
  user_id: string;
  timestamp: string;
  optional_comment: string | null;
}

// ─── Tool Issue Types ────────────────────────────────────────────────────────

export interface ToolIssueRequest {
  id: string;
  user_id: string;
  resource_id: string;
  quantity_requested: number;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  issue_time: string | null;
  return_time: string | null;
  condition_on_return: string | null;
  status: ToolIssueStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolIssueDetail extends ToolIssueRequest {
  user_name: string;
  user_email: string;
  user_department: string | null;
  resource_name: string;
  resource_type: ResourceType;
  shop_name: string | null;
  resource_quantity: number | null;
  approver_name: string | null;
}

/** Booking status → badge colour */
export function statusColor(status: BookingStatus): string {
  switch (status) {
    case 'pending': return 'bg-warning/15 text-warning';
    case 'approved': return 'bg-success/15 text-success';
    case 'rejected': return 'bg-destructive/15 text-destructive';
    case 'completed': return 'bg-primary/15 text-primary';
    case 'not_completed': return 'bg-orange-500/15 text-orange-400';
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
  roll_number: string | null;
  branch: StudentBranch | null;
  year: number | null;
  division: string | null;
  batch: string | null;
  team_name: TeamName | null;
  team_name_other: string | null;
  permission_letter_url: string | null;
  not_completed_reason: string | null;
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
    case 'not_completed': return 'bg-orange-500/15 text-orange-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  first_year_practical: 'First Year Practical',
  team_project: 'Team Project',
  final_year_project: 'Final Year Project',
  academic_event: 'Academic Event / Mini Project',
  other: 'Other',
};

export const RAW_MATERIAL_LABELS: Record<RawMaterialSource, string> = {
  workshop_provided: 'Workshop Provided',
  self_purchased: 'Self Purchased',
};

export const BRANCH_LABELS: Record<StudentBranch, string> = {
  computer_engineering: 'Computer Engineering',
  information_technology: 'Information Technology',
  electronics_telecom: 'Electronics & Telecommunication Engineering',
  ai_data_science: 'Artificial Intelligence & Data Science',
  cs_design: 'Computer Science & Design',
  electrical_engineering: 'Electrical Engineering',
  robotics_automation: 'Robotics & Automation',
  mechanical_engineering: 'Mechanical Engineering',
  civil_engineering: 'Civil Engineering',
  chemical_engineering: 'Chemical Engineering',
};

export const TEAM_LABELS: Record<TeamName, string> = {
  TBR: 'TBR',
  TBQ: 'TBQ',
  Nikola: 'Nikola',
  Nemesis: 'Nemesis',
  other: 'Other',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  machine: 'Machine',
  tool: 'Tool',
  device: 'Device',
  shop: 'Shop',
};

export const RESOURCE_STATUS_LABELS: Record<ResourceStatus, string> = {
  active: 'Active',
  maintenance_required: 'Maintenance Required',
  inactive: 'Inactive',
};

export const TOOL_ISSUE_STATUS_LABELS: Record<ToolIssueStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  issued: 'Issued',
  returned: 'Returned',
  rejected: 'Rejected',
};

export function toolIssueStatusColor(status: ToolIssueStatus): string {
  switch (status) {
    case 'pending': return 'bg-warning/15 text-warning';
    case 'approved': return 'bg-blue-500/15 text-blue-400';
    case 'issued': return 'bg-success/15 text-success';
    case 'returned': return 'bg-primary/15 text-primary';
    case 'rejected': return 'bg-destructive/15 text-destructive';
    default: return 'bg-muted text-muted-foreground';
  }
}

/** Predefined machine catalog — admin picks from these when adding a machine */
export const MACHINE_CATALOG = [
  'CNC',
  'VMC',
  '3D Printer Small',
  '3D Printer Big (JAK)',
  'CO2 Laser Cutting Machine',
  'Plasma Machine',
  'CNC Wood Router',
  'TIG Welding Machine',
  'MIG Welding Machine',
  'Band Saw Machine',
  'New 3D Printer at Asst. W/S Cabin',
] as const;

export type CatalogMachineName = (typeof MACHINE_CATALOG)[number];
