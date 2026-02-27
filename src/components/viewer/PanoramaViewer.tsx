import { useEffect, useRef, useCallback, useState } from 'react';
import type { Hotspot } from '@/types/database';
import { hotspotCssType } from '@/types/database';
import { useWorkshopStore } from '@/stores/workshop-store';

interface PanoramaViewerProps {
  imageUrl: string;
  hotspots: Hotspot[];
  onHotspotClick: (hotspot: Hotspot) => void;
}

export function PanoramaViewer({ imageUrl, hotspots, onHotspotClick }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isFullscreen } = useWorkshopStore();

  const initViewer = useCallback(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Dynamically load Pannellum
    const pannellum = (window as any).pannellum;
    if (!pannellum) {
      console.error('Pannellum not loaded');
      return;
    }

    viewerRef.current = pannellum.viewer(containerRef.current, {
      type: 'equirectangular',
      panorama: imageUrl,
      autoLoad: true,
      showControls: false,
      showFullscreenCtrl: false,
      showZoomCtrl: false,
      mouseZoom: true,
      compass: false,
      hfov: 100,
      minHfov: 50,
      maxHfov: 120,
      friction: 0.15,
      autoRotate: -0.5,
      orientationOnByDefault: false,
      crossOrigin: 'anonymous',
      hotSpotDebug: false,
      hotSpots: [],
    });

    viewerRef.current.on('load', () => {
      setIsLoaded(true);
      viewerRef.current?.stopAutoRotate();

      // Add hotspots only after the scene has fully loaded
      hotspots.forEach((hs) => {
        try {
          viewerRef.current?.addHotSpot({
            id: hs.id,
            pitch: hs.pitch,
            yaw: hs.yaw,
            type: 'custom',
            cssClass: `dsw-hotspot dsw-hotspot-${hotspotCssType(hs.type)}`,
            createTooltipFunc: (div: HTMLDivElement) => {
              div.innerHTML = `
                <div class="dsw-hotspot-marker ${hotspotCssType(hs.type)} hotspot-pulse">
                  <div class="dsw-hotspot-inner"></div>
                </div>
                <div class="dsw-hotspot-tooltip">${hs.label}</div>
              `;
            },
            clickHandlerFunc: () => onHotspotClick(hs),
          });
        } catch (e) {
          console.warn('Failed to add hotspot', hs.id, e);
        }
      });
    });
  }, [imageUrl, hotspots, onHotspotClick]);

  useEffect(() => {
    // Load Pannellum CSS/JS if not already present
    if (!(window as any).pannellum) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.onload = () => initViewer();
      document.head.appendChild(script);
    } else {
      initViewer();
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [initViewer]);

  // Handle zoom
  const zoomIn = useCallback(() => {
    if (viewerRef.current) {
      const hfov = viewerRef.current.getHfov();
      viewerRef.current.setHfov(Math.max(hfov - 10, 50), true);
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (viewerRef.current) {
      const hfov = viewerRef.current.getHfov();
      viewerRef.current.setHfov(Math.min(hfov + 10, 120), true);
    }
  }, []);

  const resetView = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.lookAt(0, 0, 100, true);
    }
  }, []);

  return (
    <div className={`relative w-full ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'} bg-black`}>
      {/* Pannellum container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading panorama...</p>
          </div>
        </div>
      )}

      {/* Viewer controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
        <button
          onClick={zoomIn}
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          aria-label="Zoom in"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={zoomOut}
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          aria-label="Zoom out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded-lg glass-panel hover:bg-white/10 transition-colors"
          aria-label="Reset view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
          </svg>
        </button>
      </div>

      {/* Drag instruction */}
      {isLoaded && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="px-4 py-2 rounded-full glass-panel text-xs text-muted-foreground fade-in">
            Drag to look around &bull; Scroll to zoom &bull; Click hotspots to interact
          </div>
        </div>
      )}
    </div>
  );
}
