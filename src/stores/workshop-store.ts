import { create } from 'zustand';
import type { Workshop, Panorama, Machine, Hotspot } from '@/types/database';

interface WorkshopState {
  // Current workshop context
  currentWorkshop: Workshop | null;
  currentPanorama: Panorama | null;
  panoramas: Panorama[];
  machines: Machine[];
  hotspots: Hotspot[];

  // Viewer state
  selectedHotspot: Hotspot | null;
  isDetailPanelOpen: boolean;
  isFullscreen: boolean;
  hasPlayedWelcomeAudio: boolean;

  // Actions
  setCurrentWorkshop: (workshop: Workshop | null) => void;
  setCurrentPanorama: (panorama: Panorama | null) => void;
  setPanoramas: (panoramas: Panorama[]) => void;
  setMachines: (machines: Machine[]) => void;
  setHotspots: (hotspots: Hotspot[]) => void;
  selectHotspot: (hotspot: Hotspot | null) => void;
  openDetailPanel: () => void;
  closeDetailPanel: () => void;
  toggleFullscreen: () => void;
  setFullscreen: (fullscreen: boolean) => void;
  markWelcomeAudioPlayed: () => void;
  switchPanorama: (panoramaId: string) => void;
  updateMachineStatus: (machineId: string, status: Machine['status']) => void;
  reset: () => void;
}

const initialState = {
  currentWorkshop: null,
  currentPanorama: null,
  panoramas: [],
  machines: [],
  hotspots: [],
  selectedHotspot: null,
  isDetailPanelOpen: false,
  isFullscreen: false,
  hasPlayedWelcomeAudio: false,
};

export const useWorkshopStore = create<WorkshopState>()((set, get) => ({
  ...initialState,

  setCurrentWorkshop: (workshop) => set({ currentWorkshop: workshop }),
  setCurrentPanorama: (panorama) => set({ currentPanorama: panorama }),
  setPanoramas: (panoramas) => set({ panoramas }),
  setMachines: (machines) => set({ machines }),
  setHotspots: (hotspots) => set({ hotspots }),

  selectHotspot: (hotspot) => set({
    selectedHotspot: hotspot,
    isDetailPanelOpen: hotspot !== null,
  }),

  openDetailPanel: () => set({ isDetailPanelOpen: true }),
  closeDetailPanel: () => set({ isDetailPanelOpen: false, selectedHotspot: null }),

  toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),
  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),

  markWelcomeAudioPlayed: () => set({ hasPlayedWelcomeAudio: true }),

  switchPanorama: (panoramaId) => {
    const { panoramas } = get();
    const target = panoramas.find((p) => p.id === panoramaId);
    if (target) {
      set({ currentPanorama: target, selectedHotspot: null, isDetailPanelOpen: false });
    }
  },

  updateMachineStatus: (machineId, status) => {
    set((state) => ({
      machines: state.machines.map((m) =>
        m.id === machineId ? { ...m, status } : m
      ),
    }));
  },

  reset: () => set(initialState),
}));
