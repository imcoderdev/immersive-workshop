import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';
import { getAdminStats, getWeeklyUsage, getMachineUtilization } from '@/services/booking-service';
import { getAllProfiles, getPendingTeachers, approveTeacher, rejectTeacher } from '@/services/auth-service';
import { getAllUtilizationRequests } from '@/services/utilization-service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useState } from 'react';
import type { UtilizationStatus } from '@/types/database';
import { utilizationStatusColor, WORK_TYPE_LABELS, RAW_MATERIAL_LABELS } from '@/types/database';

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [utilFilterStatus, setUtilFilterStatus] = useState<string>('all');
  const [utilFilterDate, setUtilFilterDate] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
  });

  const { data: weeklyUsage = [] } = useQuery({
    queryKey: ['weekly-usage'],
    queryFn: getWeeklyUsage,
  });

  const { data: machineUtil = [] } = useQuery({
    queryKey: ['machine-utilization'],
    queryFn: getMachineUtilization,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: getAllProfiles,
  });

  const { data: pendingTeachers = [] } = useQuery({
    queryKey: ['pending-teachers'],
    queryFn: getPendingTeachers,
  });

  const { data: allUtilRequests = [] } = useQuery({
    queryKey: ['admin-utilization'],
    queryFn: () => getAllUtilizationRequests(),
  });

  // Filtered utilization requests
  const filteredUtil = allUtilRequests
    .filter((r) => utilFilterStatus === 'all' || r.status === utilFilterStatus)
    .filter((r) => !utilFilterDate || r.date === utilFilterDate);

  const approveM = useMutation({
    mutationFn: approveTeacher,
    onSuccess: () => {
      toast({ title: 'Teacher approved!' });
      queryClient.invalidateQueries({ queryKey: ['pending-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectM = useMutation({
    mutationFn: rejectTeacher,
    onSuccess: () => {
      toast({ title: 'Teacher registration rejected' });
      queryClient.invalidateQueries({ queryKey: ['pending-teachers'] });
      queryClient.invalidateQueries({ queryKey: ['all-profiles'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const maxUsage = Math.max(...weeklyUsage.map((d) => Number(d.bookings) || 0), 1);
  const chartData = weeklyUsage.map((d) => ({
    day: d.day,
    value: Math.round((Number(d.bookings) / maxUsage) * 100),
  }));

  const exportCSV = () => {
    if (!machineUtil.length) return;
    const header = 'Machine,Total Bookings,Utilization %\n';
    const rows = machineUtil
      .map((m) => `"${m.name}",${m.total_bookings},${m.utilization}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'machine_utilization.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportUtilCSV = () => {
    if (!filteredUtil.length) return;
    const header = 'Student,Email,Department,Machine,Work Type,Material,Date,Start,End,Duration (min),Status,Rejection Reason\n';
    const rows = filteredUtil
      .map((r) =>
        `"${r.user_name}","${r.user_email}","${r.user_department ?? ''}","${r.machine_name}","${WORK_TYPE_LABELS[r.work_type] ?? r.work_type}","${RAW_MATERIAL_LABELS[r.raw_material_source] ?? r.raw_material_source}","${r.date}","${r.start_time}","${r.end_time}",${r.duration_minutes},"${r.status}","${r.rejection_reason ?? ''}"`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'utilization_requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Platform overview, analytics, and management.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Cpu, label: 'Total Machines', value: String(stats?.total_machines ?? '-') },
            { icon: Users, label: 'Total Users', value: String(profiles.length) },
            { icon: Calendar, label: 'Bookings Today', value: String(stats?.bookings_today ?? '-') },
            { icon: TrendingUp, label: 'Pending', value: String(stats?.pending_approvals ?? '-') },
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

        {/* Teacher Approval Section */}
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
                        <Clock className="h-3 w-3" />
                        Registered {format(new Date(teacher.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => approveM.mutate(teacher.id)}
                      disabled={approveM.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectM.mutate(teacher.id)}
                      disabled={rejectM.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
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
                      <div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-primary to-secondary transition-all duration-500"
                        style={{ height: `${d.value}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-base font-semibold mb-5">Machine Utilization</h2>
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
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{machine.total_bookings} bookings</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Utilization Requests Section */}
        <div className="glass-panel rounded-xl p-6 mt-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Utilization Requests ({filteredUtil.length})</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={utilFilterStatus} onValueChange={setUtilFilterStatus}>
                <SelectTrigger className="w-36 h-8 text-xs" aria-label="Filter by status">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[70]">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={utilFilterDate}
                onChange={(e) => setUtilFilterDate(e.target.value)}
                className="w-40 h-8 text-xs"
                aria-label="Filter by date"
              />
              <Button variant="outline" size="sm" onClick={exportUtilCSV}>
                <Download className="h-3.5 w-3.5 mr-1" />CSV
              </Button>
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
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Work Type</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Duration</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUtil.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-b border-border/10 hover:bg-muted/10">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-xs">{r.user_name}</div>
                        <div className="text-xs text-muted-foreground">{r.user_department ?? ''}</div>
                      </td>
                      <td className="py-2.5 px-3 text-xs">{r.machine_name}</td>
                      <td className="py-2.5 px-3 text-xs">{WORK_TYPE_LABELS[r.work_type] ?? r.work_type}</td>
                      <td className="py-2.5 px-3 text-xs">{format(new Date(r.date), 'MMM d')}</td>
                      <td className="py-2.5 px-3 text-xs">{r.start_time.slice(0, 5)} – {r.end_time.slice(0, 5)}</td>
                      <td className="py-2.5 px-3 text-xs">{r.duration_minutes} min</td>
                      <td className="py-2.5 px-3">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', utilizationStatusColor(r.status))}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
