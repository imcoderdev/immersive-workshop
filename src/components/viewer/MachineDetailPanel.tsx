import { useState, useEffect } from 'react';
import { X, Play, FileText, Shield, Calendar, Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkshopStore } from '@/stores/workshop-store';
import { checkSafetyAcknowledgement, acknowledgeSafety } from '@/services/booking-service';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import type { Machine, MachineStatus } from '@/types/database';
import BookingModal from '@/components/viewer/BookingModal';

const statusConfig: Record<MachineStatus, { label: string; color: string; icon: any }> = {
  available: { label: 'Available', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  reserved: { label: 'Reserved', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  busy: { label: 'Busy', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
  maintenance: { label: 'Maintenance', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle },
};

export function MachineDetailPanel() {
  const { selectedHotspot, isDetailPanelOpen, closeDetailPanel } = useWorkshopStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const machine = selectedHotspot?.machine;

  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [safetyChecked, setSafetyChecked] = useState(false);

  useEffect(() => {
    if (machine && user) {
      checkSafetyAcknowledgement(machine.id).then(setSafetyAcknowledged).catch(() => {});
    }
  }, [machine, user]);

  if (!isDetailPanelOpen || !selectedHotspot) return null;

  const handleAcknowledgeSafety = async () => {
    if (!machine) return;
    setIsAcknowledging(true);
    try {
      await acknowledgeSafety(machine.id);
      setSafetyAcknowledged(true);
      toast({ title: 'Safety acknowledged', description: 'You can now book this machine.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAcknowledging(false);
    }
  };

  const handleBookClick = () => {
    if (!safetyAcknowledged) {
      toast({ title: 'Safety required', description: 'Please complete the safety acknowledgement first.', variant: 'destructive' });
      return;
    }
    setShowBooking(true);
  };

  const status = machine ? statusConfig[machine.status] : null;
  const StatusIcon = status?.icon || Info;

  return (
    <>
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md z-50 slide-in-right"
        role="dialog"
        aria-label="Machine details"
      >
        <div className="h-full glass-panel-strong border-l border-white/10 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{selectedHotspot.label}</h2>
              {machine && status && (
                <Badge variant="outline" className={`mt-1 ${status.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              )}
            </div>
            <button
              onClick={closeDetailPanel}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Description */}
              {selectedHotspot.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm">{selectedHotspot.description}</p>
                </div>
              )}

              {machine && (
                <>
                  {/* Technical Specs */}
                  {machine.technical_specs && Object.keys(machine.technical_specs).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Technical Specifications</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(machine.technical_specs).map(([key, value]) => (
                          <div key={key} className="p-2 rounded-lg bg-muted/30 border border-white/5">
                            <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-sm font-medium">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="bg-white/10" />

                  {/* Safety Video */}
                  {machine.safety_video_url && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Play className="h-4 w-4" /> Safety Video
                      </h3>
                      <div className="rounded-lg overflow-hidden bg-black aspect-video">
                        <video
                          src={machine.safety_video_url}
                          controls
                          className="w-full h-full"
                          preload="metadata"
                        />
                      </div>
                    </div>
                  )}

                  {/* Audio Explanation */}
                  {machine.audio_explanation_url && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Audio Explanation</h3>
                      <audio src={machine.audio_explanation_url} controls className="w-full" preload="metadata" />
                    </div>
                  )}

                  {/* SOP Document */}
                  {machine.sop_pdf_url && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Standard Operating Procedure
                      </h3>
                      <a
                        href={machine.sop_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-white/5 hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-sm font-medium">View SOP Document</p>
                          <p className="text-xs text-muted-foreground">PDF • Required before booking</p>
                        </div>
                      </a>
                    </div>
                  )}

                  <Separator className="bg-white/10" />

                  {/* Safety Acknowledgement */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" /> Safety Compliance
                    </h3>

                    {safetyAcknowledged ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                        <div>
                          <p className="text-sm font-medium text-emerald-400">Safety Acknowledged</p>
                          <p className="text-xs text-muted-foreground">You've completed the safety requirements</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <p className="text-sm text-yellow-400 mb-2">Complete safety requirements before booking:</p>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            <li>1. Review the safety video above</li>
                            <li>2. Read the SOP document</li>
                            <li>3. Acknowledge the safety undertaking below</li>
                          </ul>
                        </div>

                        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-white/5">
                          <Checkbox
                            id="safety-check"
                            checked={safetyChecked}
                            onCheckedChange={(checked) => setSafetyChecked(!!checked)}
                          />
                          <label htmlFor="safety-check" className="text-xs leading-relaxed cursor-pointer">
                            I have reviewed the safety video and SOP document. I understand the safety procedures
                            and agree to follow all safety guidelines while operating this machine.
                          </label>
                        </div>

                        <Button
                          onClick={handleAcknowledgeSafety}
                          disabled={!safetyChecked || isAcknowledging}
                          className="w-full"
                          variant="outline"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          {isAcknowledging ? 'Acknowledging...' : 'Acknowledge Safety'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Booking button */}
                  {machine.is_bookable && (
                    <Button
                      onClick={handleBookClick}
                      className="w-full"
                      size="lg"
                      disabled={machine.status === 'maintenance'}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book This Machine
                    </Button>
                  )}
                </>
              )}

              {/* Navigation hotspot */}
              {selectedHotspot.type === 'navigation' && selectedHotspot.target_panorama_id && (
                <Button
                  onClick={() => {
                    useWorkshopStore.getState().switchPanorama(selectedHotspot.target_panorama_id!);
                  }}
                  className="w-full"
                  size="lg"
                >
                  Navigate to this area
                </Button>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={closeDetailPanel}
        aria-hidden="true"
      />

      {/* Booking Modal */}
      {showBooking && machine && (
        <BookingModal
          machine={machine}
          workshopId={selectedHotspot.panorama_id}
          onClose={() => setShowBooking(false)}
        />
      )}
    </>
  );
}
