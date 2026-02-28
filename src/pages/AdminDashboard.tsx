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
} from 'lucide-react';
import { getAdminStats, getWeeklyUsage, getMachineUtilization } from '@/services/booking-service';
import { getAllProfiles, getPendingTeachers, approveTeacher, rejectTeacher, updateUserRole } from '@/services/auth-service';
import { getAllMachines, createMachine, updateMachine, deleteMachine } from '@/services/workshop-service';
import { getAllUtilizationRequests } from '@/services/utilization-service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import type { Machine, Profile, UserRole, UtilizationStatus } from '@/types/database';
import { utilizationStatusColor, WORK_TYPE_LABELS, RAW_MATERIAL_LABELS, MACHINE_CATALOG } from '@/types/database';
import { useAuthStore } from '@/stores/auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  // ─ Queries ──────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats });
  const { data: weeklyUsage = [] } = useQuery({ queryKey: ['weekly-usage'], queryFn: getWeeklyUsage });
  const { data: machineUtil = [] } = useQuery({ queryKey: ['machine-utilization'], queryFn: getMachineUtilization });
  const { data: profiles = [] } = useQuery({ queryKey: ['all-profiles'], queryFn: getAllProfiles });
  const { data: machines = [] } = useQuery({ queryKey: ['all-machines'], queryFn: getAllMachines });
  const { data: pendingTeachers = [] } = useQuery({ queryKey: ['pending-teachers'], queryFn: getPendingTeachers });
  const { data: allUtilRequests = [] } = useQuery({ queryKey: ['admin-utilization'], queryFn: () => getAllUtilizationRequests() });

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Cpu, label: 'Total Machines', value: String(stats?.total_machines ?? machines.length) },
            { icon: Users, label: 'Active Students', value: String(profiles.filter((p) => p.role === 'student').length) },
            { icon: TrendingUp, label: 'Pending Requests', value: String(allUtilRequests.filter((r) => r.status === 'pending').length) },
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
          <TabsList className="bg-muted/30 border border-border/30">
            <TabsTrigger value="machines"><Cpu className="h-4 w-4 mr-1.5" />Machines</TabsTrigger>
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
                          <div className="text-xs text-muted-foreground mt-1">{machine.total_bookings} bookings</div>
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
