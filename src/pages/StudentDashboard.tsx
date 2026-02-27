import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Shield,
  BarChart3,
  Settings,
  Compass,
  XCircle,
  Cpu,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserBookings, getUserSafetyAcknowledgements, cancelBooking } from '@/services/booking-service';
import { getUserUtilizationRequests } from '@/services/utilization-service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { BookingDetail, BookingStatus, UtilizationRequestDetail, UtilizationStatus } from '@/types/database';
import { WORK_TYPE_LABELS, utilizationStatusColor } from '@/types/database';

const statusStyles: Record<BookingStatus, string> = {
  pending: 'bg-warning/15 text-warning',
  approved: 'bg-success/15 text-success',
  rejected: 'bg-destructive/15 text-destructive',
  completed: 'bg-primary/15 text-primary',
  cancelled: 'bg-muted text-muted-foreground',
};

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', accent || 'bg-primary/10')}>
          <Icon className={cn('h-4 w-4', accent ? 'text-primary-foreground' : 'text-primary')} />
        </div>
      </div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function StudentDashboard() {
  const { profile } = useAuthStore();
  const { toast } = useToast();

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ['user-bookings'],
    queryFn: getUserBookings,
  });

  const { data: safetyRecords = [] } = useQuery({
    queryKey: ['user-safety'],
    queryFn: getUserSafetyAcknowledgements,
  });

  const { data: utilizationRequests = [] } = useQuery({
    queryKey: ['user-utilization'],
    queryFn: getUserUtilizationRequests,
  });

  const activeBookings = bookings.filter((b) => b.status === 'approved' || b.status === 'pending');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const upcomingBookings = bookings.filter((b) => ['pending', 'approved'].includes(b.status) && new Date(b.date) >= new Date()).slice(0, 5);
  const totalHours = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => {
      const start = new Date(`2000-01-01T${b.start_time}`);
      const end = new Date(`2000-01-01T${b.end_time}`);
      return sum + (end.getTime() - start.getTime()) / 3600000;
    }, 0);

  const handleCancel = async (id: string) => {
    try {
      await cancelBooking(id);
      toast({ title: 'Booking cancelled' });
      refetchBookings();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Welcome, {profile?.full_name || 'Student'}</h1>
          <p className="text-sm text-muted-foreground">Manage your bookings, safety records, and workshop access.</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          <Button size="sm" asChild><Link to="/workshop"><Compass className="h-4 w-4 mr-1" />Explore Workshop</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/utilize"><Wrench className="h-4 w-4 mr-1" />New Utilization Request</Link></Button>
          <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Account Settings</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Calendar} label="Active Bookings" value={activeBookings.length} />
          <StatCard icon={Wrench} label="Utilization Requests" value={utilizationRequests.length} />
          <StatCard icon={Shield} label="Safety Cleared" value={safetyRecords.length} />
          <StatCard icon={BarChart3} label="Hours Logged" value={Math.round(totalHours)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Upcoming Bookings</h2>
              <Button variant="ghost" size="sm">View All <ArrowRight className="h-3.5 w-3.5" /></Button>
            </div>

            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming bookings. Explore a workshop to book machines.</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/30">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{booking.machine_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(booking.date), 'MMM d, yyyy')} &bull; {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                      </div>
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0', statusStyles[booking.status])}>
                      {booking.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                    {booking.status === 'pending' && (
                      <button onClick={() => handleCancel(booking.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Cancel">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Safety Records</h2>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>

            {safetyRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No safety records yet.</p>
            ) : (
              <div className="space-y-3">
                {safetyRecords.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">Machine</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(record.acknowledged_at), 'MMM d, yyyy')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Utilization Requests */}
        <div className="glass-panel rounded-xl p-6 mt-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold">Utilization Requests</h2>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </div>

          {utilizationRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No utilization requests yet. Submit one from the button above or from a machine in the workshop.
            </p>
          ) : (
            <div className="space-y-3">
              {utilizationRequests.slice(0, 10).map((req) => {
                const utilStatusStyles: Record<UtilizationStatus, string> = {
                  pending: 'bg-warning/15 text-warning',
                  approved: 'bg-success/15 text-success',
                  rejected: 'bg-destructive/15 text-destructive',
                  completed: 'bg-primary/15 text-primary',
                };
                return (
                  <div key={req.id} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/30">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Cpu className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{req.machine_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(req.date), 'MMM d, yyyy')} &bull; {req.start_time.slice(0, 5)} - {req.end_time.slice(0, 5)} &bull; {WORK_TYPE_LABELS[req.work_type] ?? req.work_type}
                      </div>
                      {req.rejection_reason && (
                        <div className="text-xs text-destructive mt-0.5">Reason: {req.rejection_reason}</div>
                      )}
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0', utilStatusStyles[req.status])}>
                      {req.status === 'approved' ? <CheckCircle2 className="h-3 w-3" /> : req.status === 'rejected' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
