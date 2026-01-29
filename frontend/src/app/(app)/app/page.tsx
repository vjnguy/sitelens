"use client";

import { useState, useCallback, useRef, useEffect, useContext, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Layers,
  X,
  Compass,
  ZoomIn,
  ZoomOut,
  Map,
  Satellite,
  Mountain,
  Sun,
  ChevronDown,
  Check,
  Pencil,
  Ruler,
  FileCode,
  Wrench,
  Bot,
  Database,
  HelpCircle,
  PersonStanding,
  FileText,
  BarChart3,
  MousePointer2,
  Save,
  MapPin,
  FolderOpen,
} from "lucide-react";
import type { Layer, Feature, MapState, FeatureCollection } from "@/types/gis";
import { MAPBOX_STYLES, STYLE_INFO, MapStyle } from "@/lib/mapbox/styles";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MapViewerRef, PropertyClickData } from "@/components/map/MapViewer";
import type { LayerStyle } from "@/types/gis";
import { AppContext, type PropertySearchData } from "@/contexts/AppContext";

// Storage key for layer styles
const LAYER_STYLES_KEY = 'siteora-layer-styles';

// Load/save styles from localStorage
const loadSavedStyles = (): Record<string, LayerStyle> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(LAYER_STYLES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveStyles = (styles: Record<string, LayerStyle>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAYER_STYLES_KEY, JSON.stringify(styles));
  } catch (err) {
    console.warn('Failed to save layer styles:', err);
  }
};

// Dynamically import components
const MapViewer = dynamic(
  () => import("@/components/map/MapViewer").then((mod) => mod.MapViewer),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" /></div> }
);

const LayersPanel = dynamic(
  () => import("@/components/map/LayersPanel").then((mod) => mod.LayersPanel),
  { ssr: false }
);

const UnifiedPropertyPanel = dynamic(
  () => import("@/components/map/UnifiedPropertyPanel").then((mod) => mod.UnifiedPropertyPanel),
  { ssr: false }
);

const MeasurementTools = dynamic(
  () => import("@/components/map/MeasurementTools").then((mod) => mod.MeasurementTools),
  { ssr: false }
);

const ElevationPanel = dynamic(
  () => import("@/components/map/ElevationPanel").then((mod) => mod.ElevationPanel),
  { ssr: false }
);

const DrawPanel = dynamic(
  () => import("@/components/map/DrawPanel").then((mod) => mod.DrawPanel),
  { ssr: false }
);

const AIAssistant = dynamic(
  () => import("@/components/map/AIAssistant").then((mod) => mod.AIAssistant),
  { ssr: false }
);

const CodeSandbox = dynamic(
  () => import("@/components/map/CodeSandbox").then((mod) => mod.CodeSandbox),
  { ssr: false }
);

const LayerStyleEditor = dynamic(
  () => import("@/components/map/LayerStyleEditor").then((mod) => mod.LayerStyleEditor),
  { ssr: false }
);

const MapLegend = dynamic(
  () => import("@/components/map/MapLegend").then((mod) => mod.MapLegend),
  { ssr: false }
);

const FeatureInspector = dynamic(
  () => import("@/components/map/FeatureInspector").then((mod) => mod.FeatureInspector),
  { ssr: false }
);

const SaveProjectDialog = dynamic(
  () => import("@/components/app/SaveProjectDialog").then((mod) => mod.SaveProjectDialog),
  { ssr: false }
);

const ProjectMarkersPanel = dynamic(
  () => import("@/components/map/ProjectMarkersPanel").then((mod) => mod.ProjectMarkersPanel),
  { ssr: false }
);

const GeoreferenceDialog = dynamic(
  () => import("@/components/map/GeoreferenceDialog").then((mod) => mod.GeoreferenceDialog),
  { ssr: false }
);

import type { LegendLayer } from "@/components/map/MapLegend";
import { useLayerPersistence } from "@/hooks/useLayerPersistence";
import type { OverlaySettings } from "@/components/map/OverlayLayersPanelV2";

