import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  BarChart3,
  Filter,
  Cpu,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getSupervisorUtilizationRequests,
  getSupervisorStats,
  approveUtilizationRequest,
  rejectUtilizationRequest,
  completeUtilizationRequest,
} from '@/services/utilization-service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import type {
  UtilizationRequestDetail,
  UtilizationStatus,
} from '@/types/database';
import {
  utilizationStatusColor,
  WORK_TYPE_LABELS,
  RAW_MATERIAL_LABELS,
} from '@/types/database';

type TabId = 'pending' | 'schedule' | 'all';

const STATUS_ICON: Record<UtilizationStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  completed: BarChart3,
};

export default function SupervisorDashboard() {
  const { profile } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [filterMachine, setFilterMachine] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('');
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['supervisor-stats'],
    queryFn: getSupervisorStats,
  });

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['supervisor-utilization'],
    queryFn: () => getSupervisorUtilizationRequests(),
  });

  // Derived lists
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaySchedule = allRequests.filter(
    (r) => r.date === todayStr && (r.status === 'approved' || r.status === 'pending'),
  );
  const machineNames = [...new Set(allRequests.map((r) => r.machine_name))];

  // Filtered view
  const filteredRequests = allRequests.filter((r) => {
    if (activeTab === 'pending') return r.status === 'pending';
    if (activeTab === 'schedule') return r.date === todayStr && r.status !== 'rejected';
    return true;
  }).filter((r) => {
    if (filterMachine && filterMachine !== 'all') return r.machine_name === filterMachine;
    return true;
  }).filter((r) => {
    if (filterDate) return r.date === filterDate;
    return true;
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────

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

  const handleReject = (id: string) => {
    if (rejectReason.trim()) {
      rejectMut.mutate({ id, reason: rejectReason });
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">
            Supervisor Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage machine utilization requests assigned to you.
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
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {([
            { id: 'pending', label: `Pending (${pendingRequests.length})` },
            { id: 'schedule', label: `Today's Schedule (${todaySchedule.length})` },
            { id: 'all', label: 'All Requests' },
          ] as { id: TabId; label: string }[]).map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Filters */}
        {activeTab === 'all' && (
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
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMachine('all');
                  setFilterDate('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Request list */}
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
                : activeTab === 'schedule'
                  ? 'No sessions scheduled for today.'
                  : 'No utilization requests found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                onApprove={() => approveMut.mutate(req.id)}
                onConfirmReject={() => handleReject(req.id)}
                onComplete={() => completeMut.mutate(req.id)}
                isApprovePending={approveMut.isPending}
                isRejectPending={rejectMut.isPending}
                isCompletePending={completeMut.isPending}
                rejectId={rejectId}
                rejectReason={rejectReason}
                setRejectReason={setRejectReason}
                setRejectId={setRejectId}
              />
            ))}
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
  isApprovePending,
  isRejectPending,
  isCompletePending,
  rejectId,
  rejectReason,
  setRejectReason,
  setRejectId,
}: {
  request: UtilizationRequestDetail;
  onApprove: () => void;
  onConfirmReject: () => void;
  onComplete: () => void;
  isApprovePending: boolean;
  isRejectPending: boolean;
  isCompletePending: boolean;
  rejectId: string | null;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  setRejectId: (v: string | null) => void;
}) {
  const StatusIcon = STATUS_ICON[r.status];
  const isRejectOpen = rejectId === r.id;

  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{r.user_name}</h3>
            <Badge variant="outline" className={cn('text-xs', utilizationStatusColor(r.status))}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </Badge>
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
              <strong>Material:</strong> {RAW_MATERIAL_LABELS[r.raw_material_source] ?? r.raw_material_source}
            </span>
          </div>

          {r.work_description && (
            <p className="text-xs text-muted-foreground italic">"{r.work_description}"</p>
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
          {r.status === 'approved' && (
            <Button size="sm" variant="outline" onClick={onComplete} disabled={isCompletePending}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Mark Complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
