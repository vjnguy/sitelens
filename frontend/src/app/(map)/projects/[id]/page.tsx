"use client";

import { useState, useCallback, use, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Layers,
  Database,
  MessageSquare,
  Code,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  MapPin,
  Square,
  Minus,
  X,
  Upload,
  Link2,
  Play,
  Compass,
  ZoomIn,
  ZoomOut,
  Map,
  Satellite,
  Mountain,
  Sun,
  Filter,
  ChevronDown,
  Check,
  Loader2,
  Pencil,
  Focus,
  Palette,
} from "lucide-react";
import type { Layer, Feature, Project, MapState, FeatureCollection } from "@/types/gis";
import { MAPBOX_STYLES, STYLE_INFO, MapStyle } from "@/lib/mapbox/styles";
import { DATA_SOURCES, fetchSpatialData, getDatasetConfig } from "@/lib/api/spatial-data";
import { cn } from "@/lib/utils";
import type { MapViewerRef } from "@/components/map/MapViewer";
import { LayerStyleEditor } from "@/components/map/LayerStyleEditor";
import type { LayerStyle } from "@/types/gis";

// Storage key for layer styles
const LAYER_STYLES_KEY = 'sitelens-layer-styles';

// Load saved styles from localStorage
const loadSavedStyles = (): Record<string, LayerStyle> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(LAYER_STYLES_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

// Save styles to localStorage
const saveStyles = (styles: Record<string, LayerStyle>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAYER_STYLES_KEY, JSON.stringify(styles));
  } catch (err) {
    console.warn('Failed to save layer styles:', err);
  }
};

// Dynamically import MapViewer and DrawPanel
const MapViewer = dynamic(
  () => import("@/components/map/MapViewer").then((mod) => mod.MapViewer),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" /></div> }
);

const DrawPanel = dynamic(
  () => import("@/components/map/DrawPanel").then((mod) => mod.DrawPanel),
  { ssr: false }
);

const LayersPanel = dynamic(
  () => import("@/components/map/LayersPanel").then((mod) => mod.LayersPanel),
  { ssr: false }
);

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Mock project data
const MOCK_PROJECT: Project = {
  id: "1",
  organization_id: "org-1",
  name: "Brisbane CBD Analysis",
  description: "Property analysis for Brisbane CBD development sites",
  bounds: { west: 153.01, south: -27.49, east: 153.04, north: -27.46 },
  settings: { defaultCenter: [153.0251, -27.4698], defaultZoom: 14 },
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-20T14:30:00Z",
};

// Sample GeoJSON data
const SAMPLE_DATA = {
  landmarks: {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id: "1",
        properties: { name: "Story Bridge", type: "landmark", description: "Heritage-listed steel cantilever bridge" },
        geometry: { type: "Point" as const, coordinates: [153.0363, -27.4614] },
      },
      {
        type: "Feature" as const,
        id: "2",
        properties: { name: "South Bank Parklands", type: "recreation", description: "Inner-city cultural precinct" },
        geometry: { type: "Point" as const, coordinates: [153.0220, -27.4785] },
      },
      {
        type: "Feature" as const,
        id: "3",
        properties: { name: "Queen Street Mall", type: "commercial", description: "Pedestrian shopping mall" },
        geometry: { type: "Point" as const, coordinates: [153.0262, -27.4705] },
      },
    ],
  },
  heritage: {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        id: "h1",
        properties: { name: "Brisbane City Botanic Gardens", type: "heritage", zoning: "RE1" },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [153.0280, -27.4720],
            [153.0340, -27.4720],
            [153.0340, -27.4780],
            [153.0280, -27.4780],
            [153.0280, -27.4720],
          ]],
        },
      },
    ],
  },
};

// Use real data sources from the API module