// Default center (Brisbane/SEQ)
const DEFAULT_CENTER: [number, number] = [153.03, -27.47];
const DEFAULT_ZOOM = 12;

function AppMapPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('project');
  const appContext = useContext(AppContext);
  const mapRef = useRef<MapViewerRef>(null);

  // Panel states
  const [showLayersPanel, setShowLayersPanel] = useState(true); // Default to showing layers
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [showElevation, setShowElevation] = useState(false);
  const [showDrawTools, setShowDrawTools] = useState(false);
  const [showCodeSandbox, setShowCodeSandbox] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showMarkersPanel, setShowMarkersPanel] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);

  // Georeferencing state
  const [georefData, setGeorefData] = useState<{ imageUrl: string; fileName: string } | null>(null);

  // Search data from header
  const [initialSearch, setInitialSearch] = useState<PropertySearchData | null>(null);

  // Map state
  const [mapStyle, setMapStyle] = useState<MapStyle>('satelliteStreets');
  const [mapState, setMapState] = useState<MapState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: 0,
  });
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

  // Layer state - with persistence (scoped to current project)
  const {
    layers,
    setLayers,
    projectId: currentProjectId,
    isLoading: isLoadingLayers,
    isSaving: isSavingLayers,
    addLayer: addPersistentLayer,
    updateLayer: updatePersistentLayer,
    deleteLayer: deletePersistentLayer,
  } = useLayerPersistence({ projectId: projectIdFromUrl });
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [savedStyles, setSavedStyles] = useState<Record<string, LayerStyle>>({});
  const [legendLayers, setLegendLayers] = useState<LegendLayer[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  // Project overlay settings
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings | undefined>(undefined);
  const overlaySettingsRef = useRef<OverlaySettings | undefined>(undefined);

  // Register map controls with app context
  useEffect(() => {
    if (!appContext) return;

    appContext.registerMapFlyTo((center, zoom) => {
      mapRef.current?.flyTo(center, zoom);
    });

    appContext.registerLotPlanSearch((lotPlan) => {
      // Open property panel and trigger search
      setShowPropertyPanel(true);
      setShowLayersPanel(false);
    });

    appContext.registerMapSelectHandler(() => {
      // Open property panel in map select mode
      setShowPropertyPanel(true);
      setShowLayersPanel(false);
      setInitialSearch({ type: 'coordinates' }); // Signal to enter map select mode
    });
  }, [appContext]);

  // Watch for pending search from header and auto-open property panel
  useEffect(() => {
    if (!appContext?.pendingSearch) return;

    // Auto-open property panel with search data
    setInitialSearch(appContext.pendingSearch);
    setShowPropertyPanel(true);
    setShowLayersPanel(false);

    // Clear the pending search so it doesn't re-trigger
    appContext.setPendingSearch(null);
  }, [appContext?.pendingSearch]);

  // Load saved styles on mount
  useEffect(() => {
    const styles = loadSavedStyles();
    setSavedStyles(styles);
  }, []);

  // Load project settings (including overlay settings) when project changes
  useEffect(() => {
    if (!projectIdFromUrl) {
      setOverlaySettings(undefined);
      setProjectName(null);
      return;
    }

    async function loadProjectSettings() {
      try {
        const response = await fetch(`/api/projects/${projectIdFromUrl}`);
        if (response.ok) {
          const data = await response.json();
          // Set project name
          setProjectName(data.project?.name || null);

          const settings = data.project?.settings;
          if (settings?.overlays) {
            setOverlaySettings(settings.overlays);
            overlaySettingsRef.current = settings.overlays;
          }
        }
      } catch (err) {
        console.error('[App] Error loading project settings:', err);
      }
    }

    loadProjectSettings();
  }, [projectIdFromUrl]);

  // Save overlay settings to project (debounced)
  const saveOverlaySettings = useCallback(async (settings: OverlaySettings) => {
    if (!projectIdFromUrl) return;

    // Update ref immediately
    overlaySettingsRef.current = settings;

    try {
      await fetch(`/api/projects/${projectIdFromUrl}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            overlays: settings,
          },
        }),
      });
    } catch (err) {
      console.error('[App] Error saving overlay settings:', err);
    }
  }, [projectIdFromUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPropertyPanel(false);
        setShowStylePanel(false);
        setShowToolsDropdown(false);
        setShowMeasurement(false);
        setShowElevation(false);
        setShowCodeSandbox(false);
        setShowAIPanel(false);
        setShowDrawTools(false);
        setShowInspector(false);
        setShowMarkersPanel(false);
        setSelectedFeature(null);
      }
      if (e.key === 'l' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
        setShowLayersPanel(prev => !prev);
      }
      if (e.key === 'p' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
        setShowPropertyPanel(prev => !prev);
        if (!showPropertyPanel) setShowLayersPanel(false);
      }
      if (e.key === 'i' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
        setShowInspector(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPropertyPanel]);

  // Map style change
  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
    mapRef.current?.changeStyle(style);
    setShowStylePanel(false);
  }, []);

  // Layer management - with persistence
  const toggleLayerVisibility = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer) {
      updatePersistentLayer(layerId, { visible: !layer.visible });
    }
  }, [layers, updatePersistentLayer]);

  const removeLayer = useCallback((layerId: string) => {
    deletePersistentLayer(layerId);
  }, [deletePersistentLayer]);

  const handleLayerStyleChange = useCallback((layerId: string, newStyle: LayerStyle) => {
    // Update with persistence
    updatePersistentLayer(layerId, { style: newStyle });
    setSavedStyles(prev => {
      const updated = { ...prev, [layerId]: newStyle };
      saveStyles(updated);
      return updated;
    });
  }, [updatePersistentLayer]);

  const handleAddCustomLayer = useCallback(async (name: string, geojson: FeatureCollection) => {
    const geometryType = geojson.features[0]?.geometry?.type || 'Point';
    let style: LayerStyle;

    switch (geometryType) {
      case 'Polygon':
      case 'MultiPolygon':
        style = { type: 'fill', paint: { 'fill-color': '#9b59b6', 'fill-opacity': 0.4, 'fill-outline-color': '#8e44ad' } };
        break;
      case 'LineString':
      case 'MultiLineString':
        style = { type: 'line', paint: { 'line-color': '#3498db', 'line-width': 2 } };
        break;
      default:
        style = { type: 'circle', paint: { 'circle-radius': 6, 'circle-color': '#e74c3c', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' } };
    }

    // Add layer with persistence (saves to Supabase if authenticated)
    await addPersistentLayer({
      name: `${name} (${geojson.features.length})`,
      type: 'vector',
      source_type: 'geojson',
      source_config: { data: geojson },
      style,
      visible: true,
      order_index: layers.length,
      featureCount: geojson.features.length,
    });
  }, [layers.length, addPersistentLayer]);

  const zoomToLayerExtent = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer?.source_config?.data) return;

    const geojson = layer.source_config.data as GeoJSON.FeatureCollection;
    if (!geojson.features?.length) return;

    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const processCoordinates = (coords: any) => {
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
        coords.forEach((c: any) => processCoordinates(c));
      }
    };

    geojson.features.forEach(feature => {
      if (feature.geometry && 'coordinates' in feature.geometry) {
        processCoordinates(feature.geometry.coordinates);
      }
    });

    if (minLng !== Infinity) {
      mapRef.current?.getMap()?.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 50, duration: 1000 }
      );
    }
  }, [layers]);

  const handleMapMove = useCallback((state: MapState) => {
    setMapState(state);
  }, []);

  // Handle project saved - navigate to project URL
  const handleProjectSaved = useCallback((projectId: string) => {
    // Update URL to include project ID without full reload
    window.history.pushState({}, '', `/app?project=${projectId}`);
    // Reload layers for the new project
    window.location.href = `/app?project=${projectId}`;
  }, []);

  // Add an image layer (from georeferencing or GeoTIFF)
  const addImageLayer = useCallback(async (
    name: string,
    imageUrl: string,
    coordinates: [[number, number], [number, number], [number, number], [number, number]]
  ) => {
    await addPersistentLayer({
      name,
      type: 'raster',
      source_type: 'file',
      source_config: { imageUrl, imageCoordinates: coordinates },
      style: { type: 'raster', paint: { 'raster-opacity': 0.85 } },
      visible: true,
      order_index: layers.length,
    });
  }, [layers.length, addPersistentLayer]);

  // Handle raster import from FileImporter
  const handleRasterImport = useCallback((name: string, imageUrl: string, bounds: [[number, number], [number, number]]) => {
    const needsGeoreferencing = bounds[0][0] === 0 && bounds[0][1] === 0
                             && bounds[1][0] === 0 && bounds[1][1] === 0;

    if (needsGeoreferencing) {
      // Open georeferencing dialog for JPG/PNG
      setGeorefData({ imageUrl, fileName: name });
    } else {
      // GeoTIFF with real bounds — convert to 4 corners and add directly
      const [min, max] = bounds;
      const corners: [[number, number], [number, number], [number, number], [number, number]] = [
        [min[0], max[1]], // top-left
        [max[0], max[1]], // top-right
        [max[0], min[1]], // bottom-right
        [min[0], min[1]], // bottom-left
      ];
      addImageLayer(name, imageUrl, corners);
    }
  }, [addImageLayer]);

  const handleFeatureClick = useCallback((feature: Feature) => {
    setSelectedFeature(feature);
  }, []);

  // Handle property click - auto-open Property Intelligence with clicked property
  const handlePropertyClick = useCallback((data: PropertyClickData) => {
    console.log('[Map] Property clicked:', data);

    // Set the search data and open property panel
    setInitialSearch({
      type: 'lotPlan',
      lotPlan: data.lotPlan,
      coordinates: data.coordinates,
      address: data.address,
    });

    // Open property panel, close layers panel
    setShowPropertyPanel(true);
    setShowLayersPanel(false);

    // Fly to the property
    mapRef.current?.flyTo(data.coordinates, 17);
  }, []);

  const getStyleIcon = (style: MapStyle) => {
    switch (style) {
      case 'satellite':
      case 'satelliteStreets':
        return Satellite;
      case 'terrain':
        return Mountain;
      case 'light':
        return Sun;
      default:
        return Map;
    }
  };

  const formatCoords = (coords: [number, number]) => {
    return `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
  };

  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* Full-screen Map */}
      <div className="absolute inset-0">
        <MapViewer
          ref={mapRef}
          className="w-full h-full"
          initialCenter={DEFAULT_CENTER}
          initialZoom={DEFAULT_ZOOM}
          initialStyle={mapStyle}
          layers={layers}
          onMapLoad={(map) => setMapInstance(map)}
          onFeatureClick={handleFeatureClick}
          onPropertyClick={handlePropertyClick}
          onMapMove={handleMapMove}
          onStyleChange={setMapStyle}
          showControls={false}
        />
      </div>

      {/* Saving Indicator */}
      {isSavingLayers && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            Saving...
          </div>
        </div>
      )}

      {/* Loading Layers Indicator */}
      {isLoadingLayers && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-background/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg border">
            <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading workspace...
          </div>
        </div>
      )}

      {/* Floating Toolbar - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <TooltipProvider delayDuration={300}>
          <div className="bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border/50 px-3 py-2 flex items-center gap-2">
            {/* Style Selector */}
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => setShowStylePanel(!showStylePanel)}
                  >
                    {(() => {
                      const Icon = getStyleIcon(mapStyle);
                      return <Icon className="h-4 w-4" />;
                    })()}
                    <span className="hidden sm:inline text-xs">{STYLE_INFO[mapStyle]?.name || mapStyle}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Map Style</p>
                </TooltipContent>
              </Tooltip>

              {showStylePanel && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-background rounded-xl shadow-lg border overflow-hidden z-50">
                  {(Object.keys(MAPBOX_STYLES) as MapStyle[]).map((style) => {
                    const Icon = getStyleIcon(style);
                    const info = STYLE_INFO[style];
                    return (
                      <button
                        key={style}
                        onClick={() => handleStyleChange(style)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2",
                          mapStyle === style && "bg-primary/10"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{info?.name || style}</span>
                        {mapStyle === style && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Project Indicator or Save Button */}
            {projectIdFromUrl ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => window.location.href = '/projects'}
                  >
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                    <span className="hidden sm:inline text-xs max-w-[120px] truncate">{projectName || 'Project'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>View Projects</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => setShowSaveDialog(true)}
                  >
                    <Save className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Save Project</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Save as Project</p>
                </TooltipContent>
              </Tooltip>
            )}

            <div className="w-px h-6 bg-border" />

            {/* More Tools */}
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showToolsDropdown || showCodeSandbox || showAIPanel ? "default" : "ghost"}
                    size="sm"
                    className="rounded-xl gap-2"
                    onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  >
                    <Wrench className="h-4 w-4" />
                    <span className="hidden sm:inline text-xs">Tools</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>More Tools</p>
                </TooltipContent>
              </Tooltip>

              {showToolsDropdown && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-background rounded-xl shadow-lg border overflow-hidden z-50">
                  <button
                    onClick={() => {
                      setShowCodeSandbox(!showCodeSandbox);
                      setShowToolsDropdown(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2",
                      showCodeSandbox && "bg-primary/10"
                    )}
                  >
                    <FileCode className="h-4 w-4" />
                    <span>Code Sandbox</span>
                  </button>
                  <div
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <Bot className="h-4 w-4" />
                    <span>AI Assistant</span>
                    <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">Coming Soon</span>
                  </div>
                  <div className="border-t my-1" />
                  <button
                    onClick={() => {
                      // Open Google Street View at current map center
                      const [lng, lat] = mapState.center;
                      const streetViewUrl = `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
                      window.open(streetViewUrl, '_blank');
                      setShowToolsDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                  >
                    <PersonStanding className="h-4 w-4" />
                    <span>Street View</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </TooltipProvider>
      </div>

      {/* Coordinates Display - Bottom Left */}
      <div className="absolute bottom-6 left-4 z-10 pointer-events-auto">
        <div className="bg-background/80 backdrop-blur rounded-lg shadow px-3 py-1.5 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Compass className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono">{formatCoords(mapState.center)}</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <span>Z{mapState.zoom.toFixed(1)}</span>
        </div>
      </div>

      {/* Zoom Controls - Bottom Right */}
      <div className="absolute bottom-6 right-4 z-10 pointer-events-auto flex flex-col gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="shadow-lg h-8 w-8"
                onClick={() => mapRef.current?.getMap()?.zoomIn()}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="shadow-lg h-8 w-8"
                onClick={() => mapRef.current?.getMap()?.zoomOut()}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* LEFT ICON SIDEBAR - Property & Layers */}
      <div className="absolute top-4 left-4 z-30 pointer-events-auto flex gap-2 items-start">
        {/* Icon Bar - stays compact */}
        <TooltipProvider delayDuration={300}>
          <div className="bg-background/95 backdrop-blur-xl rounded-xl shadow-lg border border-border/50 p-1.5 flex flex-col gap-1">
            {/* Property Intelligence */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showPropertyPanel ? "default" : "ghost"}
                  size="icon"
                  className={cn("h-9 w-9 rounded-lg", showPropertyPanel && "bg-blue-500 hover:bg-blue-600")}
                  onClick={() => {
                    setShowPropertyPanel(!showPropertyPanel);
                    if (!showPropertyPanel) setShowLayersPanel(false);
                  }}
                >
                  <Database className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-50">
                <p>Property Intelligence (P)</p>
              </TooltipContent>
            </Tooltip>

            {/* Layers */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showLayersPanel ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => {
                    setShowLayersPanel(!showLayersPanel);
                    if (!showLayersPanel) setShowPropertyPanel(false);
                  }}
                >
                  <Layers className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="z-50">
                <p>Data Layers (L)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Expanded Panel - Layers (full height) */}
        {showLayersPanel && !showPropertyPanel && (
          <div className="w-80 h-[calc(100vh-140px)]">
            <LayersPanel
              layers={layers}
              map={mapInstance}
              onToggleVisibility={toggleLayerVisibility}
              onRemoveLayer={removeLayer}
              onZoomToExtent={zoomToLayerExtent}
              onEditStyle={(layerId) => setEditingLayerId(layerId)}
              onAddLayer={() => {}}
              onAddCustomLayer={handleAddCustomLayer}
              onRasterImport={handleRasterImport}
              onClose={() => setShowLayersPanel(false)}
              onActiveLegendLayersChange={setLegendLayers}
              overlaySettings={overlaySettings}
              onOverlaySettingsChange={saveOverlaySettings}
            />
          </div>
        )}

        {/* Expanded Panel - Property Intelligence (full height) */}
        {showPropertyPanel && (
          <div className="w-[380px] h-[calc(100vh-140px)]">
            <UnifiedPropertyPanel
              map={mapInstance}
              initialSearch={initialSearch}
              onSearchConsumed={() => setInitialSearch(null)}
              onClose={() => {
                setShowPropertyPanel(false);
                setInitialSearch(null);
              }}
              className="h-full"
            />
          </div>
        )}
      </div>

      {/* RIGHT ICON SIDEBAR - Tools */}
      <div className="absolute top-4 right-4 z-30 pointer-events-auto flex flex-row-reverse gap-2 items-start">
        {/* Icon Bar - stays compact */}
        <TooltipProvider delayDuration={300}>
          <div className="bg-background/95 backdrop-blur-xl rounded-xl shadow-lg border border-border/50 p-1.5 flex flex-col gap-1">
            {/* Inspect */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showInspector ? "default" : "ghost"}
                  size="icon"
                  className={cn("h-9 w-9 rounded-lg", showInspector && "bg-amber-500 hover:bg-amber-600")}
                  onClick={() => setShowInspector(!showInspector)}
                >
                  <MousePointer2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="z-50">
                <p>Inspect Features (I)</p>
              </TooltipContent>
            </Tooltip>

            {/* Measure */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showMeasurement ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setShowMeasurement(!showMeasurement)}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="z-50">
                <p>Measure Distance & Area</p>
              </TooltipContent>
            </Tooltip>

            {/* Elevation */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showElevation ? "default" : "ghost"}
                  size="icon"
                  className={cn("h-9 w-9 rounded-lg", showElevation && "bg-emerald-500 hover:bg-emerald-600")}
                  onClick={() => setShowElevation(!showElevation)}
                >
                  <Mountain className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="z-50">
                <p>Elevation & Topography</p>
              </TooltipContent>
            </Tooltip>

            {/* Draw */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showDrawTools ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setShowDrawTools(!showDrawTools)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="z-50">
                <p>Draw & Annotate</p>
              </TooltipContent>
            </Tooltip>

            {/* Project Markers - only show when in a saved project */}
            {projectIdFromUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showMarkersPanel ? "default" : "ghost"}
                    size="icon"
                    className={cn("h-9 w-9 rounded-lg", showMarkersPanel && "bg-blue-500 hover:bg-blue-600")}
                    onClick={() => setShowMarkersPanel(!showMarkersPanel)}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="z-50">
                  <p>Project Markers</p>
                </TooltipContent>
              </Tooltip>
            )}

            <div className="my-1 h-px bg-border" />

            {/* Help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="z-50">
                <p>Help & Shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {/* Expanded Panel - Measurement (full height) */}
        {showMeasurement && (
          <div className="w-72 h-[calc(100vh-140px)]">
            <MeasurementTools
              map={mapInstance}
              onClose={() => setShowMeasurement(false)}
            />
          </div>
        )}

        {/* Expanded Panel - Elevation (full height) */}
        {showElevation && (
          <div className="w-72 h-[calc(100vh-140px)]">
            <ElevationPanel
              map={mapInstance}
              onClose={() => setShowElevation(false)}
            />
          </div>
        )}

        {/* Expanded Panel - Draw (full height) */}
        {showDrawTools && mapInstance && (
          <div className="w-64 h-[calc(100vh-140px)]">
            <DrawPanel
              map={mapInstance}
              onDrawCreate={(features) => console.log('Created:', features)}
              onFeaturesChange={(fc) => console.log('All features:', fc)}
              onClose={() => setShowDrawTools(false)}
            />
          </div>
        )}

        {/* Expanded Panel - Project Markers (full height) */}
        {showMarkersPanel && projectIdFromUrl && mapInstance && (
          <div className="w-72 h-[calc(100vh-140px)]">
            <ProjectMarkersPanel
              projectId={projectIdFromUrl}
              map={mapInstance}
              onClose={() => setShowMarkersPanel(false)}
            />
          </div>
        )}
      </div>

      {/* Code Sandbox */}
      {showCodeSandbox && (
        <CodeSandbox
          map={mapInstance}
          onClose={() => setShowCodeSandbox(false)}
        />
      )}

      {/* AI Assistant */}
      {showAIPanel && (
        <AIAssistant
          siteContext={null}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      {/* Feature Inspector */}
      <FeatureInspector
        map={mapInstance}
        enabled={showInspector}
        onClose={() => setShowInspector(false)}
        rightOffset={
          // Calculate offset based on open right-side panels
          showMeasurement || showElevation || showMarkersPanel ? 360 : // w-72 panels + icon bar + gaps
          showDrawTools ? 340 : // w-64 panel + icon bar + gaps
          64 // Just the icon bar
        }
        userLayers={layers}
      />

      {/* Layer Style Editor */}
      {editingLayerId && (
        <div className="pointer-events-auto">
          {(() => {
            const layer = layers.find(l => l.id === editingLayerId);
            if (!layer) return null;
            return (
              <LayerStyleEditor
                layer={layer}
                onStyleChange={handleLayerStyleChange}
                onClose={() => setEditingLayerId(null)}
              />
            );
          })()}
        </div>
      )}

      {/* Map Legend */}
      <AnimatePresence>
        {legendLayers.length > 0 && (
          <MapLegend
            layers={legendLayers}
            onClose={() => setLegendLayers([])}
          />
        )}
      </AnimatePresence>

      {/* Feature Popup */}
      {selectedFeature && (
        <div className="absolute bottom-20 left-4 z-20 pointer-events-auto">
          <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg w-72 overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-medium text-sm">
                {(selectedFeature.properties as Record<string, unknown>)?.name as string || "Feature"}
              </span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedFeature(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {selectedFeature.properties && Object.entries(selectedFeature.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm gap-2">
                  <span className="text-muted-foreground truncate">{key}</span>
                  <span className="font-medium truncate text-right max-w-[150px]">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save Project Dialog */}
      <SaveProjectDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        mapState={mapState}
        layerCount={layers.length}
        onSaved={handleProjectSaved}
      />

      {/* Georeference Dialog */}
      {georefData && (
        <GeoreferenceDialog
          open={!!georefData}
          onOpenChange={(open) => { if (!open) setGeorefData(null); }}
          imageUrl={georefData.imageUrl}
          fileName={georefData.fileName}
          mapCenter={mapState.center}
          mapZoom={mapState.zoom}
          onComplete={(result) => {
            addImageLayer(result.name, result.imageUrl, result.coordinates);
            setGeorefData(null);
          }}
          onCancel={() => setGeorefData(null)}
        />
      )}

      {/* Click outside to close dropdowns */}
      {(showStylePanel || showToolsDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowStylePanel(false);
            setShowToolsDropdown(false);
          }}
        />
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function AppMapPage() {
  return (
    <Suspense fallback={
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    }>
      <AppMapPageContent />
    </Suspense>
  );
}
