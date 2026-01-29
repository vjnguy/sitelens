"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MapPin,
  Landmark,
  TreePine,
  AlertTriangle,
  Map,
  Info,
  Search,
  Globe,
  Building2,
  MapPinned,
  Filter,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  Clock,
  AlertCircle,
  Zap,
  ExternalLink,
  Shield,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ALL_LAYERS,
  getLayersInViewport,
  detectViewportState,
  searchLayers,
  groupLayersByCategory,
  getLayersByLevel,
  addOverlayLayer,
  removeOverlayLayer,
  setOverlayLayerOpacity,
  refreshFeatureLayer,
  bboxIntersects,
  fetchLayerMetadata,
  isDataStale,
  formatDataAge,
  getDataSourceById,
  type OverlayLayer,
  type BoundingBox,
  type LayerCategory,
  type DataLevel,
  type AustralianState,
  type LayerMetadata,
  type DataSource,
} from '@/lib/overlays';
import { LegendLayer } from './MapLegend';

export interface OverlaySettings {
  activeLayers: string[];
  layerOpacity: Record<string, number>;
}

interface OverlayLayersPanelV2Props {
  map: mapboxgl.Map | null;
  className?: string;
  onActiveLegendLayersChange?: (layers: LegendLayer[]) => void;
  /** Initial overlay settings from project (overrides localStorage) */
  initialSettings?: OverlaySettings;
  /** Callback when overlay settings change (for project persistence) */
  onSettingsChange?: (settings: OverlaySettings) => void;
}

// Icons for categories
const CATEGORY_ICONS: Record<LayerCategory, typeof Layers> = {
  hazards: AlertTriangle,
  planning: MapPin,
  environment: TreePine,
  heritage: Landmark,
  infrastructure: Zap,
  boundaries: MapPinned,
  imagery: Map,
};

const CATEGORY_COLORS: Record<LayerCategory, string> = {
  hazards: 'text-red-500',
  planning: 'text-blue-500',
  environment: 'text-green-500',
  heritage: 'text-purple-500',
  infrastructure: 'text-orange-500',
  boundaries: 'text-amber-500',
  imagery: 'text-cyan-500',
};

const CATEGORY_LABELS: Record<LayerCategory, string> = {
  hazards: 'Hazards',
  planning: 'Planning',
  environment: 'Environment',
  heritage: 'Heritage',
  infrastructure: 'Infrastructure',
  boundaries: 'Boundaries',
  imagery: 'Imagery',
};

const LEVEL_ICONS: Record<DataLevel, typeof Globe> = {
  national: Globe,
  state: Building2,
  council: MapPinned,
};

const LEVEL_LABELS: Record<DataLevel, string> = {
  national: 'National',
  state: 'State',
  council: 'Council',
};

// Source display names and icons
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  'brisbane-council': 'Brisbane City Council',
  'logan-council': 'Logan City Council',
  'urban-utilities': 'Urban Utilities',
  'qld-spatial': 'QLD Government',
  'qld-arcgis-online': 'QLD SPP Mapping',
  'nsw-spatial': 'NSW Spatial Services',
  'nsw-planning': 'NSW Planning Portal',
  'geoscience-australia': 'Geoscience Australia',
  'geoscape': 'Geoscape Australia',
  'bom': 'Bureau of Meteorology',
  // Imagery sources
  'esri': 'ESRI World Imagery',
  'google': 'Google Maps',
};

// State abbreviation to full name
const STATE_NAMES: Record<AustralianState, string> = {
  QLD: 'Queensland',
  NSW: 'New South Wales',
  VIC: 'Victoria',
  SA: 'South Australia',
  WA: 'Western Australia',
  NT: 'Northern Territory',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
};

// localStorage key for persisting layer state
const LAYER_STATE_KEY = 'siteora-layer-state';

interface PersistedLayerState {
  activeLayers: string[];
  layerOpacity: Record<string, number>;
  timestamp: number;
}

