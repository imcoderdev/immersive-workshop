import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Cpu,
  Calendar,
  TrendingUp,
  Activity,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  BookOpen,
  Wrench,
  Filter,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  UserCog,
  Package,
  ShieldAlert,
  AlertTriangle,
  Volume2,
} from 'lucide-react';
import { getAdminStats, getWeeklyUsage, getMachineUtilization } from '@/services/booking-service';
import { getAllProfiles, getPendingTeachers, approveTeacher, rejectTeacher, updateUserRole } from '@/services/auth-service';
import { getAllMachines, createMachine, updateMachine, deleteMachine } from '@/services/workshop-service';
import { getAllUtilizationRequests } from '@/services/utilization-service';
import { getAllResources, createResource, updateResource, deleteResource, getMaintenanceDueResources, markMaintenanceDone } from '@/services/resource-service';
import { getAllSafetyModules, createSafetyModule, updateSafetyModule, deleteSafetyModule } from '@/services/safety-service';
import { getAllToolIssueRequests } from '@/services/tool-issue-service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import type { Machine, Profile, UserRole, UtilizationStatus, Resource, ResourceType, ResourceStatus, SafetyModule, SafetyType, ToolIssueDetail, ToolIssueStatus } from '@/types/database';
import { utilizationStatusColor, WORK_TYPE_LABELS, RAW_MATERIAL_LABELS, MACHINE_CATALOG, RESOURCE_TYPE_LABELS, RESOURCE_STATUS_LABELS, TOOL_ISSUE_STATUS_LABELS, toolIssueStatusColor } from '@/types/database';
import { useAuthStore } from '@/stores/auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// ─── Machine Form Modal ─────────────────────────────────────────────────────

interface MachineFormState {
  name: string;
  shop_type: string;
  description: string;
  max_booking_hours: number;
  status: Machine['status'];
  supervisor_id: string;
  department: string;
  is_bookable: boolean;
}

const defaultMachineForm: MachineFormState = {
  name: '',
  shop_type: '',
  description: '',
  max_booking_hours: 2,
  status: 'available',
  supervisor_id: '',
  department: '',
  is_bookable: true,
};