// Geocoding result type
interface GeocodingResult {
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
}

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectMapPage({ params }: ProjectPageProps) {
  const resolvedParams = use(params);
  const mapRef = useRef<MapViewerRef>(null);
  const [project] = useState<Project>(MOCK_PROJECT);

  // Panel states
  const [showLayersPanel, setShowLayersPanel] = useState(true);
  const [showDataSourcesPanel, setShowDataSourcesPanel] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Map state
  const [mapStyle, setMapStyle] = useState<MapStyle>('satelliteStreets');
  const [mapState, setMapState] = useState<MapState>({
    center: project.settings.defaultCenter || [153.0251, -27.4698],
    zoom: project.settings.defaultZoom || 14,
    bearing: 0,
    pitch: 0,
  });

  // Data source state
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [dataFilters, setDataFilters] = useState<Record<string, string>>({});

  // Layer state
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: "landmarks",
      project_id: resolvedParams.id,
      name: "Brisbane Landmarks",
      type: "vector",
      source_type: "geojson",
      source_config: { data: SAMPLE_DATA.landmarks },
      style: {
        type: "circle",
        paint: {
          "circle-radius": 8,
          "circle-color": "#3bb2d0",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      },
      visible: true,
      order_index: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: "heritage",
      project_id: resolvedParams.id,
      name: "Heritage Areas",
      type: "vector",
      source_type: "geojson",
      source_config: { data: SAMPLE_DATA.heritage },
      style: {
        type: "fill",
        paint: {
          "fill-color": "#8B4513",
          "fill-opacity": 0.3,
          "fill-outline-color": "#8B4513",
        },
      },
      visible: true,
      order_index: 1,
      created_at: new Date().toISOString(),
    },
  ]);

  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [showDrawTools, setShowDrawTools] = useState(false);
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);
  const [cadastreLoaded, setCadastreLoaded] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [savedStyles, setSavedStyles] = useState<Record<string, LayerStyle>>({});

  // Feature popup drag state
  const [popupPosition, setPopupPosition] = useState({ x: 16, y: 0 }); // bottom-left default (from CSS)
  const [isDraggingPopup, setIsDraggingPopup] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Ref to track pending refresh and current layers
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string>('');
  const layersRef = useRef<Layer[]>(layers);

  // Keep layersRef in sync
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // Load saved styles on mount
  useEffect(() => {
    const styles = loadSavedStyles();
    setSavedStyles(styles);

    // Apply saved styles to existing layers
    if (Object.keys(styles).length > 0) {
      setLayers(prev => prev.map(layer => {
        const savedStyle = styles[layer.id];
        if (savedStyle) {
          return { ...layer, style: savedStyle };
        }
        return layer;
      }));
    }
  }, []);

  // Handle layer style change from the style editor
  const handleLayerStyleChange = useCallback((layerId: string, newStyle: LayerStyle) => {
    // Update the layer with new style
    setLayers(prev => prev.map(layer =>
      layer.id === layerId ? { ...layer, style: newStyle } : layer
    ));

    // Save to localStorage
    setSavedStyles(prev => {
      const updated = { ...prev, [layerId]: newStyle };
      saveStyles(updated);
      return updated;
    });
  }, []);

  // Refresh dynamic layers based on current viewport
  const refreshDynamicLayers = useCallback(async (forceRefresh = false) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;
    const boundsKey = `${bounds.getWest().toFixed(4)},${bounds.getSouth().toFixed(4)},${bounds.getEast().toFixed(4)},${bounds.getNorth().toFixed(4)}`;

    // Skip if bounds haven't changed significantly (unless forced)
    if (!forceRefresh && boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];

    // Find all dynamic layers from ref (to avoid stale closure)
    const currentLayers = layersRef.current;
    const dynamicLayers = currentLayers.filter(l => l.dynamicSource);
    if (dynamicLayers.length === 0) return;

    console.log('[Dynamic] Refreshing', dynamicLayers.length, 'layers for viewport:', boundsKey);

    // Mark layers as loading
    setLayers(prev => prev.map(l =>
      l.dynamicSource ? { ...l, isLoading: true } : l
    ));

    // Refresh each dynamic layer
    for (const layer of dynamicLayers) {
      if (!layer.dynamicSource) continue;

      try {
        const { sourceId, datasetId, filters, maxFeatures } = layer.dynamicSource;

        const geojson = await fetchSpatialData(sourceId, datasetId, {
          bbox,
          filters,
          limit: maxFeatures || 2000,
        });

        console.log(`[Dynamic] Layer "${layer.id}" loaded ${geojson.features.length} features`);

        // Update layer with new data
        setLayers(prev => prev.map(l => {
          if (l.id !== layer.id) return l;
          const datasetConfig = getDatasetConfig(sourceId, datasetId);
          return {
            ...l,
            source_config: { data: geojson },
            name: `${datasetConfig?.name || datasetId} (${geojson.features.length})`,
            featureCount: geojson.features.length,
            isLoading: false,
          };
        }));
      } catch (err) {
        console.error(`[Dynamic] Failed to refresh layer "${layer.id}":`, err);
        setLayers(prev => prev.map(l =>
          l.id === layer.id ? { ...l, isLoading: false } : l
        ));
      }
    }
  }, []); // No dependencies - uses refs

  // Add default cadastral layer when map is ready
  useEffect(() => {
    if (!mapInstance || cadastreLoaded) return;

    console.log('[Cadastre] Adding default dynamic cadastral layer...');

    // Create a dynamic cadastral layer
    const cadastreLayer: Layer = {
      id: "qld-cadastre",
      project_id: resolvedParams.id,
      name: "QLD Cadastre (loading...)",
      type: "vector",
      source_type: "geojson",
      source_config: { data: { type: "FeatureCollection", features: [] } },
      style: {
        type: "fill",
        paint: {
          "fill-color": "#ff6600",
          "fill-opacity": 0.4,
          "fill-outline-color": "#cc3300",
        },
      },
      visible: true,
      order_index: 0,
      created_at: new Date().toISOString(),
      dynamicSource: {
        sourceId: 'qld-spatial',
        datasetId: 'cadastre',
        filters: { parcel_typ: 'Lot Type Parcel' },
        maxFeatures: 3000,
      },
      isLoading: true,
    };

    setLayers(prev => [cadastreLayer, ...prev]);
    setCadastreLoaded(true);

    // Trigger initial load after a short delay
    setTimeout(() => {
      refreshDynamicLayers(true);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, cadastreLoaded, resolvedParams.id]);

  // Geocoding search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !MAPBOX_TOKEN) return;

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        setSearchResults(data.features.map((f: any) => ({
          place_name: f.place_name,
          center: f.center as [number, number],
          bbox: f.bbox,
        })));
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchSelect = useCallback((result: GeocodingResult) => {
    if (mapRef.current) {
      mapRef.current.flyTo(result.center, 15);
    }
    setSearchQuery(result.place_name);
    setShowSearchResults(false);
  }, []);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  }, [handleSearch, searchQuery]);

  // Map style change
  const handleStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
    if (mapRef.current) {
      mapRef.current.changeStyle(style);
    }
    setShowStylePanel(false);
  }, []);

  // Layer management
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));
  }, []);

  // Zoom to the extent of a layer's features
  const zoomToLayerExtent = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.source_config?.data) return;

    const geojson = layer.source_config.data as GeoJSON.FeatureCollection;
    if (!geojson.features || geojson.features.length === 0) return;

    // Calculate bounds from all features
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const processCoordinates = (coords: number[] | number[][] | number[][][] | number[][][][]) => {
      if (typeof coords[0] === 'number') {
        // Single coordinate [lng, lat]
        const [lng, lat] = coords as number[];
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
        // Array of coordinates
        (coords as (number[] | number[][] | number[][])[]).forEach(c => processCoordinates(c as number[]));
      }
    };

    geojson.features.forEach(feature => {
      if (feature.geometry && 'coordinates' in feature.geometry) {
        processCoordinates(feature.geometry.coordinates as number[]);
      }
    });

    if (minLng !== Infinity && maxLng !== -Infinity) {
      const map = mapRef.current?.getMap();
      if (map) {
        // Add padding to bounds
        const padding = 50;
        map.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding, duration: 1000 }
        );
        console.log(`[Zoom] Zooming to layer "${layer.name}" bounds:`, { minLng, minLat, maxLng, maxLat });
      }
    }
  }, [layers]);

  // Add layer from data source with filters - fetches real data
  const addLayerFromDataset = useCallback(async (sourceId: string, datasetId: string, filters: Record<string, string>) => {
    const datasetConfig = getDatasetConfig(sourceId, datasetId);
    if (!datasetConfig) return;

    setIsLoadingData(true);
    setLoadingError(null);

    try {
      // Get current map bounds and expand them for better coverage
      const bounds = mapRef.current?.getMap()?.getBounds();
      let bbox: [number, number, number, number] | undefined;

      if (bounds) {
        // Expand bounds by 50% to ensure we get features at the edges
        const width = bounds.getEast() - bounds.getWest();
        const height = bounds.getNorth() - bounds.getSouth();
        const expandW = width * 0.25;
        const expandH = height * 0.25;

        bbox = [
          bounds.getWest() - expandW,
          bounds.getSouth() - expandH,
          bounds.getEast() + expandW,
          bounds.getNorth() + expandH,
        ];
      }

      // Clean up filters - remove empty values
      const cleanFilters: Record<string, string> = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim()) {
          cleanFilters[key] = value.trim();
        }
      });

      console.log('[Data] Fetching from:', sourceId, datasetId);
      console.log('[Data] Bbox:', bbox);

      // Fetch data from the API
      const geojson = await fetchSpatialData(sourceId, datasetId, {
        bbox,
        filters: cleanFilters,
        limit: 500, // Limit for performance
      });

      console.log('[Data] Received features:', geojson.features.length);

      const hasFilters = Object.keys(cleanFilters).length > 0;
      const featureCount = geojson.features.length;

      if (featureCount === 0) {
        setLoadingError('No features found in current map view. Try zooming out or panning to a different area.');
        setIsLoadingData(false);
        return;
      }

      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        project_id: resolvedParams.id,
        name: `${datasetConfig.name}${hasFilters ? ' (filtered)' : ''} (${featureCount})`,
        type: "vector",
        source_type: "geojson",
        source_config: { data: geojson },
        style: datasetConfig.defaultStyle,
        visible: true,
        order_index: layers.length,
        created_at: new Date().toISOString(),
        // Enable dynamic loading for this layer
        dynamicSource: {
          sourceId,
          datasetId,
          filters: cleanFilters,
          maxFeatures: 2000,
        },
        featureCount,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedSource(null);
      setSelectedDataset(null);
      setDataFilters({});
      setShowDataSourcesPanel(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setLoadingError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoadingData(false);
    }
  }, [layers.length, resolvedParams.id]);

  const handleFeatureClick = useCallback((feature: Feature) => {
    setSelectedFeature(feature);
  }, []);

  // Handle custom layer addition from LayersPanel
  const handleAddCustomLayer = useCallback((name: string, geojson: FeatureCollection) => {
    const geometryType = geojson.features[0]?.geometry?.type || 'Point';
    let style: LayerStyle;

    switch (geometryType) {
      case 'Polygon':
      case 'MultiPolygon':
        style = {
          type: 'fill',
          paint: {
            'fill-color': '#9b59b6',
            'fill-opacity': 0.4,
            'fill-outline-color': '#8e44ad',
          },
        };
        break;
      case 'LineString':
      case 'MultiLineString':
        style = {
          type: 'line',
          paint: {
            'line-color': '#3498db',
            'line-width': 2,
          },
        };
        break;
      default:
        style = {
          type: 'circle',
          paint: {
            'circle-radius': 6,
            'circle-color': '#e74c3c',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
          },
        };
    }

    const newLayer: Layer = {
      id: `custom-${Date.now()}`,
      project_id: resolvedParams.id,
      name: `${name} (${geojson.features.length})`,
      type: 'vector',
      source_type: 'geojson',
      source_config: { data: geojson },
      style,
      visible: true,
      order_index: layers.length,
      created_at: new Date().toISOString(),
      featureCount: geojson.features.length,
    };

    setLayers(prev => [...prev, newLayer]);
  }, [resolvedParams.id, layers.length]);

  const handleMapMove = useCallback((state: MapState) => {
    setMapState(state);

    // Debounced refresh of dynamic layers
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      refreshDynamicLayers();
    }, 500); // 500ms debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }} className="bg-slate-900">
      {/* Full-screen Map */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MapViewer
          ref={mapRef}
          className="w-full h-full"
          initialCenter={project.settings.defaultCenter}
          initialZoom={project.settings.defaultZoom}
          initialStyle={mapStyle}
          layers={layers}
          onMapLoad={(map) => setMapInstance(map)}
          onFeatureClick={handleFeatureClick}
          onMapMove={handleMapMove}
          onStyleChange={setMapStyle}
          showControls={false}
        />
      </div>

      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left - Navigation */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link href="/projects">
            <Button variant="secondary" size="sm" className="shadow-lg">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Projects
            </Button>
          </Link>
          <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg px-3 py-1.5 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{project.name}</span>
          </div>
        </div>

        {/* Center - Search with Geocoding */}
        <div className="pointer-events-auto relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              placeholder="Search location or address..."
              className="w-96 pl-9 pr-10 bg-background/95 backdrop-blur shadow-lg"
            />
            {isSearching ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            ) : searchQuery && (
              <button
                onClick={() => handleSearch(searchQuery)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 w-full bg-background rounded-lg shadow-lg border overflow-hidden z-50">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{result.place_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right - Panel toggles */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Style Selector */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="shadow-lg"
              onClick={() => setShowStylePanel(!showStylePanel)}
            >
              {(() => {
                const Icon = getStyleIcon(mapStyle);
                return <Icon className="h-4 w-4 mr-1" />;
              })()}
              {STYLE_INFO[mapStyle]?.name || 'Map'}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>

            {showStylePanel && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-background rounded-lg shadow-lg border overflow-hidden z-50">
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
                      <div className="flex-1">
                        <p className="font-medium">{info?.name || style}</p>
                        <p className="text-xs text-muted-foreground">{info?.description}</p>
                      </div>
                      {mapStyle === style && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            variant={showLayersPanel ? "default" : "secondary"}
            size="sm"
            className="shadow-lg"
            onClick={() => setShowLayersPanel(!showLayersPanel)}
          >
            <Layers className="h-4 w-4 mr-1" />
            Layers
          </Button>
          <Button
            variant={showDrawTools ? "default" : "secondary"}
            size="sm"
            className="shadow-lg"
            onClick={() => setShowDrawTools(!showDrawTools)}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Draw
          </Button>
          <Button
            variant={showAIPanel ? "default" : "secondary"}
            size="sm"
            className="shadow-lg"
            onClick={() => setShowAIPanel(!showAIPanel)}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            AI
          </Button>
        </div>
      </div>

      {/* Left Panel - Layers/Data/Code */}
      {showLayersPanel && (
        <div className="absolute top-20 left-4 bottom-20 w-80 z-10 pointer-events-auto">
          <LayersPanel
            layers={layers}
            onToggleVisibility={toggleLayerVisibility}
            onRemoveLayer={removeLayer}
            onZoomToExtent={zoomToLayerExtent}
            onEditStyle={(layerId) => setEditingLayerId(layerId)}
            onAddLayer={() => setShowDataSourcesPanel(true)}
            onAddCustomLayer={handleAddCustomLayer}
            onClose={() => setShowLayersPanel(false)}
          />
        </div>
      )}

      {/* Right Panel - Data Sources with Filtering */}
      {showDataSourcesPanel && (
        <div className="absolute top-20 right-4 bottom-20 w-96 z-10 pointer-events-auto">
          <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg h-full flex flex-col overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">Data Sources</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowDataSourcesPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Source Selection */}
              {!selectedSource ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">SELECT A DATA SOURCE</p>
                  {DATA_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => source.datasets && source.datasets.length > 0 && setSelectedSource(source.id)}
                      className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="font-medium">{source.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">{source.type}</Badge>
                      </div>
                      {source.datasets && source.datasets.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {source.datasets.length} datasets available
                        </p>
                      )}
                    </button>
                  ))}

                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">QUICK ADD</p>
                    <div className="space-y-1">
                      <Button variant="outline" size="sm" className="w-full justify-start h-9">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload GeoJSON / Shapefile
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start h-9">
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect API / WMS
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !selectedDataset ? (
                /* Dataset Selection */
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedSource(null)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to sources
                  </button>

                  <p className="text-xs font-medium text-muted-foreground">
                    SELECT A DATASET FROM {DATA_SOURCES.find(s => s.id === selectedSource)?.name.toUpperCase()}
                  </p>

                  {DATA_SOURCES.find(s => s.id === selectedSource)?.datasets?.map((dataset) => (
                    <button
                      key={dataset.id}
                      onClick={() => setSelectedDataset(dataset.id)}
                      className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                    >
                      <p className="font-medium">{dataset.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dataset.geometryType === 'polygon' ? 'Polygons' : dataset.geometryType === 'line' ? 'Lines' : 'Points'} • {dataset.fields.length} fields
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                /* Filter Configuration */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedDataset(null)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Back to datasets
                  </button>

                  {(() => {
                    const source = DATA_SOURCES.find(s => s.id === selectedSource);
                    const dataset = source?.datasets?.find(d => d.id === selectedDataset);
                    if (!dataset) return null;

                    return (
                      <>
                        <div>
                          <p className="font-medium">{dataset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Configure filters to narrow down the data (fetches from current map view)
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Filter className="h-4 w-4" />
                            Filters (optional)
                          </div>

                          {dataset.fields.filter(f => f.filterable).map((field) => (
                            <div key={field.name}>
                              <Label className="text-xs">{field.label}</Label>
                              <Input
                                placeholder={`Filter by ${field.label.toLowerCase()}...`}
                                value={dataFilters[field.name] || ''}
                                onChange={(e) => setDataFilters(prev => ({
                                  ...prev,
                                  [field.name]: e.target.value
                                }))}
                                className="h-8 text-sm mt-1"
                              />
                            </div>
                          ))}
                        </div>

                        {loadingError && (
                          <div className="bg-destructive/10 text-destructive text-xs p-2 rounded">
                            {loadingError}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setDataFilters({})}
                            disabled={isLoadingData}
                          >
                            Clear Filters
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => addLayerFromDataset(selectedSource!, selectedDataset!, dataFilters)}
                            disabled={isLoadingData}
                          >
                            {isLoadingData ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Add Layer
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Panel */}
      {showAIPanel && (
        <div className="absolute top-20 right-4 bottom-20 w-80 z-10 pointer-events-auto">
          <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg h-full flex flex-col overflow-hidden">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">AI Assistant</span>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAIPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="bg-muted rounded-lg p-3 mb-3">
                <p className="text-sm">
                  Hi! I can help you analyze your spatial data. Try asking:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>• "What's the total area of heritage zones?"</li>
                  <li>• "Find all points within 500m of Circular Quay"</li>
                  <li>• "What zoning applies to The Rocks?"</li>
                </ul>
              </div>
            </div>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask about your data..."
                  className="flex-1"
                />
                <Button size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Feature Popup - Draggable */}
      {selectedFeature && (
        <div
          className="absolute z-20 pointer-events-auto"
          style={{
            left: popupPosition.x,
            bottom: popupPosition.y || 16,
            cursor: isDraggingPopup ? 'grabbing' : 'default',
          }}
          onMouseMove={(e) => {
            if (!isDraggingPopup) return;
            e.preventDefault();
            const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (!parentRect) return;
            setPopupPosition({
              x: e.clientX - parentRect.left - dragOffset.x,
              y: parentRect.bottom - e.clientY - dragOffset.y,
            });
          }}
          onMouseUp={() => setIsDraggingPopup(false)}
          onMouseLeave={() => setIsDraggingPopup(false)}
        >
          <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg w-72 overflow-hidden">
            <div
              className="p-3 border-b flex items-center justify-between cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                if (!rect) return;
                setDragOffset({
                  x: e.clientX - rect.left,
                  y: rect.bottom - e.clientY,
                });
                setIsDraggingPopup(true);
              }}
            >
              <span className="font-medium text-sm select-none">
                {(selectedFeature.properties as Record<string, unknown>)?.name as string || "Feature"}
              </span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                setSelectedFeature(null);
                setPopupPosition({ x: 16, y: 0 }); // Reset position
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              {selectedFeature.properties && Object.entries(selectedFeature.properties).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm gap-2">
                  <span className="text-muted-foreground truncate">{key}</span>
                  <span className="font-medium truncate text-right max-w-[150px]" title={String(value)}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Draw Panel - Right Side */}
      {showDrawTools && mapInstance && (
        <DrawPanel
          map={mapInstance}
          onDrawCreate={(features) => {
            console.log('Created:', features);
          }}
          onFeaturesChange={(fc) => {
            // Could add drawn features as a layer
            console.log('All features:', fc);
          }}
          onClose={() => setShowDrawTools(false)}
        />
      )}

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

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-auto flex flex-col gap-1">
        <Button size="icon" variant="secondary" className="shadow-lg h-8 w-8">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="shadow-lg h-8 w-8">
          <ZoomOut className="h-4 w-4" />
        </Button>
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        <div className="bg-background/80 backdrop-blur rounded-lg shadow px-3 py-1.5 flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Compass className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono">{formatCoords(mapState.center)}</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <span>Zoom: {mapState.zoom.toFixed(1)}</span>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showSearchResults || showStylePanel) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowSearchResults(false);
            setShowStylePanel(false);
          }}
        />
      )}
    </div>
  );
}
