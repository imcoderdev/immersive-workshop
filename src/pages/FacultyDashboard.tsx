import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const pendingApprovals = [
  {
    id: 1,
    student: "Aarav Sharma",
    machine: "CNC Lathe — Haas ST-10",
    date: "Feb 21, 2026",
    time: "10:00 AM - 12:00 PM",
    purpose: "Turning project for ME301 coursework",
  },
  {
    id: 2,
    student: "Priya Patel",
    machine: "Ultimaker S5 — FDM Printer",
    date: "Feb 22, 2026",
    time: "2:00 PM - 4:00 PM",
    purpose: "3D printing prototype for design competition",
  },
  {
    id: 3,
    student: "Rahul Gupta",
    machine: "Laser Cutter — Epilog Fusion",
    date: "Feb 23, 2026",
    time: "9:00 AM - 11:00 AM",
    purpose: "Acrylic cutting for project enclosure",
  },
];

export default function FacultyDashboard() {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Faculty Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Review booking requests and monitor workshop activity.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock, label: "Pending Approvals", value: "3", color: "bg-warning/10 text-warning" },
            { icon: CheckCircle2, label: "Approved Today", value: "7", color: "bg-success/10 text-success" },
            { icon: Users, label: "Active Students", value: "42", color: "bg-primary/10 text-primary" },
            { icon: BarChart3, label: "Machine Utilization", value: "78%", color: "bg-secondary/10 text-secondary" },
          ].map((stat) => (
            <div key={stat.label} className="glass-panel rounded-xl p-5">
              <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center mb-3", stat.color.split(" ")[0])}>
                <stat.icon className={cn("h-4 w-4", stat.color.split(" ")[1])} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Pending Approvals */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold">Pending Approvals</h2>
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-4">
            {pendingApprovals.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg bg-muted/20 border border-border/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{request.student}</span>
                      <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-xs font-medium">
                        Pending
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">{request.machine}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {request.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {request.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 italic">"{request.purpose}"</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="success" size="sm">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                    <Button variant="outline" size="sm">
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
