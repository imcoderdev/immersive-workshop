import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Info,
  Shield,
  Calendar,
  ChevronRight,
  X,
  Play,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
} from "lucide-react";

// Mock hotspot data
const hotspots = [
  {
    id: "cnc-lathe",
    type: "machine" as const,
    label: "CNC Lathe Machine",
    x: 25,
    y: 45,
    data: {
      name: "CNC Lathe — Haas ST-10",
      description: "Precision turning center for cylindrical parts. Features live tooling and C-axis capability.",
      specs: [
        { label: "Max Swing", value: "419 mm" },
        { label: "Spindle Speed", value: "6,000 RPM" },
        { label: "Power", value: "11.2 kW" },
        { label: "Weight", value: "2,722 kg" },
      ],
      status: "available" as const,
      nextSlot: "Today 2:00 PM",
    },
  },
  {
    id: "3d-printer",
    type: "machine" as const,
    label: "3D Printer Bay",
    x: 55,
    y: 40,
    data: {
      name: "Ultimaker S5 — FDM Printer",
      description: "Dual-extrusion 3D printer for prototyping. Supports PLA, ABS, Nylon, and composites.",
      specs: [
        { label: "Build Volume", value: "330×240×300 mm" },
        { label: "Layer Resolution", value: "20 microns" },
        { label: "Nozzle Temp", value: "280°C" },
        { label: "Connectivity", value: "WiFi / Ethernet" },
      ],
      status: "busy" as const,
      nextSlot: "Tomorrow 9:00 AM",
    },
  },
  {
    id: "safety-station",
    type: "safety" as const,
    label: "Safety Station",
    x: 80,
    y: 55,
    data: {
      name: "Workshop Safety Station",
      description: "PPE equipment, first aid kit, and emergency shutdown controls.",
      specs: [],
      status: "available" as const,
      nextSlot: "",
    },
  },
];

type HotspotType = (typeof hotspots)[0];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        status === "available" && "bg-success/15 text-success",
        status === "busy" && "bg-destructive/15 text-destructive",
        status === "reserved" && "bg-warning/15 text-warning"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "available" && "bg-success",
          status === "busy" && "bg-destructive",
          status === "reserved" && "bg-warning"
        )}
      />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function HotspotMarker({
  hotspot,
  onClick,
  isActive,
}: {
  hotspot: HotspotType;
  onClick: () => void;
  isActive: boolean;
}) {
  const Icon = hotspot.type === "safety" ? Shield : hotspot.type === "machine" ? Info : Calendar;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute z-10 group",
        "transform -translate-x-1/2 -translate-y-1/2"
      )}
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      aria-label={`View ${hotspot.label}`}
    >
      <div
        className={cn(
          "relative h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer",
          isActive
            ? "bg-primary scale-110"
            : "bg-primary/80 hover:bg-primary hover:scale-110",
          "hotspot-pulse"
        )}
      >
        <Icon className="h-4 w-4 text-primary-foreground" />
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="glass-panel-strong rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap">
          {hotspot.label}
        </div>
      </div>
    </button>
  );
}

function DetailPanel({
  hotspot,
  onClose,
}: {
  hotspot: HotspotType;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[400px] z-30 slide-in-right">
      <div className="h-full glass-panel-strong border-l border-border/30 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {hotspot.type === "safety" ? (
                  <Shield className="h-5 w-5 text-warning" />
                ) : (
                  <Info className="h-5 w-5 text-primary" />
                )}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {hotspot.type}
                </span>
              </div>
              <h2 className="text-xl font-bold">{hotspot.data.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status */}
          {hotspot.type === "machine" && (
            <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-muted/30">
              <StatusBadge status={hotspot.data.status} />
              {hotspot.data.nextSlot && (
                <span className="text-xs text-muted-foreground">
                  Next: {hotspot.data.nextSlot}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {hotspot.data.description}
          </p>

          {/* Specs */}
          {hotspot.data.specs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Technical Specifications</h3>
              <div className="grid grid-cols-2 gap-3">
                {hotspot.data.specs.map((spec) => (
                  <div key={spec.label} className="p-3 rounded-lg bg-muted/20">
                    <div className="text-xs text-muted-foreground mb-1">{spec.label}</div>
                    <div className="text-sm font-medium">{spec.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Video Placeholder */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">Safety Video</h3>
            <div className="aspect-video rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center group cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Play className="h-5 w-5 text-primary ml-0.5" />
              </div>
            </div>
          </div>

          {/* SOP Document */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3">SOP Document</h3>
            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors text-left">
              <FileText className="h-5 w-5 text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">Standard Operating Procedure</div>
                <div className="text-xs text-muted-foreground">PDF • 2.4 MB</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>

          {/* Safety Acknowledgment */}
          {hotspot.type === "machine" && (
            <div className="mb-6 p-4 rounded-lg border border-warning/20 bg-warning/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold mb-1">Safety Acknowledgment Required</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    You must review the SOP and acknowledge safety requirements before booking.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-1 rounded border-border" />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      I have read and understood the Standard Operating Procedure and agree to follow all safety guidelines.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Book CTA */}
          {hotspot.type === "machine" && (
            <Button variant="hero" className="w-full" size="lg">
              <Calendar className="h-4 w-4" />
              Book This Machine
            </Button>
          )}

          {hotspot.type === "safety" && (
            <Button variant="success" className="w-full" size="lg">
              <CheckCircle2 className="h-4 w-4" />
              Acknowledge Safety Protocols
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkshopViewer() {
  const [activeHotspot, setActiveHotspot] = useState<HotspotType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={cn(
        "relative bg-background overflow-hidden",
        isFullscreen ? "fixed inset-0 z-50" : "min-h-screen pt-16"
      )}
    >
      {/* 360° Viewer Canvas */}
      <div className="relative w-full h-[calc(100vh-4rem)] bg-card">
        {/* Simulated panorama background */}
        <div className="absolute inset-0 bg-gradient-to-br from-card via-muted/20 to-card">
          <img
            src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80"
            alt="Workshop panoramic view"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/50" />
        </div>

        {/* Drag instruction overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 glass-panel rounded-full px-4 py-2 text-xs text-muted-foreground">
          <Move className="h-3.5 w-3.5" />
          Click and drag to look around
        </div>

        {/* Viewer Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="glass-panel rounded-lg p-2.5 hover:bg-card/80 transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button className="glass-panel rounded-lg p-2.5 hover:bg-card/80 transition-colors" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button className="glass-panel rounded-lg p-2.5 hover:bg-card/80 transition-colors" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button className="glass-panel rounded-lg p-2.5 hover:bg-card/80 transition-colors" aria-label="Reset view">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Workshop Info Overlay */}
        <div className="absolute top-4 left-4 z-20">
          <div className="glass-panel-strong rounded-xl px-4 py-3">
            <h2 className="text-sm font-semibold">Mechanical Workshop — Block A</h2>
            <p className="text-xs text-muted-foreground">3 machines • 2 available</p>
          </div>
        </div>

        {/* Hotspots */}
        {hotspots.map((hotspot) => (
          <HotspotMarker
            key={hotspot.id}
            hotspot={hotspot}
            isActive={activeHotspot?.id === hotspot.id}
            onClick={() =>
              setActiveHotspot(
                activeHotspot?.id === hotspot.id ? null : hotspot
              )
            }
          />
        ))}

        {/* Detail Panel */}
        {activeHotspot && (
          <DetailPanel
            hotspot={activeHotspot}
            onClose={() => setActiveHotspot(null)}
          />
        )}
      </div>
    </div>
  );
}
