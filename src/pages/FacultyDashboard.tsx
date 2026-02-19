import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Cpu,
  X,
} from 'lucide-react';
import { getAllBookings, approveBooking, rejectBooking } from '@/services/booking-service';
import { getWorkshops, getMachinesByWorkshop, createMachine, updateMachine, deleteMachine } from '@/services/workshop-service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { BookingDetail, Machine, MachineStatus } from '@/types/database';

type TabId = 'bookings' | 'machines';

interface MachineFormData {
  name: string;
  description: string;
  status: MachineStatus;
  is_bookable: boolean;
  max_booking_hours: number;
}

const DEFAULT_MACHINE: MachineFormData = {
  name: '',
  description: '',
  status: 'available',
  is_bookable: true,
  max_booking_hours: 2,
};

export default function FacultyDashboard() {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('bookings');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Machine management state
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [machineForm, setMachineForm] = useState<MachineFormData>(DEFAULT_MACHINE);

  // --- Data queries ---
  const { data: allBookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: () => getAllBookings(),
  });

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: getWorkshops,
  });

  const workshopId = workshops[0]?.id;

  const { data: machines = [] } = useQuery({
    queryKey: ['faculty-machines', workshopId],
    queryFn: () => getMachinesByWorkshop(workshopId!),
    enabled: !!workshopId,
  });

  // Filter to machines added by this faculty (or show all if admin)
  const myMachines = profile?.role === 'admin'
    ? machines
    : machines.filter((m) => m.added_by === profile?.id);

  const pendingBookings = allBookings.filter((b) => b.status === 'pending');
  const todayStr = new Date().toISOString().split('T')[0];
  const approvedToday = allBookings.filter((b) => b.status === 'approved' && b.date === todayStr);
  const uniqueStudents = new Set(allBookings.map((b) => b.user_id)).size;

  // --- Booking mutations ---
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveBooking(id),
    onSuccess: () => {
      toast({ title: 'Booking approved' });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectBooking(id, reason),
    onSuccess: () => {
      toast({ title: 'Booking rejected' });
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] });
      setRejectId(null);
      setRejectReason('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // --- Machine mutations ---
  const createMachineMutation = useMutation({
    mutationFn: (data: Partial<Machine>) => createMachine(data),
    onSuccess: () => {
      toast({ title: 'Machine added!' });
      queryClient.invalidateQueries({ queryKey: ['faculty-machines'] });
      closeMachineForm();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Machine> }) => updateMachine(id, data),
    onSuccess: () => {
      toast({ title: 'Machine updated!' });
      queryClient.invalidateQueries({ queryKey: ['faculty-machines'] });
      closeMachineForm();
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMachineMutation = useMutation({
    mutationFn: deleteMachine,
    onSuccess: () => {
      toast({ title: 'Machine deleted' });
      queryClient.invalidateQueries({ queryKey: ['faculty-machines'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleReject = (id: string) => {
    if (rejectId === id && rejectReason.trim()) {
      rejectMutation.mutate({ id, reason: rejectReason });
    } else {
      setRejectId(id);
    }
  };

  const openAddMachine = () => {
    setEditingMachine(null);
    setMachineForm(DEFAULT_MACHINE);
    setShowMachineForm(true);
  };

  const openEditMachine = (m: Machine) => {
    setEditingMachine(m);
    setMachineForm({
      name: m.name,
      description: m.description || '',
      status: m.status,
      is_bookable: m.is_bookable,
      max_booking_hours: m.max_booking_hours,
    });
    setShowMachineForm(true);
  };

  const closeMachineForm = () => {
    setShowMachineForm(false);
    setEditingMachine(null);
    setMachineForm(DEFAULT_MACHINE);
  };

  const handleSaveMachine = () => {
    if (!machineForm.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (editingMachine) {
      updateMachineMutation.mutate({ id: editingMachine.id, data: machineForm });
    } else {
      createMachineMutation.mutate({
        ...machineForm,
        workshop_id: workshopId,
        added_by: profile?.id,
        technical_specs: {},
        images: [],
      });
    }
  };

  const statusColors: Record<MachineStatus, string> = {
    available: 'bg-emerald-500/15 text-emerald-400',
    reserved: 'bg-amber-500/15 text-amber-400',
    busy: 'bg-red-500/15 text-red-400',
    maintenance: 'bg-gray-500/15 text-gray-400',
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Faculty Dashboard</h1>
          <p className="text-sm text-muted-foreground">Review bookings, manage your machines.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock, label: 'Pending Approvals', value: String(pendingBookings.length), color: 'bg-warning/10 text-warning' },
            { icon: CheckCircle2, label: 'Approved Today', value: String(approvedToday.length), color: 'bg-success/10 text-success' },
            { icon: Users, label: 'Active Students', value: String(uniqueStudents), color: 'bg-primary/10 text-primary' },
            { icon: Cpu, label: 'My Machines', value: String(myMachines.length), color: 'bg-secondary/10 text-secondary' },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-5">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center mb-3', stat.color.split(' ')[0])}>
                <stat.icon className={cn('h-4 w-4', stat.color.split(' ')[1])} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit mb-6">
          {([
            { id: 'bookings' as TabId, label: 'Bookings', count: pendingBookings.length },
            { id: 'machines' as TabId, label: 'My Machines', count: myMachines.length },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full text-xs px-1.5',
                  activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted/50'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Pending Approvals ({pendingBookings.length})</h2>
            </div>

            {pendingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No pending approvals.</p>
            ) : (
              <div className="space-y-4">
                {pendingBookings.map((request) => (
                  <div key={request.id} className="p-4 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{request.user_name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-medium">Pending</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">{request.machine_name}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(request.date), 'MMM d, yyyy')}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{request.start_time.slice(0, 5)} - {request.end_time.slice(0, 5)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 italic">"{request.purpose}"</p>

                        {rejectId === request.id && (
                          <div className="mt-3 flex gap-2">
                            <Input
                              placeholder="Reason for rejection..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="text-xs h-8"
                            />
                            <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)} disabled={!rejectReason.trim()}>
                              Confirm
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveMutation.mutate(request.id)} disabled={approveMutation.isPending}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReject(request.id)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">My Machines ({myMachines.length})</h2>
              <Button size="sm" onClick={openAddMachine} disabled={!workshopId}>
                <Plus className="h-4 w-4 mr-1" />Add Machine
              </Button>
            </div>

            {!workshopId && (
              <p className="text-sm text-muted-foreground text-center py-8">No workshop found. Ask admin to create one.</p>
            )}

            {workshopId && myMachines.length === 0 && !showMachineForm && (
              <p className="text-sm text-muted-foreground text-center py-8">You haven't added any machines yet.</p>
            )}

            {/* Machine Form (Add / Edit) */}
            {showMachineForm && (
              <div className="mb-6 p-5 rounded-xl bg-muted/20 border border-border/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{editingMachine ? 'Edit Machine' : 'Add New Machine'}</h3>
                  <button onClick={closeMachineForm} className="p-1 rounded hover:bg-white/10"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Machine Name *</Label>
                    <Input
                      value={machineForm.name}
                      onChange={(e) => setMachineForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. CNC Milling Machine"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={machineForm.status} onValueChange={(v) => setMachineForm((f) => ({ ...f, status: v as MachineStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={machineForm.description}
                      onChange={(e) => setMachineForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description of the machine"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Booking Hours</Label>
                    <Input
                      type="number"
                      min={1}
                      max={8}
                      value={machineForm.max_booking_hours}
                      onChange={(e) => setMachineForm((f) => ({ ...f, max_booking_hours: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="is-bookable"
                      checked={machineForm.is_bookable}
                      onChange={(e) => setMachineForm((f) => ({ ...f, is_bookable: e.target.checked }))}
                      className="h-4 w-4 rounded border-white/20"
                    />
                    <Label htmlFor="is-bookable" className="cursor-pointer">Allow student bookings</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveMachine} disabled={createMachineMutation.isPending || updateMachineMutation.isPending}>
                    {editingMachine ? 'Save Changes' : 'Add Machine'}
                  </Button>
                  <Button variant="outline" onClick={closeMachineForm}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Machine List */}
            {myMachines.length > 0 && (
              <div className="space-y-3">
                {myMachines.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Cpu className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{m.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[m.status])}>
                            {m.status}
                          </span>
                          {m.is_bookable && <span className="text-xs text-muted-foreground">Bookable · {m.max_booking_hours}h max</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditMachine(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${m.name}"?`)) deleteMachineMutation.mutate(m.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
