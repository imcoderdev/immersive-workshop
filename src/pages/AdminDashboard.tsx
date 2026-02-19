import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Users,
  Cpu,
  BarChart3,
  Calendar,
  TrendingUp,
  Activity,
  Download,
  Settings,
} from "lucide-react";

const usageData = [
  { day: "Mon", value: 65 },
  { day: "Tue", value: 82 },
  { day: "Wed", value: 71 },
  { day: "Thu", value: 90 },
  { day: "Fri", value: 55 },
  { day: "Sat", value: 30 },
  { day: "Sun", value: 12 },
];

const topMachines = [
  { name: "CNC Lathe — Haas ST-10", usage: 92, bookings: 45 },
  { name: "Ultimaker S5 — FDM Printer", usage: 78, bookings: 38 },
  { name: "Laser Cutter — Epilog Fusion", usage: 65, bookings: 28 },
  { name: "Milling Machine — DMG Mori", usage: 54, bookings: 22 },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Platform overview, analytics, and management.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="glass" size="sm">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="glass" size="sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Cpu, label: "Total Machines", value: "24", change: "+2 this month" },
            { icon: Users, label: "Active Users", value: "156", change: "+18 this week" },
            { icon: Calendar, label: "Bookings Today", value: "14", change: "6 pending" },
            { icon: TrendingUp, label: "Utilization Rate", value: "73%", change: "+5% vs last week" },
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
              <div className="text-xs text-success mt-1">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Usage Chart */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-base font-semibold mb-5">Weekly Usage</h2>
            <div className="flex items-end justify-between gap-2 h-40">
              {usageData.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative" style={{ height: "120px" }}>
                    <div
                      className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-primary to-secondary transition-all duration-500"
                      style={{ height: `${d.value}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Machines */}
          <div className="glass-panel rounded-xl p-6">
            <h2 className="text-base font-semibold mb-5">Top Machines</h2>
            <div className="space-y-4">
              {topMachines.map((machine) => (
                <div key={machine.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium truncate pr-4">{machine.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{machine.usage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                      style={{ width: `${machine.usage}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{machine.bookings} bookings</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