// Helper to load persisted layer state
const loadPersistedLayerState = (): PersistedLayerState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(LAYER_STATE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as PersistedLayerState;
    // Check if state is less than 30 days old
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > thirtyDays) {
      localStorage.removeItem(LAYER_STATE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

// Helper to save layer state
const saveLayerState = (activeLayers: Set<string>, layerOpacity: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const state: PersistedLayerState = {
      activeLayers: Array.from(activeLayers),
      layerOpacity,
      timestamp: Date.now(),
    };
    localStorage.setItem(LAYER_STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save layer state:', err);
  }
};

export function OverlayLayersPanelV2({
  map,
  className,
  onActiveLegendLayersChange,
  initialSettings,
  onSettingsChange,
}: OverlayLayersPanelV2Props) {
  // State
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>({});
  const [loadingLayers, setLoadingLayers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLevels, setExpandedLevels] = useState<Set<DataLevel>>(new Set(['state']));
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewport, setViewport] = useState<BoundingBox | null>(null);
  const [detectedState, setDetectedState] = useState<AustralianState | null>(null);
  const [showOnlyRelevant, setShowOnlyRelevant] = useState(true);
  const [layerMetadata, setLayerMetadata] = useState<Record<string, LayerMetadata>>({});

  // Track if we've restored persisted state
  const hasRestoredState = useRef(false);
  const isRestoringLayers = useRef(false);

  // Initialize opacity values (prefer project settings > localStorage > defaults)
  useEffect(() => {
    const persistedState = loadPersistedLayerState();
    const initialOpacity: Record<string, number> = {};
    ALL_LAYERS.forEach((layer) => {
      // Priority: initialSettings (from project) > persisted (localStorage) > default
      initialOpacity[layer.id] =
        initialSettings?.layerOpacity?.[layer.id] ??
        persistedState?.layerOpacity[layer.id] ??
        layer.style.opacity;
    });
    setLayerOpacity(initialOpacity);
  }, [initialSettings]);

  // Restore persisted layers or enable default layers when map becomes available
  useEffect(() => {
    if (!map || hasRestoredState.current || isRestoringLayers.current) return;

    const persistedState = loadPersistedLayerState();

    // Determine which layers to restore/enable
    // Priority: initialSettings (from project) > persisted (localStorage) > defaults
    const layersToEnable: OverlayLayer[] = [];

    if (initialSettings && initialSettings.activeLayers.length > 0) {
      // Use project settings
      layersToEnable.push(
        ...initialSettings.activeLayers
          .map(id => ALL_LAYERS.find(l => l.id === id))
          .filter((l): l is OverlayLayer => l !== undefined)
      );
    } else if (persistedState && persistedState.activeLayers.length > 0) {
      // Use localStorage persisted layers
      layersToEnable.push(
        ...persistedState.activeLayers
          .map(id => ALL_LAYERS.find(l => l.id === id))
          .filter((l): l is OverlayLayer => l !== undefined)
      );
    } else {
      // No persisted state - enable default layers
      layersToEnable.push(
        ...ALL_LAYERS.filter(l => l.defaultEnabled)
      );
    }

    if (layersToEnable.length === 0) {
      hasRestoredState.current = true;
      return;
    }

    // Restore/enable layers
    const restoreLayers = async () => {
      isRestoringLayers.current = true;

      // Mark all as loading
      setLoadingLayers(new Set(layersToEnable.map(l => l.id)));

      // Add layers sequentially to avoid race conditions
      const restoredIds = new Set<string>();
      for (const layer of layersToEnable) {
        try {
          const opacity = persistedState?.layerOpacity[layer.id] ?? layer.style.opacity;
          await addOverlayLayer(map, {
            ...layer,
            style: { ...layer.style, opacity },
          });
          restoredIds.add(layer.id);
        } catch (error) {
          console.warn(`Failed to enable layer ${layer.id}:`, error);
        }
      }

      setActiveLayers(restoredIds);
      setLoadingLayers(new Set());
      hasRestoredState.current = true;
      isRestoringLayers.current = false;
    };

    // Wait for map to be fully loaded before restoring
    if (map.loaded()) {
      restoreLayers();
    } else {
      map.once('load', restoreLayers);
    }
  }, [map]);

  // Persist layer state when it changes (debounced)
  useEffect(() => {
    // Don't save while restoring
    if (!hasRestoredState.current) return;

    const timeoutId = setTimeout(() => {
      // Save to localStorage (fallback)
      saveLayerState(activeLayers, layerOpacity);

      // Notify parent for project persistence
      if (onSettingsChange) {
        onSettingsChange({
          activeLayers: Array.from(activeLayers),
          layerOpacity,
        });
      }
    }, 500); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [activeLayers, layerOpacity, onSettingsChange]);

  // Ref to track active layers (avoid stale closures in event handlers)
  const activeLayersRef = useRef<Set<string>>(activeLayers);
  useEffect(() => {
    activeLayersRef.current = activeLayers;
  }, [activeLayers]);

  // Track map viewport and detect state
  useEffect(() => {
    if (!map) return;

    const updateViewport = () => {
      const bounds = map.getBounds();
      if (bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const vp: BoundingBox = [sw.lng, sw.lat, ne.lng, ne.lat];
        setViewport(vp);
        setDetectedState(detectViewportState(vp));
      }
    };

    updateViewport();
    map.on('moveend', updateViewport);

    return () => {
      map.off('moveend', updateViewport);
    };
  }, [map]);

  // Refresh FeatureServer layers on viewport change
  useEffect(() => {
    if (!map) return;

    let debounceTimer: NodeJS.Timeout;

    const refreshFeatureLayers = () => {
      // Debounce to avoid too many requests during rapid panning
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const currentActiveLayers = activeLayersRef.current;

        // Find all active FeatureServer layers and refresh them
        ALL_LAYERS.forEach((layer) => {
          if (
            currentActiveLayers.has(layer.id) &&
            layer.service.type === 'arcgis-feature'
          ) {
            console.log('[Overlay] Refreshing layer on viewport change:', layer.id);
            refreshFeatureLayer(map, layer);
          }
        });
      }, 300); // 300ms debounce
    };

    map.on('moveend', refreshFeatureLayers);

    return () => {
      map.off('moveend', refreshFeatureLayers);
      clearTimeout(debounceTimer);
    };
  }, [map]);

  // Notify parent of active legend layers
  useEffect(() => {
    if (!onActiveLegendLayersChange) return;

    const legendLayers: LegendLayer[] = ALL_LAYERS
      .filter((layer) => activeLayers.has(layer.id) && layer.style.legend?.length)
      .map((layer) => ({
        id: layer.id,
        name: layer.name,
        items: layer.style.legend || [],
      }));

    onActiveLegendLayersChange(legendLayers);
  }, [activeLayers, onActiveLegendLayersChange]);

  // Re-add active layers after style change (with preserved opacity)
  useEffect(() => {
    if (!map) return;

    const handleStyleLoad = () => {
      setTimeout(() => {
        activeLayers.forEach((layerId) => {
          const layer = ALL_LAYERS.find((l) => l.id === layerId);
          if (layer) {
            const opacity = layerOpacity[layerId] ?? layer.style.opacity;
            addOverlayLayer(map, {
              ...layer,
              style: { ...layer.style, opacity },
            });
          }
        });
      }, 100);
    };

    map.on('style.load', handleStyleLoad);
    return () => {
      map.off('style.load', handleStyleLoad);
    };
  }, [map, activeLayers, layerOpacity]);

  // Filter layers based on search and relevance
  const filteredLayers = useMemo(() => {
    let layers = ALL_LAYERS;

    // Search filter
    if (searchQuery.trim()) {
      layers = searchLayers(searchQuery);
    }

    // Relevance filter - only show layers that cover current viewport
    if (showOnlyRelevant && viewport && !searchQuery.trim()) {
      layers = layers.filter((layer) => {
        // National layers and imagery always relevant
        if (layer.level === 'national' || layer.category === 'imagery') return true;
        // Check if layer covers viewport
        return bboxIntersects(viewport, layer.coverage.bounds);
      });
    }

    return layers;
  }, [searchQuery, showOnlyRelevant, viewport]);

  // Separate imagery layers from data layers
  const { imageryLayers, dataLayers } = useMemo(() => {
    const imagery = filteredLayers.filter(l => l.category === 'imagery');
    const data = filteredLayers.filter(l => l.category !== 'imagery');
    return { imageryLayers: imagery, dataLayers: data };
  }, [filteredLayers]);

  // Group data layers by level, then by source, then by category (excludes imagery)
  const groupedLayers = useMemo(() => {
    // Structure: level -> sourceId -> category -> layers
    const byLevel: Record<DataLevel, Record<string, Record<LayerCategory, OverlayLayer[]>>> = {
      national: {},
      state: {},
      council: {},
    };

    dataLayers.forEach((layer) => {
      const sourceId = layer.sourceId;
      if (!byLevel[layer.level][sourceId]) {
        byLevel[layer.level][sourceId] = {
          hazards: [], planning: [], environment: [], heritage: [],
          infrastructure: [], boundaries: [], imagery: []
        };
      }
      byLevel[layer.level][sourceId][layer.category].push(layer);
    });

    return byLevel;
  }, [dataLayers]);

  // Group imagery layers by source
  const groupedImagery = useMemo(() => {
    const bySource: Record<string, OverlayLayer[]> = {};
    imageryLayers.forEach((layer) => {
      if (!bySource[layer.sourceId]) {
        bySource[layer.sourceId] = [];
      }
      bySource[layer.sourceId].push(layer);
    });
    return bySource;
  }, [imageryLayers]);

  // Get unique sources for each level
  const sourcesByLevel = useMemo(() => {
    const result: Record<DataLevel, string[]> = {
      national: [],
      state: [],
      council: [],
    };

    Object.keys(groupedLayers.national).forEach(sourceId => {
      if (Object.values(groupedLayers.national[sourceId]).some(arr => arr.length > 0)) {
        result.national.push(sourceId);
      }
    });
    Object.keys(groupedLayers.state).forEach(sourceId => {
      if (Object.values(groupedLayers.state[sourceId]).some(arr => arr.length > 0)) {
        result.state.push(sourceId);
      }
    });
    Object.keys(groupedLayers.council).forEach(sourceId => {
      if (Object.values(groupedLayers.council[sourceId]).some(arr => arr.length > 0)) {
        result.council.push(sourceId);
      }
    });

    return result;
  }, [groupedLayers]);

  // Count layers per level (excluding imagery)
  const levelCounts = useMemo(() => {
    const counts: Record<DataLevel, { total: number; active: number }> = {
      national: { total: 0, active: 0 },
      state: { total: 0, active: 0 },
      council: { total: 0, active: 0 },
    };

    dataLayers.forEach((layer) => {
      counts[layer.level].total++;
      if (activeLayers.has(layer.id)) {
        counts[layer.level].active++;
      }
    });

    return counts;
  }, [dataLayers, activeLayers]);

  // Count imagery layers
  const imageryCounts = useMemo(() => {
    return {
      total: imageryLayers.length,
      active: imageryLayers.filter(l => activeLayers.has(l.id)).length,
    };
  }, [imageryLayers, activeLayers]);

  // Toggle layer
  const handleToggleLayer = useCallback(
    async (layer: OverlayLayer) => {
      if (!map) return;

      const isActive = activeLayers.has(layer.id);

      if (isActive) {
        removeOverlayLayer(map, layer.id);
        setActiveLayers((prev) => {
          const next = new Set(prev);
          next.delete(layer.id);
          return next;
        });
      } else {
        setLoadingLayers((prev) => new Set(prev).add(layer.id));

        try {
          await addOverlayLayer(map, {
            ...layer,
            style: {
              ...layer.style,
              opacity: layerOpacity[layer.id] ?? layer.style.opacity,
            },
          });
          setActiveLayers((prev) => new Set(prev).add(layer.id));

          // Fetch metadata for freshness info (don't await - background)
          if (!layerMetadata[layer.id]) {
            fetchLayerMetadata(layer).then((metadata) => {
              if (metadata) {
                setLayerMetadata((prev) => ({ ...prev, [layer.id]: metadata }));
              }
            });
          }
        } catch (error) {
          console.error(`Failed to add layer ${layer.id}:`, error);
        } finally {
          setLoadingLayers((prev) => {
            const next = new Set(prev);
            next.delete(layer.id);
            return next;
          });
        }
      }
    },
    [map, activeLayers, layerOpacity, layerMetadata]
  );

  // Handle opacity change
  const handleOpacityChange = useCallback(
    (layerId: string, opacity: number) => {
      setLayerOpacity((prev) => ({ ...prev, [layerId]: opacity }));

      if (map && activeLayers.has(layerId)) {
        setOverlayLayerOpacity(map, layerId, opacity);
      }
    },
    [map, activeLayers]
  );

  // Toggle level expansion
  const toggleLevel = (level: DataLevel) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // Toggle category expansion
  const toggleCategory = (levelCategory: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(levelCategory)) {
        next.delete(levelCategory);
      } else {
        next.add(levelCategory);
      }
      return next;
    });
  };

  // Render a single layer row
  const renderLayerRow = (layer: OverlayLayer) => {
    const isActive = activeLayers.has(layer.id);
    const isLoading = loadingLayers.has(layer.id);
    const opacity = layerOpacity[layer.id] ?? layer.style.opacity;
    const hasData = viewport ? bboxIntersects(viewport, layer.coverage.bounds) : true;

    return (
      <motion.div
        key={layer.id}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          'px-3 py-2 border-b border-border/20 last:border-b-0 transition-all',
          isActive && 'bg-primary/5',
          !hasData && 'opacity-50'
        )}
      >
        <div className="flex items-center gap-2">
          {/* Toggle button */}
          <button
            onClick={() => handleToggleLayer(layer)}
            disabled={isLoading}
            className={cn(
              'p-1 rounded-md transition-all flex-shrink-0',
              isActive
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {isLoading ? (
              <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isActive ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Layer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs truncate transition-colors',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {layer.name}
              </span>
              {!hasData && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 text-muted-foreground">
                  No data here
                </Badge>
              )}
            </div>
          </div>

          {/* State badge for state-level layers */}
          {layer.level === 'state' && layer.coverage.states !== 'all' && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {(layer.coverage.states as AustralianState[])[0]}
            </Badge>
          )}
        </div>

        {/* Opacity slider and metadata when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 ml-6 space-y-2"
            >
              {/* Opacity slider */}
              <div className="flex items-center gap-2">
                <Slider
                  value={[opacity * 100]}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1"
                  onValueChange={([value]) => handleOpacityChange(layer.id, value / 100)}
                />
                <span className="text-[10px] font-mono text-muted-foreground w-7">
                  {Math.round(opacity * 100)}%
                </span>
              </div>

              {/* Data source info */}
              {(() => {
                const source = getDataSourceById(layer.sourceId);
                if (!source) return null;

                return (
                  <div className="p-2 bg-muted/30 rounded-md space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <Database className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="font-medium text-foreground">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Shield className="h-3 w-3 flex-shrink-0" />
                      <span>{source.license}</span>
                    </div>
                    {(layer.sourceUrl || source.portalUrl) && (
                      <a
                        href={layer.sourceUrl || source.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        <span>View data source</span>
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* Data freshness info */}
              {layerMetadata[layer.id] && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  {isDataStale(layerMetadata[layer.id].lastEditDate) ? (
                    <>
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400">
                        Data from {formatDataAge(layerMetadata[layer.id].lastEditDate)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Updated {formatDataAge(layerMetadata[layer.id].lastEditDate)}
                      </span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Render category section
  const renderCategory = (level: DataLevel, sourceId: string, category: LayerCategory, layers: OverlayLayer[]) => {
    if (layers.length === 0) return null;

    const key = `${level}-${sourceId}-${category}`;
    const isExpanded = expandedCategories.has(key);
    const CategoryIcon = CATEGORY_ICONS[category];
    const activeCount = layers.filter((l) => activeLayers.has(l.id)).length;

    return (
      <div key={key} className="border-b border-border/20 last:border-b-0">
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
          onClick={() => toggleCategory(key)}
        >
          <div className="flex items-center gap-2">
            <CategoryIcon className={cn('h-3.5 w-3.5', CATEGORY_COLORS[category])} />
            <span className="text-xs font-medium">{CATEGORY_LABELS[category]}</span>
            <span className="text-[10px] text-muted-foreground">({layers.length})</span>
            {activeCount > 0 && (
              <Badge className="bg-primary/20 text-primary text-[9px] h-4 px-1">
                {activeCount}
              </Badge>
            )}
          </div>
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-muted/5 overflow-hidden"
            >
              {layers.map(renderLayerRow)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Render source section (within a level)
  const renderSource = (level: DataLevel, sourceId: string) => {
    const categories = groupedLayers[level][sourceId];
    if (!categories) return null;

    const nonEmptyCategories = Object.entries(categories).filter(([_, layers]) => layers.length > 0);
    if (nonEmptyCategories.length === 0) return null;

    const key = `${level}-source-${sourceId}`;
    const isExpanded = expandedCategories.has(key);
    const sourceName = SOURCE_DISPLAY_NAMES[sourceId] || sourceId;
    const totalLayers = nonEmptyCategories.reduce((sum, [_, layers]) => sum + layers.length, 0);
    const activeCount = nonEmptyCategories.reduce(
      (sum, [_, layers]) => sum + layers.filter((l) => activeLayers.has(l.id)).length,
      0
    );

    // Determine icon based on source type
    const isUtility = sourceId === 'urban-utilities';
    const SourceIcon = isUtility ? Zap : Building2;
    const iconColor = isUtility ? 'text-blue-500' : 'text-amber-500';

    return (
      <div key={key} className="border-b border-border/30 last:border-b-0">
        <button
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
          onClick={() => toggleCategory(key)}
        >
          <div className="flex items-center gap-2">
            <SourceIcon className={cn('h-3.5 w-3.5', iconColor)} />
            <span className="text-xs font-semibold">{sourceName}</span>
            <span className="text-[10px] text-muted-foreground">({totalLayers})</span>
            {activeCount > 0 && (
              <Badge className="bg-primary/20 text-primary text-[9px] h-4 px-1">
                {activeCount}
              </Badge>
            )}
          </div>
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-muted/10 overflow-hidden pl-2"
            >
              {nonEmptyCategories.map(([category, layers]) =>
                renderCategory(level, sourceId, category as LayerCategory, layers)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Render level section
  const renderLevel = (level: DataLevel) => {
    const sources = sourcesByLevel[level];
    if (sources.length === 0) return null;

    const isExpanded = expandedLevels.has(level);
    const LevelIcon = LEVEL_ICONS[level];
    const { total, active } = levelCounts[level];

    // For state level, show detected state
    let levelLabel = LEVEL_LABELS[level];
    if (level === 'state' && detectedState) {
      levelLabel = `${detectedState} State`;
    }

    // Check if there's only one source - if so, skip the source grouping
    const hasSingleSource = sources.length === 1;

    return (
      <motion.div
        key={level}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border/50 rounded-lg overflow-hidden bg-background/50"
      >
        <button
          className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          onClick={() => toggleLevel(level)}
        >
          <div className="flex items-center gap-2">
            <div className={cn('p-1 rounded-md', isExpanded ? 'bg-muted' : 'bg-transparent')}>
              <LevelIcon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">{levelLabel}</span>
            <span className="text-[10px] text-muted-foreground">
              {total} layer{total !== 1 ? 's' : ''}
            </span>
            {active > 0 && (
              <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5">
                {active} active
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 overflow-hidden"
            >
              {hasSingleSource ? (
                // Single source: show categories directly
                Object.entries(groupedLayers[level][sources[0]])
                  .filter(([_, layers]) => layers.length > 0)
                  .map(([category, layers]) =>
                    renderCategory(level, sources[0], category as LayerCategory, layers)
                  )
              ) : (
                // Multiple sources: show source groups
                sources.map(sourceId => renderSource(level, sourceId))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  // Render imagery section (separate from data layers)
  const renderImagerySection = () => {
    if (imageryLayers.length === 0) return null;

    const imageryExpanded = expandedCategories.has('imagery-section');
    const { total, active } = imageryCounts;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border/50 rounded-lg overflow-hidden bg-background/50"
      >
        <button
          className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          onClick={() => toggleCategory('imagery-section')}
        >
          <div className="flex items-center gap-2">
            <div className={cn('p-1 rounded-md', imageryExpanded ? 'bg-cyan-500/20' : 'bg-transparent')}>
              <Map className="h-4 w-4 text-cyan-500" />
            </div>
            <span className="text-sm font-semibold">Imagery</span>
            <span className="text-[10px] text-muted-foreground">
              {total} layer{total !== 1 ? 's' : ''}
            </span>
            {active > 0 && (
              <Badge className="bg-cyan-500 text-white text-[9px] h-4 px-1.5">
                {active} active
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              imageryExpanded && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {imageryExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border/50 overflow-hidden"
            >
              {Object.entries(groupedImagery).map(([sourceId, layers]) => {
                const sourceKey = `imagery-${sourceId}`;
                const sourceExpanded = expandedCategories.has(sourceKey);
                const sourceName = SOURCE_DISPLAY_NAMES[sourceId] || sourceId;
                const sourceActiveCount = layers.filter(l => activeLayers.has(l.id)).length;

                return (
                  <div key={sourceKey} className="border-b border-border/20 last:border-b-0">
                    <button
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors"
                      onClick={() => toggleCategory(sourceKey)}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-cyan-500" />
                        <span className="text-xs font-medium">{sourceName}</span>
                        <span className="text-[10px] text-muted-foreground">({layers.length})</span>
                        {sourceActiveCount > 0 && (
                          <Badge className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[9px] h-4 px-1">
                            {sourceActiveCount}
                          </Badge>
                        )}
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 text-muted-foreground transition-transform',
                          sourceExpanded && 'rotate-90'
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {sourceExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-muted/5 overflow-hidden"
                        >
                          {layers.map(renderLayerRow)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Data Layers</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] transition-colors',
            activeLayers.size > 0 && 'bg-primary/10 text-primary border-primary/30'
          )}
        >
          {activeLayers.size} active
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search layers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 pr-8 text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Location indicator */}
      {detectedState && !searchQuery && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded-md">
          <div className="flex items-center gap-2">
            <MapPinned className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground">
              Viewing: <span className="text-foreground font-medium">{STATE_NAMES[detectedState]}</span>
            </span>
          </div>
          <button
            onClick={() => setShowOnlyRelevant(!showOnlyRelevant)}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded transition-colors',
              showOnlyRelevant
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {showOnlyRelevant ? 'Relevant only' : 'Show all'}
          </button>
        </div>
      )}

      {/* Search results count */}
      {searchQuery && (
        <div className="px-2 text-[11px] text-muted-foreground">
          Found {filteredLayers.length} layer{filteredLayers.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Layer hierarchy */}
      <div className="space-y-2">
        {/* Imagery section (separate from data layers) */}
        {renderImagerySection()}

        {/* Data layers by level */}
        {renderLevel('national')}
        {renderLevel('state')}
        {renderLevel('council')}
      </div>

      {/* Empty state */}
      {filteredLayers.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No layers found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-primary hover:underline mt-1"
            >
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Info footer */}
      <div className="px-2 py-2 text-[10px] text-muted-foreground bg-muted/20 rounded-md space-y-1.5">
        <div className="flex items-start gap-2">
          <Shield className="h-3 w-3 mt-0.5 flex-shrink-0 text-green-600" />
          <span>
            <span className="font-medium text-foreground">Official government data</span> - All layers sourced directly from Australian federal, state, and council spatial services.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <ExternalLink className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            Click any active layer to view source details and access the original data portal.
          </span>
        </div>
      </div>
    </div>
  );
}

export default OverlayLayersPanelV2;
