import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { getAdminStats, getWeeklyUsage, getMachineUtilization } from '@/services/booking-service';
import { getAllProfiles, getPendingTeachers, approveTeacher, rejectTeacher } from '@/services/auth-service';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      </div>
    </div>
  );
}
