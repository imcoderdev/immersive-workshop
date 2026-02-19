import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import { Link } from "react-router-dom";

const upcomingBookings = [
  {
    id: 1,
    machine: "CNC Lathe — Haas ST-10",
    workshop: "Mechanical Workshop",
    date: "Feb 20, 2026",
    time: "2:00 PM - 4:00 PM",
    status: "approved",
  },
  {
    id: 2,
    machine: "Ultimaker S5 — FDM Printer",
    workshop: "Fabrication Lab",
    date: "Feb 22, 2026",
    time: "10:00 AM - 12:00 PM",
    status: "pending",
  },
  {
    id: 3,
    machine: "Laser Cutter — Epilog Fusion",
    workshop: "Fabrication Lab",
    date: "Feb 25, 2026",
    time: "9:00 AM - 11:00 AM",
    status: "approved",
  },
];

const recentSafety = [
  { machine: "CNC Lathe — Haas ST-10", date: "Feb 15, 2026", acknowledged: true },
  { machine: "Ultimaker S5", date: "Feb 10, 2026", acknowledged: true },
];

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", accent || "bg-primary/10")}>
          <Icon className={cn("h-4 w-4", accent ? "text-primary-foreground" : "text-primary")} />
        </div>
      </div>
      <div className="text-2xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Student Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage your bookings, safety records, and workshop access.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="hero" size="sm" asChild>
            <Link to="/workshop">
              <Compass className="h-4 w-4" />
              Explore Workshop
            </Link>
          </Button>
          <Button variant="glass" size="sm">
            <Calendar className="h-4 w-4" />
            New Booking
          </Button>
          <Button variant="glass" size="sm">
            <Settings className="h-4 w-4" />
            Account Settings
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Calendar} label="Active Bookings" value="3" />
          <StatCard icon={CheckCircle2} label="Completed" value="12" />
          <StatCard icon={Shield} label="Safety Cleared" value="5" />
          <StatCard icon={BarChart3} label="Hours Logged" value="48" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bookings */}
          <div className="lg:col-span-2 glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Upcoming Bookings</h2>
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{booking.machine}</div>
                    <div className="text-xs text-muted-foreground">
                      {booking.date} • {booking.time}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                      booking.status === "approved" && "bg-success/15 text-success",
                      booking.status === "pending" && "bg-warning/15 text-warning"
                    )}
                  >
                    {booking.status === "approved" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Records */}
          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Safety Records</h2>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="space-y-3">
              {recentSafety.map((record, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{record.machine}</div>
                    <div className="text-xs text-muted-foreground">{record.date}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-medium">2 machines pending</div>
                  <div className="text-xs text-muted-foreground">
                    Complete safety acknowledgment to book.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
