declare module 'pannellum' {
  interface PannellumViewerOptions {
    panorama?: string;
    type?: 'equirectangular' | 'cubemap' | 'multires';
    autoLoad?: boolean;
    autoRotate?: number;
    compass?: boolean;
    showControls?: boolean;
    showFullscreenCtrl?: boolean;
    showZoomCtrl?: boolean;
    mouseZoom?: boolean | 'fullscreenonly';
    draggable?: boolean;
    disableKeyboardCtrl?: boolean;
    hfov?: number;
    minHfov?: number;
    maxHfov?: number;
    pitch?: number;
    yaw?: number;
    haov?: number;
    vaov?: number;
    maxPitch?: number;
    minPitch?: number;
    maxYaw?: number;
    minYaw?: number;
    hotSpots?: PannellumHotSpot[];
    hotSpotDebug?: boolean;
    sceneFadeDuration?: number;
    preview?: string;
    previewTitle?: string;
    previewAuthor?: string;
    strings?: Record<string, string>;
    friction?: number;
    orientationOnByDefault?: boolean;
    crossOrigin?: string;
  }

  interface PannellumHotSpot {
    id?: string;
    pitch: number;
    yaw: number;
    type: 'info' | 'scene' | 'custom';
    text?: string;
    URL?: string;
    sceneId?: string;
    targetPitch?: number;
    targetYaw?: number;
    targetHfov?: number;
    cssClass?: string;
    createTooltipFunc?: (hotSpotDiv: HTMLDivElement, args: unknown) => void;
    createTooltipArgs?: unknown;
    clickHandlerFunc?: (event: MouseEvent, args: unknown) => void;
    clickHandlerArgs?: unknown;
    div?: HTMLDivElement;
  }

  interface PannellumViewer {
    getYaw: () => number;
    getPitch: () => number;
    getHfov: () => number;
    setYaw: (yaw: number, animated?: boolean) => this;
    setPitch: (pitch: number, animated?: boolean) => this;
    setHfov: (hfov: number, animated?: boolean) => this;
    lookAt: (pitch: number, yaw: number, hfov?: number, animated?: boolean) => this;
    startAutoRotate: (speed?: number) => this;
    stopAutoRotate: () => this;
    getContainer: () => HTMLElement;
    addHotSpot: (hotspot: PannellumHotSpot, sceneId?: string) => this;
    removeHotSpot: (hotSpotId: string, sceneId?: string) => boolean;
    destroy: () => void;
    toggleFullscreen: () => void;
    isOrientationSupported: () => boolean;
    startOrientation: () => void;
    stopOrientation: () => void;
    isOrientationActive: () => boolean;
    on: (event: string, callback: (...args: unknown[]) => void) => this;
    off: (event: string, callback: (...args: unknown[]) => void) => this;
    isLoaded: () => boolean;
    loadScene: (sceneId: string, targetPitch?: number, targetYaw?: number, targetHfov?: number) => void;
    mouseEventToCoords: (event: MouseEvent) => [number, number];
  }

  function viewer(
    container: string | HTMLElement,
    initialConfig: PannellumViewerOptions
  ): PannellumViewer;
}
