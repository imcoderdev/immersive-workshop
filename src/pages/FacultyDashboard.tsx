import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  BarChart3,
  Filter,
  Cpu,
  AlertTriangle,
  Loader2,
  Shield,
  Wrench,
  Package,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getSupervisorUtilizationRequests,
  getSupervisorStats,
  approveUtilizationRequest,
  rejectUtilizationRequest,
  completeUtilizationRequest,
  notCompleteUtilizationRequest,
} from '@/services/utilization-service';
import { getAllMachines } from '@/services/workshop-service';
import {
  getFacultyToolIssueRequests,
  approveToolIssueRequest,
  rejectToolIssueRequest,
  issueToolToStudent,
  returnTool,
} from '@/services/tool-issue-service';
import { getMaintenanceDueResources, markMaintenanceDone } from '@/services/resource-service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import type {
  UtilizationRequestDetail,
  UtilizationStatus,
  ToolIssueDetail,
} from '@/types/database';
import {
  utilizationStatusColor,
  WORK_TYPE_LABELS,
  RAW_MATERIAL_LABELS,
  toolIssueStatusColor,
  TOOL_ISSUE_STATUS_LABELS,
} from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'pending' | 'schedule' | 'machines' | 'tool_issues' | 'maintenance';

const STATUS_ICON: Record<UtilizationStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  completed: BarChart3,
  not_completed: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-400',
  reserved: 'bg-amber-500/15 text-amber-400',
  busy: 'bg-red-500/15 text-red-400',
  maintenance: 'bg-gray-500/15 text-gray-400',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FacultyDashboard() {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['supervisor-stats'],
    queryFn: getSupervisorStats,
  });

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['supervisor-utilization'],
    queryFn: () => getSupervisorUtilizationRequests(),
  });

  const { data: allMachines = [] } = useQuery({
    queryKey: ['all-machines'],
    queryFn: getAllMachines,
  });

  // Tool issue requests for resources supervised by this faculty
  const { data: toolIssueRequests = [] } = useQuery({
    queryKey: ['faculty-tool-issues'],
    queryFn: getFacultyToolIssueRequests,
  });

  // Maintenance due resources
  const { data: maintenanceDue = [] } = useQuery({
    queryKey: ['maintenance-due'],
    queryFn: getMaintenanceDueResources,
  });

  const pendingToolIssues = toolIssueRequests.filter((t) => t.status === 'pending');

  // Machines assigned to this faculty (supervisor_id = me)
  const myMachines = allMachines.filter(
    (m) => m.supervisor_id === profile?.id,
  );

  // Derived lists
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySchedule = allRequests.filter(
    (r) => r.date === todayStr && (r.status === 'approved' || r.status === 'pending'),
  );
  const machineNames = [...new Set(allRequests.map((r) => r.machine_name))];

  // Filtered view for the active tab
  const filteredRequests = allRequests
    .filter((r) => {
      if (activeTab === 'pending') return r.status === 'pending';
      if (activeTab === 'schedule')
        return r.date === todayStr && r.status !== 'rejected';
      return true;
    })
    .filter((r) => {
      if (filterMachine && filterMachine !== 'all')
        return r.machine_name === filterMachine;
      return true;
    })
    .filter((r) => {
      if (filterDate) return r.date === filterDate;
      return true;
    });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const approveMut = useMutation({
    mutationFn: approveUtilizationRequest,
    onSuccess: () => {
      toast({ title: 'Request approved' });
      queryClient.invalidateQueries({ queryKey: ['supervisor-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectUtilizationRequest(id, reason),
    onSuccess: () => {
      toast({ title: 'Request rejected' });
      queryClient.invalidateQueries({ queryKey: ['supervisor-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
      setRejectId(null);
      setRejectReason('');
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const completeMut = useMutation({
    mutationFn: completeUtilizationRequest,
    onSuccess: () => {
      toast({ title: 'Marked as completed' });
      queryClient.invalidateQueries({ queryKey: ['supervisor-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const notCompleteMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      notCompleteUtilizationRequest(id, reason),
    onSuccess: () => {
      toast({ title: 'Marked as not completed' });
      queryClient.invalidateQueries({ queryKey: ['supervisor-utilization'] });
      queryClient.invalidateQueries({ queryKey: ['supervisor-stats'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Tool issue mutations
  const approveToolMut = useMutation({
    mutationFn: approveToolIssueRequest,
    onSuccess: () => {
      toast({ title: 'Tool request approved' });
      queryClient.invalidateQueries({ queryKey: ['faculty-tool-issues'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const [toolRejectId, setToolRejectId] = useState<string | null>(null);
  const [toolRejectReason, setToolRejectReason] = useState('');

  const rejectToolMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectToolIssueRequest(id, reason),
    onSuccess: () => {
      toast({ title: 'Tool request rejected' });
      queryClient.invalidateQueries({ queryKey: ['faculty-tool-issues'] });
      setToolRejectId(null);
      setToolRejectReason('');
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const issueToolMut = useMutation({
    mutationFn: issueToolToStudent,
    onSuccess: () => {
      toast({ title: 'Tool issued to student' });
      queryClient.invalidateQueries({ queryKey: ['faculty-tool-issues'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnCondition, setReturnCondition] = useState('');

  const returnToolMut = useMutation({
    mutationFn: ({ id, condition }: { id: string; condition: string }) =>
      returnTool(id, condition),
    onSuccess: () => {
      toast({ title: 'Tool returned' });
      queryClient.invalidateQueries({ queryKey: ['faculty-tool-issues'] });
      setReturnId(null);
      setReturnCondition('');
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const maintenanceDoneMut = useMutation({
    mutationFn: markMaintenanceDone,
    onSuccess: () => {
      toast({ title: 'Maintenance marked as done' });
      queryClient.invalidateQueries({ queryKey: ['maintenance-due'] });
    },
    onError: (e: Error) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleConfirmReject = (id: string) => {
    if (rejectReason.trim()) {
      rejectMut.mutate({ id, reason: rejectReason });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Faculty Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage utilization requests for your assigned machines.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: stats?.total_requests ?? '-', icon: BarChart3 },
            { label: 'Pending', value: stats?.pending ?? '-', icon: Clock },
            { label: 'Approved', value: stats?.approved ?? '-', icon: CheckCircle2 },
            { label: 'Rejected', value: stats?.rejected ?? '-', icon: XCircle },
            { label: 'Completed', value: stats?.completed ?? '-', icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 w-fit mb-6">
          {([
            { id: 'pending' as TabId, label: 'Pending Approvals', count: pendingRequests.length },
            { id: 'schedule' as TabId, label: "Today's Schedule", count: todaySchedule.length },
            { id: 'tool_issues' as TabId, label: 'Tool Issues', count: pendingToolIssues.length },
            { id: 'machines' as TabId, label: 'My Machines', count: myMachines.length },
            { id: 'maintenance' as TabId, label: 'Maintenance', count: maintenanceDue.length },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={cn(
                    'ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full text-xs px-1.5',
                    activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted/50',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters (for pending / schedule tabs) */}
        {(activeTab === 'pending' || activeTab === 'schedule') && (
          <div className="flex flex-wrap gap-3 mb-6 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Machine</label>
              <Select value={filterMachine} onValueChange={setFilterMachine}>
                <SelectTrigger className="w-48" aria-label="Filter by machine">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="All machines" />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="all">All machines</SelectItem>
                  {machineNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-44"
                aria-label="Filter by date"
              />
            </div>
            {(filterMachine !== 'all' || filterDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterMachine('all'); setFilterDate(''); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* ─── Pending / Schedule tab content ──────────────────────────────── */}
        {(activeTab === 'pending' || activeTab === 'schedule') && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'pending'
                    ? 'No pending requests.'
                    : "No sessions scheduled for today."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    onApprove={() => approveMut.mutate(req.id)}
                    onConfirmReject={() => handleConfirmReject(req.id)}
                    onComplete={() => completeMut.mutate(req.id)}
                    onNotComplete={(reason: string) => notCompleteMut.mutate({ id: req.id, reason })}
                    isApprovePending={approveMut.isPending}
                    isRejectPending={rejectMut.isPending}
                    isCompletePending={completeMut.isPending}
                    rejectId={rejectId}
                    rejectReason={rejectReason}
                    setRejectReason={setRejectReason}
                    setRejectId={setRejectId}
                    showComplete={activeTab === 'schedule'}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── My Machines tab (read-only) ─────────────────────────────────── */}
        {activeTab === 'machines' && (
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Cpu className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">
                Machines Assigned to You ({myMachines.length})
              </h2>
            </div>

            {myMachines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No machines are assigned to you. Contact the admin to assign machines.
              </p>
            ) : (
              <div className="space-y-3">
                {myMachines.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Cpu className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{m.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.shop_type && (
                            <span className="text-xs text-muted-foreground">{m.shop_type}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', STATUS_COLORS[m.status] || '')}
                    >
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tool Issues tab ─────────────────────────────────────────────── */}
        {activeTab === 'tool_issues' && (
          <div className="space-y-4">
            {toolIssueRequests.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No tool issue requests.</p>
              </div>
            ) : (
              toolIssueRequests.map((t) => (
                <div key={t.id} className="glass-panel rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{t.user_name}</h3>
                        <Badge variant="outline" className={cn('text-xs', toolIssueStatusColor(t.status))}>
                          {TOOL_ISSUE_STATUS_LABELS[t.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Wrench className="h-3 w-3" /> {t.resource_name}
                        </span>
                        <span>Qty: {t.quantity_requested}</span>
                        {t.shop_name && <span>Shop: {t.shop_name}</span>}
                        <span>{format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                      {t.user_email && <p className="text-xs text-muted-foreground">{t.user_email}</p>}
                      {t.rejection_reason && (
                        <div className="flex items-start gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>Rejected: {t.rejection_reason}</span>
                        </div>
                      )}
                      {t.condition_on_return && (
                        <p className="text-xs text-muted-foreground">Return condition: {t.condition_on_return}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {t.status === 'pending' && toolRejectId !== t.id && (
                        <>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approveToolMut.mutate(t.id)} disabled={approveToolMut.isPending}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setToolRejectId(t.id)}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                      {t.status === 'pending' && toolRejectId === t.id && (
                        <div className="flex flex-col gap-2 w-56">
                          <Textarea placeholder="Reason for rejection..." value={toolRejectReason} onChange={(e) => setToolRejectReason(e.target.value)} className="text-xs min-h-[60px]" autoFocus />
                          <Button size="sm" variant="destructive" onClick={() => rejectToolMut.mutate({ id: t.id, reason: toolRejectReason })} disabled={rejectToolMut.isPending || !toolRejectReason.trim()}>
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setToolRejectId(null); setToolRejectReason(''); }}>Cancel</Button>
                        </div>
                      )}
                      {t.status === 'approved' && (
                        <Button size="sm" onClick={() => issueToolMut.mutate(t.id)} disabled={issueToolMut.isPending}>
                          <Package className="h-3.5 w-3.5 mr-1" /> Issue to Student
                        </Button>
                      )}
                      {t.status === 'issued' && returnId !== t.id && (
                        <Button size="sm" variant="outline" onClick={() => setReturnId(t.id)}>
                          Mark Returned
                        </Button>
                      )}
                      {t.status === 'issued' && returnId === t.id && (
                        <div className="flex flex-col gap-2 w-56">
                          <Input placeholder="Condition on return" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)} className="text-xs" autoFocus />
                          <Button size="sm" onClick={() => returnToolMut.mutate({ id: t.id, condition: returnCondition || 'good' })} disabled={returnToolMut.isPending}>
                            Confirm Return
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReturnId(null); setReturnCondition(''); }}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── Maintenance tab ─────────────────────────────────────────────── */}
        {activeTab === 'maintenance' && (
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">
                Maintenance Due ({maintenanceDue.length})
              </h2>
            </div>

            {maintenanceDue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No resources due for maintenance.
              </p>
            ) : (
              <div className="space-y-3">
                {maintenanceDue.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Last: {r.last_maintenance_date ?? 'Never'} · Due: {r.next_maintenance_due ?? 'Overdue'}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => maintenanceDoneMut.mutate(r.id)} disabled={maintenanceDoneMut.isPending}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
                    </Button>
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

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request: r,
  onApprove,
  onConfirmReject,
  onComplete,
  onNotComplete,
  isApprovePending,
  isRejectPending,
  isCompletePending,
  rejectId,
  rejectReason,
  setRejectReason,
  setRejectId,
  showComplete = false,
}: {
  request: UtilizationRequestDetail;
  onApprove: () => void;
  onConfirmReject: () => void;
  onComplete: () => void;
  onNotComplete: (reason: string) => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isCompletePending: boolean;
  rejectId: string | null;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  setRejectId: (v: string | null) => void;
  showComplete?: boolean;
}) {
  const StatusIcon = STATUS_ICON[r.status];
  const isRejectOpen = rejectId === r.id;
  const [notCompleteOpen, setNotCompleteOpen] = useState(false);
  const [notCompleteReason, setNotCompleteReason] = useState('');

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{r.user_name}</h3>
            <Badge
              variant="outline"
              className={cn('text-xs', utilizationStatusColor(r.status))}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </Badge>
            {r.safety_acknowledged && (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400">
                <Shield className="h-3 w-3 mr-1" />
                Safety ✔
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              {r.machine_name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(r.date), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)} ({r.duration_minutes} min)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>
              <strong>Work:</strong> {WORK_TYPE_LABELS[r.work_type] ?? r.work_type}
            </span>
            <span>
              <strong>Material:</strong>{' '}
              {RAW_MATERIAL_LABELS[r.raw_material_source] ?? r.raw_material_source}
            </span>
          </div>

          {r.work_description && (
            <p className="text-xs text-muted-foreground italic">
              &ldquo;{r.work_description}&rdquo;
            </p>
          )}

          {r.user_email && (
            <p className="text-xs text-muted-foreground">{r.user_email}</p>
          )}

          {r.rejection_reason && (
            <div className="flex items-start gap-1.5 text-xs text-destructive mt-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>Rejected: {r.rejection_reason}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {r.status === 'pending' && !isRejectOpen && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={onApprove}
                disabled={isApprovePending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectId(r.id)}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </>
          )}
          {r.status === 'pending' && isRejectOpen && (
            <div className="flex flex-col gap-2 w-56">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs min-h-[60px]"
                autoFocus
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={onConfirmReject}
                disabled={isRejectPending || !rejectReason.trim()}
              >
                {isRejectPending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Confirm Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          )}
          {r.status === 'approved' && showComplete && !notCompleteOpen && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onComplete}
                disabled={isCompletePending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Mark Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-orange-400 border-orange-400/30 hover:bg-orange-500/10"
                onClick={() => setNotCompleteOpen(true)}
              >
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Not Completed
              </Button>
            </>
          )}
          {r.status === 'approved' && showComplete && notCompleteOpen && (
            <div className="flex flex-col gap-2 w-56">
              <Textarea
                placeholder="Reason not completed..."
                value={notCompleteReason}
                onChange={(e) => setNotCompleteReason(e.target.value)}
                className="text-xs min-h-[60px]"
                autoFocus
              />
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => { onNotComplete(notCompleteReason); setNotCompleteOpen(false); }}
                disabled={!notCompleteReason.trim()}
              >
                Confirm Not Completed
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setNotCompleteOpen(false); setNotCompleteReason(''); }}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