function MachineFormModal({
  open,
  onClose,
  machine,
  facultyList,
}: {
  open: boolean;
  onClose: () => void;
  machine: Machine | null;
  facultyList: Profile[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!machine;

  const [form, setForm] = useState<MachineFormState>({ ...defaultMachineForm });

  // Sync form state when modal opens or machine changes
  useEffect(() => {
    if (open) {
      setForm(
        machine
          ? {
              name: machine.name,
              shop_type: machine.shop_type ?? '',
              description: machine.description ?? '',
              max_booking_hours: machine.max_booking_hours,
              status: machine.status,
              supervisor_id: machine.supervisor_id ?? '',
              department: machine.department ?? '',
              is_bookable: machine.is_bookable,
            }
          : { ...defaultMachineForm },
      );
    }
  }, [open, machine]);

  const createM = useMutation({
    mutationFn: (payload: Partial<Machine>) => createMachine(payload),
    onSuccess: () => {
      toast({ title: 'Machine created' });
      qc.invalidateQueries({ queryKey: ['all-machines'] });
      qc.invalidateQueries({ queryKey: ['machine-utilization'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateM = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Machine> }) => updateMachine(id, updates),
    onSuccess: () => {
      toast({ title: 'Machine updated' });
      qc.invalidateQueries({ queryKey: ['all-machines'] });
      qc.invalidateQueries({ queryKey: ['machine-utilization'] });
      onClose();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleSubmit = () => {
    if (!form.name) {
      toast({ title: 'Machine name is required', variant: 'destructive' });
      return;
    }
    const payload: Partial<Machine> = {
      name: form.name,
      shop_type: form.shop_type || null,
      description: form.description || null,
      max_booking_hours: form.max_booking_hours,
      status: form.status,
      supervisor_id: form.supervisor_id || null,
      department: form.department || null,
      is_bookable: form.is_bookable,
    };

    if (isEdit && machine) {
      updateM.mutate({ id: machine.id, updates: payload });
    } else {
      createM.mutate(payload);
    }
  };

  const isPending = createM.isPending || updateM.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Machine' : 'Add Machine'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update machine details and faculty assignment.' : 'Add a new machine from the catalog.'}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Name — from catalog or free-text for edit */}
          {isEdit ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name (from catalog)</label>
              <Select value={form.name} onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}>
                <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                <SelectContent className="z-[200]">
                  {MACHINE_CATALOG.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Shop Type</label>
              <Input value={form.shop_type} onChange={(e) => setForm((f) => ({ ...f, shop_type: e.target.value }))} placeholder="e.g. Machine Shop" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
              <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="e.g. Mechanical" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Booking Hours</label>
              <Input type="number" min={1} max={24} value={form.max_booking_hours} onChange={(e) => setForm((f) => ({ ...f, max_booking_hours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v: Machine['status']) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign Faculty (Supervisor)</label>
            <Select value={form.supervisor_id || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, supervisor_id: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="__none__">None</SelectItem>
                {facultyList.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.full_name} ({f.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_bookable}
              onChange={(e) => setForm((f) => ({ ...f, is_bookable: e.target.checked }))}
              className="accent-primary"
            />
            Bookable by students
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Update Machine' : 'Add Machine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Admin Dashboard ────────────────────────────────────────────────────

// ─── Resource Form Modal ─────────────────────────────────────────────────────

interface ResourceFormState {
  name: string;
  resource_type: ResourceType;
  shop_name: string;
  quantity: string;
  supervisor_id: string;
  maintenance_interval_days: string;
  status: ResourceStatus;
  description: string;
  department: string;
  is_bookable: boolean;
  max_booking_hours: number;
}

const defaultResourceForm: ResourceFormState = {
  name: '',
  resource_type: 'tool',
  shop_name: '',
  quantity: '1',
  supervisor_id: '',
  maintenance_interval_days: '',
  status: 'active',
  description: '',
  department: '',
  is_bookable: false,
  max_booking_hours: 2,
};

function ResourceFormModal({
  open,
  onClose,
  resource,
  facultyList,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  resource: Resource | null;
  facultyList: Profile[];
  onSubmit: (payload: Partial<Resource>, isEdit: boolean, id?: string) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const isEdit = !!resource;
  const [form, setForm] = useState<ResourceFormState>({ ...defaultResourceForm });

  useEffect(() => {
    if (open) {
      setForm(
        resource
          ? {
              name: resource.name,
              resource_type: resource.resource_type,
              shop_name: resource.shop_name ?? '',
              quantity: String(resource.quantity ?? ''),
              supervisor_id: resource.supervisor_id ?? '',
              maintenance_interval_days: String(resource.maintenance_interval_days ?? ''),
              status: resource.status,
              description: resource.description ?? '',
              department: resource.department ?? '',
              is_bookable: resource.is_bookable,
              max_booking_hours: resource.max_booking_hours,
            }
          : { ...defaultResourceForm },
      );
    }
  }, [open, resource]);

  const handleSubmit = () => {
    if (!form.name) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const payload: Partial<Resource> = {
      name: form.name,
      resource_type: form.resource_type,
      shop_name: form.shop_name || null,
      quantity: form.quantity ? Number(form.quantity) : null,
      supervisor_id: form.supervisor_id || null,
      maintenance_interval_days: form.maintenance_interval_days ? Number(form.maintenance_interval_days) : null,
      status: form.status,
      description: form.description || null,
      department: form.department || null,
      is_bookable: form.is_bookable,
      max_booking_hours: form.max_booking_hours,
    };
    onSubmit(payload, isEdit, resource?.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update resource details.' : 'Register a new tool, device, or shop.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <Select value={form.resource_type} onValueChange={(v: ResourceType) => setForm((f) => ({ ...f, resource_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200]">
                  {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Shop Name</label>
              <Input value={form.shop_name} onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))} placeholder="e.g. Machine Shop" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</label>
              <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Department</label>
              <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Maintenance Interval (days)</label>
              <Input type="number" min={0} value={form.maintenance_interval_days} onChange={(e) => setForm((f) => ({ ...f, maintenance_interval_days: e.target.value }))} placeholder="e.g. 30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={form.status} onValueChange={(v: ResourceStatus) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200]">
                  {(Object.entries(RESOURCE_STATUS_LABELS) as [ResourceStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Booking Hours</label>
              <Input type="number" min={1} max={24} value={form.max_booking_hours} onChange={(e) => setForm((f) => ({ ...f, max_booking_hours: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign Faculty (Supervisor)</label>
            <Select value={form.supervisor_id || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, supervisor_id: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="__none__">None</SelectItem>
                {facultyList.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.full_name} ({f.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_bookable} onChange={(e) => setForm((f) => ({ ...f, is_bookable: e.target.checked }))} className="accent-primary" />
            Bookable by students
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? 'Saving…' : isEdit ? 'Update Resource' : 'Add Resource'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Safety Form Modal ───────────────────────────────────────────────────────

interface SafetyFormState {
  title: string;
  safety_type: SafetyType;
  resource_id: string;
  shop_name: string;
  audio_url: string;
  audio_duration_seconds: string;
  validity_days: string;
  active: boolean;
}

const defaultSafetyForm: SafetyFormState = {
  title: '',
  safety_type: 'shop',
  resource_id: '',
  shop_name: '',
  audio_url: '',
  audio_duration_seconds: '60',
  validity_days: '30',
  active: true,
};

function SafetyFormModal({
  open,
  onClose,
  module,
  resources,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  module: SafetyModule | null;
  resources: Resource[];
  onSubmit: (payload: Partial<SafetyModule>, isEdit: boolean, id?: string) => void;
  isPending: boolean;
}) {
  const { toast } = useToast();
  const isEdit = !!module;
  const [form, setForm] = useState<SafetyFormState>({ ...defaultSafetyForm });

  useEffect(() => {
    if (open) {
      setForm(
        module
          ? {
              title: module.title,
              safety_type: module.safety_type,
              resource_id: module.resource_id ?? '',
              shop_name: module.shop_name ?? '',
              audio_url: module.audio_url,
              audio_duration_seconds: String(module.audio_duration_seconds),
              validity_days: String(module.validity_days),
              active: module.active,
            }
          : { ...defaultSafetyForm },
      );
    }
  }, [open, module]);

  const handleSubmit = () => {
    if (!form.title || !form.audio_url) {
      toast({ title: 'Title and audio URL are required', variant: 'destructive' });
      return;
    }
    const payload: Partial<SafetyModule> = {
      title: form.title,
      safety_type: form.safety_type,
      resource_id: form.resource_id || null,
      shop_name: form.shop_name || null,
      audio_url: form.audio_url,
      audio_duration_seconds: Number(form.audio_duration_seconds) || 60,
      validity_days: Number(form.validity_days) || 30,
      active: form.active,
    };
    onSubmit(payload, isEdit, module?.id);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Safety Module' : 'Add Safety Module'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update safety module details.' : 'Create a new audio safety module.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Machine Shop General Safety" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Safety Type</label>
              <Select value={form.safety_type} onValueChange={(v: SafetyType) => setForm((f) => ({ ...f, safety_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="shop">Shop</SelectItem>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Shop Name</label>
              <Input value={form.shop_name} onChange={(e) => setForm((f) => ({ ...f, shop_name: e.target.value }))} placeholder="e.g. Machine Shop" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Linked Resource (optional)</label>
            <Select value={form.resource_id || '__none__'} onValueChange={(v) => setForm((f) => ({ ...f, resource_id: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="__none__">None</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name} ({RESOURCE_TYPE_LABELS[r.resource_type]})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Audio URL</label>
            <Input value={form.audio_url} onChange={(e) => setForm((f) => ({ ...f, audio_url: e.target.value }))} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Audio Duration (sec)</label>
              <Input type="number" min={1} value={form.audio_duration_seconds} onChange={(e) => setForm((f) => ({ ...f, audio_duration_seconds: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Validity (days)</label>
              <Input type="number" min={1} value={form.validity_days} onChange={(e) => setForm((f) => ({ ...f, validity_days: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="accent-primary" />
            Active
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>{isPending ? 'Saving…' : isEdit ? 'Update Module' : 'Add Module'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { profile: myProfile } = useAuthStore();
  const queryClient = useQueryClient();

  // State
  const [utilFilterStatus, setUtilFilterStatus] = useState<string>('all');
  const [utilFilterDate, setUtilFilterDate] = useState('');
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineSearch, setMachineSearch] = useState('');
  // New state for resource/safety/tool tabs
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [editingSafety, setEditingSafety] = useState<SafetyModule | null>(null);
  const [toolIssueStatusFilter, setToolIssueStatusFilter] = useState<string>('all');

  // ─ Queries ──────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });
  const { data: weeklyUsage = [] } = useQuery({ queryKey: ['weekly-usage'], queryFn: getWeeklyUsage });
  const { data: machineUtil = [] } = useQuery({ queryKey: ['machine-utilization'], queryFn: getMachineUtilization });
  const { data: profiles = [] } = useQuery({ queryKey: ['all-profiles'], queryFn: getAllProfiles });
  const { data: machines = [] } = useQuery({ queryKey: ['all-machines'], queryFn: getAllMachines });
  const { data: pendingTeachers = [] } = useQuery({ queryKey: ['pending-teachers'], queryFn: getPendingTeachers });
  const { data: allUtilRequests = [] } = useQuery({ queryKey: ['admin-utilization'], queryFn: () => getAllUtilizationRequests() });
  const { data: allResources = [] } = useQuery({ queryKey: ['resources'], queryFn: getAllResources });
  const { data: allSafetyModules = [] } = useQuery({ queryKey: ['safety-modules'], queryFn: getAllSafetyModules });
  const { data: allToolIssues = [] } = useQuery({ queryKey: ['tool-issues'], queryFn: () => getAllToolIssueRequests() });
  const { data: maintenanceDue = [] } = useQuery({ queryKey: ['maintenance-due'], queryFn: getMaintenanceDueResources });

  const facultyList = useMemo(() => profiles.filter((p) => p.role === 'faculty'), [profiles]);

  // Faculty lookup map for display
  const facultyMap = useMemo(() => {
    const map = new Map<string, string>();
    profiles.forEach((p) => { if (p.role === 'faculty') map.set(p.id, p.full_name); });
    return map;
  }, [profiles]);

  // Filtered utilization requests
  const filteredUtil = allUtilRequests
    .filter((r) => utilFilterStatus === 'all' || r.status === utilFilterStatus)
    .filter((r) => !utilFilterDate || r.date === utilFilterDate);

  // Filtered machines for table
  const filteredMachines = machines.filter((m) =>
    !machineSearch || m.name.toLowerCase().includes(machineSearch.toLowerCase()) || (m.shop_type ?? '').toLowerCase().includes(machineSearch.toLowerCase()),
  );

  // Filtered resources
  const filteredResources = allResources
    .filter((r) => resourceTypeFilter === 'all' || r.resource_type === resourceTypeFilter)
    .filter((r) => !resourceSearch || r.name.toLowerCase().includes(resourceSearch.toLowerCase()) || (r.shop_name ?? '').toLowerCase().includes(resourceSearch.toLowerCase()));

  // Filtered tool issues
  const filteredToolIssues = allToolIssues.filter((t) => toolIssueStatusFilter === 'all' || t.status === toolIssueStatusFilter);

  // ─ Mutations ────────────────────────────────────────────────────────────────
  const approveM = useMutation({
    mutationFn: approveTeacher,
    onSuccess: () => { toast({ title: 'Teacher approved!' }); queryClient.invalidateQueries({ queryKey: ['pending-teachers'] }); queryClient.invalidateQueries({ queryKey: ['all-profiles'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectM = useMutation({
    mutationFn: rejectTeacher,
    onSuccess: () => { toast({ title: 'Teacher rejected' }); queryClient.invalidateQueries({ queryKey: ['pending-teachers'] }); queryClient.invalidateQueries({ queryKey: ['all-profiles'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteM = useMutation({
    mutationFn: deleteMachine,
    onSuccess: () => { toast({ title: 'Machine deleted' }); queryClient.invalidateQueries({ queryKey: ['all-machines'] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const roleM = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => updateUserRole(userId, role),
    onSuccess: () => { toast({ title: 'Role updated' }); queryClient.invalidateQueries({ queryKey: ['all-profiles'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ─ New mutations (resources, safety, maintenance) ───────────────────────────
  const createResourceM = useMutation({
    mutationFn: (payload: Partial<Resource>) => createResource(payload),
    onSuccess: () => { toast({ title: 'Resource created' }); queryClient.invalidateQueries({ queryKey: ['resources'] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); setResourceModalOpen(false); setEditingResource(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const updateResourceM = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Resource> }) => updateResource(id, updates),
    onSuccess: () => { toast({ title: 'Resource updated' }); queryClient.invalidateQueries({ queryKey: ['resources'] }); setResourceModalOpen(false); setEditingResource(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const deleteResourceM = useMutation({
    mutationFn: deleteResource,
    onSuccess: () => { toast({ title: 'Resource deleted' }); queryClient.invalidateQueries({ queryKey: ['resources'] }); queryClient.invalidateQueries({ queryKey: ['admin-stats'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const createSafetyM = useMutation({
    mutationFn: (payload: Partial<SafetyModule>) => createSafetyModule(payload),
    onSuccess: () => { toast({ title: 'Safety module created' }); queryClient.invalidateQueries({ queryKey: ['safety-modules'] }); setSafetyModalOpen(false); setEditingSafety(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const updateSafetyM = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SafetyModule> }) => updateSafetyModule(id, updates),
    onSuccess: () => { toast({ title: 'Safety module updated' }); queryClient.invalidateQueries({ queryKey: ['safety-modules'] }); setSafetyModalOpen(false); setEditingSafety(null); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const deleteSafetyM = useMutation({
    mutationFn: deleteSafetyModule,
    onSuccess: () => { toast({ title: 'Safety module deleted' }); queryClient.invalidateQueries({ queryKey: ['safety-modules'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
  const maintenanceDoneM = useMutation({
    mutationFn: markMaintenanceDone,
    onSuccess: () => { toast({ title: 'Maintenance marked done' }); queryClient.invalidateQueries({ queryKey: ['maintenance-due'] }); queryClient.invalidateQueries({ queryKey: ['resources'] }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // ─ Chart data ───────────────────────────────────────────────────────────────
  const maxUsage = Math.max(...weeklyUsage.map((d) => Number(d.bookings) || 0), 1);
  const chartData = weeklyUsage.map((d) => ({ day: d.day, value: Math.round((Number(d.bookings) / maxUsage) * 100) }));

  // ─ CSV Exports ──────────────────────────────────────────────────────────────
  const exportMachineCSV = () => {
    if (!machineUtil.length) return;
    const header = 'Machine,Total Bookings,Utilization %\n';
    const rows = machineUtil.map((m) => `"${m.name}",${m.total_bookings},${m.utilization}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'machine_utilization.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportUtilCSV = () => {
    if (!filteredUtil.length) return;
    const header = 'Student,Email,Department,Machine,Assigned Faculty,Work Type,Material,Date,Start,End,Duration (min),Status,Rejection Reason\n';
    const rows = filteredUtil
      .map((r) =>
        `"${r.user_name}","${r.user_email}","${r.user_department ?? ''}","${r.machine_name}","${r.supervisor_name ?? 'N/A'}","${WORK_TYPE_LABELS[r.work_type] ?? r.work_type}","${RAW_MATERIAL_LABELS[r.raw_material_source] ?? r.raw_material_source}","${r.date}","${r.start_time}","${r.end_time}",${r.duration_minutes},"${r.status}","${r.rejection_reason ?? ''}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'utilization_requests.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ─ Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Machine management, user roles, and utilization monitoring.</p>
          </div>
        </div>

        {/* ── Stats Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            { icon: Cpu, label: 'Total Machines', value: String(stats?.total_machines ?? machines.length) },
            { icon: Package, label: 'Tools / Devices', value: String(stats?.total_tools ?? allResources.filter((r) => r.resource_type === 'tool' || r.resource_type === 'device').length) },
            { icon: Users, label: 'Active Students', value: String(profiles.filter((p) => p.role === 'student').length) },
            { icon: Calendar, label: 'Bookings Today', value: String(stats?.bookings_today ?? '-') },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: 'Pending Requests', value: String(allUtilRequests.filter((r) => r.status === 'pending').length) },
            { icon: ShieldAlert, label: 'Pending Tool Issues', value: String(stats?.pending_tool_issues ?? allToolIssues.filter((t) => t.status === 'pending').length) },
            { icon: AlertTriangle, label: 'Maintenance Due', value: String(stats?.maintenance_due ?? maintenanceDue.length) },
            { icon: ShieldCheck, label: 'Safety Modules', value: String(allSafetyModules.length) },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Teacher Approvals ────────────────────────────────────────────── */}
        {pendingTeachers.length > 0 && (
          <div className="glass-panel rounded-xl p-6 mb-6 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-5">
              <UserCheck className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-semibold">Teacher Registrations ({pendingTeachers.length})</h2>
            </div>
            <div className="space-y-3">
              {pendingTeachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{teacher.full_name}</div>
                      <div className="text-xs text-muted-foreground">{teacher.email}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />Registered {format(new Date(teacher.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveM.mutate(teacher.id)} disabled={approveM.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => rejectM.mutate(teacher.id)} disabled={rejectM.isPending}>
                      <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="machines" className="space-y-6">
          <TabsList className="bg-muted/30 border border-border/30 flex-wrap h-auto">
            <TabsTrigger value="machines"><Cpu className="h-4 w-4 mr-1.5" />Machines</TabsTrigger>
            <TabsTrigger value="resources"><Package className="h-4 w-4 mr-1.5" />Resources</TabsTrigger>
            <TabsTrigger value="safety"><ShieldAlert className="h-4 w-4 mr-1.5" />Safety</TabsTrigger>
            <TabsTrigger value="tool_issues">
              <Wrench className="h-4 w-4 mr-1.5" />Tool Issues
              {allToolIssues.filter((t) => t.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{allToolIssues.filter((t) => t.status === 'pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance">
              <AlertTriangle className="h-4 w-4 mr-1.5" />Maintenance
              {maintenanceDue.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">{maintenanceDue.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users"><UserCog className="h-4 w-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="utilization"><Wrench className="h-4 w-4 mr-1.5" />Utilization</TabsTrigger>
            <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1.5" />Analytics</TabsTrigger>
          </TabsList>

          {/* ═══════════════ MACHINES TAB ═══════════════ */}
          <TabsContent value="machines">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-base font-semibold">Machine Management ({machines.length})</h2>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search machines…"
                    value={machineSearch}
                    onChange={(e) => setMachineSearch(e.target.value)}
                    className="w-48 h-8 text-xs"
                  />
                  <Button size="sm" onClick={() => { setEditingMachine(null); setMachineModalOpen(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Machine
                  </Button>
                </div>
              </div>

              {filteredMachines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No machines found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Shop Type</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Assigned Faculty</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Bookable</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMachines.map((m) => (
                        <tr key={m.id} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2.5 px-3 font-medium text-xs">{m.name}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{m.shop_type ?? '—'}</td>
                          <td className="py-2.5 px-3 text-xs">{m.supervisor_id ? facultyMap.get(m.supervisor_id) ?? 'Unknown' : <span className="text-muted-foreground">Unassigned</span>}</td>
                          <td className="py-2.5 px-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', m.status === 'available' ? 'bg-success/15 text-success' : m.status === 'maintenance' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning')}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs">{m.is_bookable ? 'Yes' : 'No'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingMachine(m); setMachineModalOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete "${m.name}"?`)) deleteM.mutate(m.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <MachineFormModal
              open={machineModalOpen}
              onClose={() => { setMachineModalOpen(false); setEditingMachine(null); }}
              machine={editingMachine}
              facultyList={facultyList}
            />
          </TabsContent>

          {/* ═══════════════ RESOURCES TAB ═══════════════ */}
          <TabsContent value="resources">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-base font-semibold">Resource Management ({filteredResources.length})</h2>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search resources…" value={resourceSearch} onChange={(e) => setResourceSearch(e.target.value)} className="w-48 h-8 text-xs" />
                  <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="all">All Types</SelectItem>
                      {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => { setEditingResource(null); setResourceModalOpen(true); }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Resource
                  </Button>
                </div>
              </div>

              {filteredResources.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No resources found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Shop</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Qty</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Supervisor</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResources.map((r) => (
                        <tr key={r.id} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2.5 px-3 font-medium text-xs">{r.name}</td>
                          <td className="py-2.5 px-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">{RESOURCE_TYPE_LABELS[r.resource_type]}</span></td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{r.shop_name ?? '—'}</td>
                          <td className="py-2.5 px-3 text-xs">{r.quantity ?? '—'}</td>
                          <td className="py-2.5 px-3 text-xs">{r.supervisor_id ? facultyMap.get(r.supervisor_id) ?? 'Unknown' : <span className="text-muted-foreground">Unassigned</span>}</td>
                          <td className="py-2.5 px-3"><span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', r.status === 'active' ? 'bg-success/15 text-success' : r.status === 'maintenance_required' ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground')}>{RESOURCE_STATUS_LABELS[r.status]}</span></td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditingResource(r); setResourceModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete "${r.name}"?`)) deleteResourceM.mutate(r.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── Resource Form Modal ─── */}
            <ResourceFormModal
              open={resourceModalOpen}
              onClose={() => { setResourceModalOpen(false); setEditingResource(null); }}
              resource={editingResource}
              facultyList={facultyList}
              onSubmit={(payload, isEdit, id) => {
                if (isEdit && id) {
                  updateResourceM.mutate({ id, updates: payload });
                } else {
                  createResourceM.mutate(payload);
                }
              }}
              isPending={createResourceM.isPending || updateResourceM.isPending}
            />
          </TabsContent>

          {/* ═══════════════ SAFETY TAB ═══════════════ */}
          <TabsContent value="safety">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-base font-semibold">Safety Module Management ({allSafetyModules.length})</h2>
                <Button size="sm" onClick={() => { setEditingSafety(null); setSafetyModalOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Add Module
                </Button>
              </div>

              {allSafetyModules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No safety modules configured.</p>
              ) : (
                <div className="space-y-3">
                  {allSafetyModules.map((mod) => (
                    <div key={mod.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', mod.active ? 'bg-success/15' : 'bg-muted/30')}>
                          <Volume2 className={cn('h-4 w-4', mod.active ? 'text-success' : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{mod.title}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="capitalize">{mod.safety_type} safety</span>
                            <span>·</span>
                            <span>{mod.audio_duration_seconds}s audio</span>
                            <span>·</span>
                            <span>Valid {mod.validity_days} days</span>
                            {mod.shop_name && <><span>·</span><span>Shop: {mod.shop_name}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', mod.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                          {mod.active ? 'Active' : 'Inactive'}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => { setEditingSafety(mod); setSafetyModalOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Delete "${mod.title}"?`)) deleteSafetyM.mutate(mod.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Safety Form Modal ─── */}
            <SafetyFormModal
              open={safetyModalOpen}
              onClose={() => { setSafetyModalOpen(false); setEditingSafety(null); }}
              module={editingSafety}
              resources={allResources}
              onSubmit={(payload, isEdit, id) => {
                if (isEdit && id) {
                  updateSafetyM.mutate({ id, updates: payload });
                } else {
                  createSafetyM.mutate(payload);
                }
              }}
              isPending={createSafetyM.isPending || updateSafetyM.isPending}
            />
          </TabsContent>

          {/* ═══════════════ TOOL ISSUES TAB ═══════════════ */}
          <TabsContent value="tool_issues">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <h2 className="text-base font-semibold">Tool Issue Requests ({filteredToolIssues.length})</h2>
                <Select value={toolIssueStatusFilter} onValueChange={setToolIssueStatusFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="all">All statuses</SelectItem>
                    {(Object.entries(TOOL_ISSUE_STATUS_LABELS) as [ToolIssueStatus, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filteredToolIssues.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tool issue requests found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Student</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Resource</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Qty</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Requested</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Issued</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Returned</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredToolIssues.slice(0, 100).map((t) => (
                        <tr key={t.id} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-xs">{t.user_name}</div>
                            <div className="text-xs text-muted-foreground">{t.user_department ?? ''}</div>
                          </td>
                          <td className="py-2.5 px-3 text-xs">{t.resource_name}</td>
                          <td className="py-2.5 px-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">{RESOURCE_TYPE_LABELS[t.resource_type]}</span></td>
                          <td className="py-2.5 px-3 text-xs">{t.quantity_requested}</td>
                          <td className="py-2.5 px-3 text-xs">{format(new Date(t.requested_at), 'MMM d, HH:mm')}</td>
                          <td className="py-2.5 px-3 text-xs">{t.issue_time ? format(new Date(t.issue_time), 'MMM d, HH:mm') : '—'}</td>
                          <td className="py-2.5 px-3 text-xs">{t.return_time ? format(new Date(t.return_time), 'MMM d, HH:mm') : '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', toolIssueStatusColor(t.status))}>
                              {TOOL_ISSUE_STATUS_LABELS[t.status]}
                            </span>
                            {t.rejection_reason && <div className="text-xs text-destructive mt-0.5 max-w-[180px] truncate" title={t.rejection_reason}>{t.rejection_reason}</div>}
                            {t.condition_on_return && <div className="text-xs text-muted-foreground mt-0.5">Condition: {t.condition_on_return}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════ MAINTENANCE TAB ═══════════════ */}
          <TabsContent value="maintenance">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h2 className="text-base font-semibold">Maintenance Due ({maintenanceDue.length})</h2>
              </div>

              {maintenanceDue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No maintenance overdue. All resources are up to date.</p>
              ) : (
                <div className="space-y-3">
                  {maintenanceDue.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-amber-500/20">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
                          <Wrench className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{r.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="capitalize">{RESOURCE_TYPE_LABELS[r.resource_type]}</span>
                            {r.shop_name && <><span>·</span><span>{r.shop_name}</span></>}
                            <span>·</span>
                            <span>Last: {r.last_maintenance_date ? format(new Date(r.last_maintenance_date), 'MMM d, yyyy') : 'Never'}</span>
                            <span>·</span>
                            <span className="text-amber-400">Due: {r.next_maintenance_due ? format(new Date(r.next_maintenance_due), 'MMM d, yyyy') : '—'}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => maintenanceDoneM.mutate(r.id)} disabled={maintenanceDoneM.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Done
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════ USERS TAB ═══════════════ */}
          <TabsContent value="users">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold">User Management ({profiles.length})</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  <span>{profiles.filter((p) => p.role === 'admin').length} admins</span>
                  <span>·</span>
                  <span>{profiles.filter((p) => p.role === 'faculty').length} faculty</span>
                  <span>·</span>
                  <span>{profiles.filter((p) => p.role === 'student').length} students</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Name</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Department</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Joined</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Change Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => {
                      const isSelf = p.id === myProfile?.id;
                      return (
                        <tr key={p.id} className={cn('border-b border-border/10 hover:bg-muted/10', isSelf && 'bg-primary/5')}>
                          <td className="py-2.5 px-3 font-medium text-xs">
                            {p.full_name}
                            {isSelf && <span className="ml-1 text-muted-foreground">(you)</span>}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.email}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{p.department ?? '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', p.role === 'admin' ? 'bg-primary/15 text-primary' : p.role === 'faculty' ? 'bg-blue-500/15 text-blue-400' : 'bg-muted text-muted-foreground')}>
                              {p.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', p.is_approved ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning')}>
                              {p.is_approved ? 'Active' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                          <td className="py-2.5 px-3 text-right">
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <Select
                                value={p.role}
                                onValueChange={(v: UserRole) => roleM.mutate({ userId: p.id, role: v })}
                                disabled={roleM.isPending}
                              >
                                <SelectTrigger className="w-28 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[70]">
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="faculty">Faculty</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════ UTILIZATION TAB ═══════════════ */}
          <TabsContent value="utilization">
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  <h2 className="text-base font-semibold">Utilization Requests ({filteredUtil.length})</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={utilFilterStatus} onValueChange={setUtilFilterStatus}>
                    <SelectTrigger className="w-36 h-8 text-xs" aria-label="Filter by status">
                      <Filter className="h-3 w-3 mr-1" /><SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" value={utilFilterDate} onChange={(e) => setUtilFilterDate(e.target.value)} className="w-40 h-8 text-xs" aria-label="Filter by date" />
                  <Button variant="outline" size="sm" onClick={exportUtilCSV}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
                </div>
              </div>

              {filteredUtil.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No utilization requests found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Student</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Machine</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Assigned Faculty</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Work Type</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Time</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Duration</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUtil.slice(0, 100).map((r) => (
                        <tr key={r.id} className="border-b border-border/10 hover:bg-muted/10">
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-xs">{r.user_name}</div>
                            <div className="text-xs text-muted-foreground">{r.user_department ?? ''}</div>
                          </td>
                          <td className="py-2.5 px-3 text-xs">{r.machine_name}</td>
                          <td className="py-2.5 px-3 text-xs">{r.supervisor_name ?? <span className="text-muted-foreground">N/A</span>}</td>
                          <td className="py-2.5 px-3 text-xs">{WORK_TYPE_LABELS[r.work_type] ?? r.work_type}</td>
                          <td className="py-2.5 px-3 text-xs">{format(new Date(r.date), 'MMM d')}</td>
                          <td className="py-2.5 px-3 text-xs">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</td>
                          <td className="py-2.5 px-3 text-xs">{r.duration_minutes} min</td>
                          <td className="py-2.5 px-3">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', utilizationStatusColor(r.status))}>
                              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                            </span>
                            {r.rejection_reason && (
                              <div className="text-xs text-destructive mt-0.5 max-w-[180px] truncate" title={r.rejection_reason}>{r.rejection_reason}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════ ANALYTICS TAB ═══════════════ */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-panel rounded-xl p-6">
                <h2 className="text-base font-semibold mb-5">Weekly Usage (Last 7 Days)</h2>
                {chartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
                ) : (
                  <div className="flex items-end justify-between gap-2 h-40">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full relative" style={{ height: '120px' }}>
                          <div className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-primary to-secondary transition-all duration-500" style={{ height: `${d.value}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{d.day}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-panel rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold">Machine Utilization</h2>
                  <Button variant="outline" size="sm" onClick={exportMachineCSV}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
                </div>
                {machineUtil.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No machines found.</p>
                ) : (
                  <div className="space-y-4">
                    {machineUtil.map((machine) => {
                      const pct = Number(machine.utilization) || 0;
                      return (
                        <div key={machine.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium truncate pr-4">{machine.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{machine.total_bookings} requests</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
