import { useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useWorkshopStore } from '@/stores/workshop-store';
import { getWorkshopById, getWorkshops, getPanoramasByWorkshop, getMachinesByWorkshop, getHotspotsByPanorama } from '@/services/workshop-service';
import { PanoramaViewer } from '@/components/viewer/PanoramaViewer';
import { MachineDetailPanel } from '@/components/viewer/MachineDetailPanel';
import { supabase } from '@/lib/supabase';
import type { Hotspot, Machine } from '@/types/database';
import { Compass, Layers, ArrowRight } from 'lucide-react';

export default function WorkshopViewer() {
  const [searchParams] = useSearchParams();
  const workshopId = searchParams.get('id');
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    currentWorkshop,
    currentPanorama,
    panoramas,
    hotspots,
    hasPlayedWelcomeAudio,
    setCurrentWorkshop,
    setCurrentPanorama,
    setPanoramas,
    setMachines,
    setHotspots,
    selectHotspot,
    markWelcomeAudioPlayed,
    switchPanorama,
    updateMachineStatus,
  } = useWorkshopStore();

  // Fetch workshop data
  const { data: workshop, isLoading: workshopLoading } = useQuery({
    queryKey: ['workshop', workshopId],
    queryFn: () => getWorkshopById(workshopId!),
    enabled: !!workshopId,
  });

  const { data: panoramaList } = useQuery({
    queryKey: ['panoramas', workshopId],
    queryFn: () => getPanoramasByWorkshop(workshopId!),
    enabled: !!workshopId,
  });

  const { data: machineList } = useQuery({
    queryKey: ['machines', workshopId],
    queryFn: () => getMachinesByWorkshop(workshopId!),
    enabled: !!workshopId,
  });

  // Set workshop data in store
  useEffect(() => {
    if (workshop) setCurrentWorkshop(workshop);
  }, [workshop, setCurrentWorkshop]);

  useEffect(() => {
    if (panoramaList) {
      setPanoramas(panoramaList);
      const defaultPanorama = panoramaList.find((p) => p.is_default) || panoramaList[0];
      if (defaultPanorama && !currentPanorama) {
        setCurrentPanorama(defaultPanorama);
      }
    }
  }, [panoramaList, setPanoramas, setCurrentPanorama, currentPanorama]);

  useEffect(() => {
    if (machineList) setMachines(machineList);
  }, [machineList, setMachines]);

  // Fetch hotspots for current panorama
  const { data: hotspotList } = useQuery({
    queryKey: ['hotspots', currentPanorama?.id],
    queryFn: () => getHotspotsByPanorama(currentPanorama!.id),
    enabled: !!currentPanorama,
  });

  useEffect(() => {
    if (hotspotList) setHotspots(hotspotList);
  }, [hotspotList, setHotspots]);

  // Auto-play welcome audio (once per session)
  useEffect(() => {
    if (workshop?.welcome_audio_url && !hasPlayedWelcomeAudio && audioRef.current) {
      audioRef.current.play().catch(() => {});
      markWelcomeAudioPlayed();
    }
  }, [workshop, hasPlayedWelcomeAudio, markWelcomeAudioPlayed]);

  // Realtime subscription for machine status changes
  useEffect(() => {
    if (!workshopId) return;

    const channel = supabase
      .channel('machine-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'machines', filter: `workshop_id=eq.${workshopId}` },
        (payload) => {
          const updated = payload.new as Machine;
          updateMachineStatus(updated.id, updated.status);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workshopId, updateMachineStatus]);

  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    if (hotspot.type === 'navigation' && hotspot.target_panorama_id) {
      switchPanorama(hotspot.target_panorama_id);
    } else if (hotspot.type === 'machine_info' && hotspot.machine) {
      selectHotspot(hotspot);
    } else {
      selectHotspot(hotspot);
    }
  }, [selectHotspot, switchPanorama]);

  // Fetch all workshops for picker when no ID provided
  const { data: allWorkshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: getWorkshops,
    enabled: !workshopId,
  });

  if (workshopLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading workshop...</p>
        </div>
      </div>
    );
  }

  if (!workshopId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <Compass className="h-16 w-16 text-primary/40 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Select a Workshop</h1>
          <p className="text-muted-foreground mb-6">
            Choose a workshop below to begin your immersive 360° experience, or scan a QR code at the workshop entrance.
          </p>
          {allWorkshops.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workshops available yet.</p>
          ) : (
            <div className="grid gap-3">
              {allWorkshops.map((w) => (
                <Link
                  key={w.id}
                  to={`/workshop?id=${w.id}`}
                  className="glass-panel rounded-xl p-4 text-left hover:border-primary/40 transition-colors group flex items-center gap-4"
                >
                  {w.cover_image_url && (
                    <img src={w.cover_image_url} alt={w.name} className="h-16 w-24 object-cover rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">{w.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.location} &bull; {w.department}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-background overflow-hidden min-h-screen">
      {/* Welcome audio */}
      {workshop?.welcome_audio_url && (
        <audio ref={audioRef} src={workshop.welcome_audio_url} preload="auto" />
      )}

      {/* Workshop info overlay */}
      <div className="absolute top-20 left-4 z-30">
        <div className="glass-panel-strong rounded-xl px-4 py-3">
          <h2 className="text-sm font-semibold">{workshop?.name || 'Workshop'}</h2>
          <p className="text-xs text-muted-foreground">
            {panoramas.length} area{panoramas.length !== 1 ? 's' : ''} &bull;{' '}
            {hotspots.length} hotspot{hotspots.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Panorama selector (mini thumbnails) */}
      {panoramas.length > 1 && (
        <div className="absolute top-20 right-4 z-30">
          <div className="glass-panel-strong rounded-xl p-2 flex flex-col gap-2">
            <div className="flex items-center gap-1 px-2 py-1">
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Areas</span>
            </div>
            {panoramas.map((p) => (
              <button
                key={p.id}
                onClick={() => switchPanorama(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  currentPanorama?.id === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-white/10 text-muted-foreground'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 360° Viewer */}
      {currentPanorama ? (
        <PanoramaViewer
          imageUrl={currentPanorama.image_url}
          hotspots={hotspots}
          onHotspotClick={handleHotspotClick}
        />
      ) : (
        <div className="w-full h-[calc(100vh-4rem)] bg-card flex items-center justify-center">
          <p className="text-muted-foreground">No panoramas available for this workshop.</p>
        </div>
      )}

      {/* Machine Detail Panel */}
      <MachineDetailPanel />
    </div>
  );
}
