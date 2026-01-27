"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Search,
  MapPin,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Building2,
  Droplets,
  Flame,
  Landmark,
  TreePine,
  Construction,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import {
  searchProperty,
  getPropertyAtPoint,
  getPropertyOverlays,
  analyzePropertyConstraints,
  PropertyConstraint,
  OVERLAY_LAYERS,
  OverlayLayerId,
} from '@/lib/api/logan-planning';

interface PropertyAnalysisPanelProps {
  map: mapboxgl.Map | null;
  onPropertySelect?: (property: Feature | null) => void;
  onOverlaysLoaded?: (overlays: Array<{ id: string; name: string; data: FeatureCollection; style: any; category: string }>) => void;
  onClose?: () => void;
  className?: string;
}

interface PropertyInfo {
  lotPlan: string;
  address?: string;
  area?: number;
  owner?: string;
  tenure?: string;
  localGovernment?: string;
  zoning?: string;
}

const CATEGORY_ICONS: Record<string, typeof AlertTriangle> = {
  'Planning': Building2,
  'Hazards': AlertTriangle,
  'Heritage': Landmark,
  'Environment': TreePine,
  'Infrastructure': Construction,
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: typeof AlertTriangle }> = {
  high: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: AlertTriangle },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: AlertCircle },
  low: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: Info },
  info: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', icon: CheckCircle },
};

export function PropertyAnalysisPanel({
  map,
  onPropertySelect,
  onOverlaysLoaded,
  onClose,
  className,
}: PropertyAnalysisPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Feature[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Feature | null>(null);
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo | null>(null);
  const [constraints, setConstraints] = useState<PropertyConstraint[]>([]);
  const [overlays, setOverlays] = useState<Record<string, FeatureCollection>>({});
  const [isLoadingOverlays, setIsLoadingOverlays] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Hazards', 'Heritage', 'Environment']));
  const [visibleOverlays, setVisibleOverlays] = useState<Set<string>>(new Set());
  const [isMapClickEnabled, setIsMapClickEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track added map layers
  const addedLayersRef = useRef<Set<string>>(new Set());

  // Add overlay layer to map
  const addOverlayToMap = useCallback((layerId: OverlayLayerId, data: FeatureCollection) => {
    if (!map) return;

    const layerConfig = OVERLAY_LAYERS[layerId];
    if (!layerConfig) return;

    const sourceId = `overlay-${layerId}`;
    const fillLayerId = `overlay-${layerId}-fill`;
    const outlineLayerId = `overlay-${layerId}-outline`;

    // Remove existing layers/source if they exist
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: data,
    });

    // Add fill layer
    if (layerConfig.style.type === 'fill') {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: layerConfig.style.paint as mapboxgl.FillPaint,
        layout: {
          visibility: 'visible',
        },
      });
    }

    // Add outline layer
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': (layerConfig.style.paint as any)['fill-outline-color'] || '#000',
        'line-width': 2,
      },
      layout: {
        visibility: 'visible',
      },
    });

    addedLayersRef.current.add(layerId);
  }, [map]);

  // Remove overlay layer from map
  const removeOverlayFromMap = useCallback((layerId: OverlayLayerId) => {
    if (!map) return;

    const sourceId = `overlay-${layerId}`;
    const fillLayerId = `overlay-${layerId}-fill`;
    const outlineLayerId = `overlay-${layerId}-outline`;

    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    addedLayersRef.current.delete(layerId);
  }, [map]);

  // Toggle overlay visibility on map
  const toggleOverlayVisibility = useCallback((layerId: OverlayLayerId, visible: boolean) => {
    if (!map) return;

    const fillLayerId = `overlay-${layerId}-fill`;
    const outlineLayerId = `overlay-${layerId}-outline`;

    if (map.getLayer(fillLayerId)) {
      map.setLayoutProperty(fillLayerId, 'visibility', visible ? 'visible' : 'none');
    }
    if (map.getLayer(outlineLayerId)) {
      map.setLayoutProperty(outlineLayerId, 'visibility', visible ? 'visible' : 'none');
    }
  }, [map]);

  // Add selected property to map
  const addPropertyToMap = useCallback((property: Feature) => {
    if (!map) return;

    const sourceId = 'selected-property';
    const fillLayerId = 'selected-property-fill';
    const outlineLayerId = 'selected-property-outline';

    // Remove existing
    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add source
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [property],
      },
    });

    // Add fill
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': '#ff6600',
        'fill-opacity': 0.2,
      },
    });

    // Add outline
    map.addLayer({
      id: outlineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ff6600',
        'line-width': 3,
      },
    });
  }, [map]);

  // Remove property from map
  const removePropertyFromMap = useCallback(() => {
    if (!map) return;

    const sourceId = 'selected-property';
    const fillLayerId = 'selected-property-fill';
    const outlineLayerId = 'selected-property-outline';

    if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
    if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }, [map]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all added overlay layers
      addedLayersRef.current.forEach((layerId) => {
        removeOverlayFromMap(layerId as OverlayLayerId);
      });
      removePropertyFromMap();
    };
  }, [removeOverlayFromMap, removePropertyFromMap]);

  // Handle property search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setError(null);

    try {
      const results = await searchProperty(searchQuery);
      setSearchResults(results.features);

      if (results.features.length === 1) {
        handlePropertySelect(results.features[0]);
      } else if (results.features.length === 0) {
        setError('No properties found. Try a different search term.');
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Handle property selection
  const handlePropertySelect = useCallback(async (property: Feature) => {
    setSelectedProperty(property);
    setSearchResults([]);
    setError(null);
    onPropertySelect?.(property);

    // Add property to map
    addPropertyToMap(property);

    // Zoom to property
    if (map && property.geometry) {
      const bounds = getBoundsFromGeometry(property.geometry);
      if (bounds) {
        map.fitBounds(bounds, { padding: 100, duration: 1000 });
      }
    }

    // Extract property info
    const props = property.properties || {};
    setPropertyInfo({
      lotPlan: `${props.LOT || props.lot || '?'}/${props.PLAN || props.plan || '?'}`,
      address: (props.ADDRESS || props.address || props.ADDR || props.addr) as string,
      area: (props.AREA || props.area || props.AREA_M2 || props.CALC_AREA) as number,
      tenure: (props.TENURE || props.tenure || props.PARCEL_TYP) as string,
      localGovernment: (props.LGA || props.lga || props.LOCAL_GOV) as string,
    });

    // Load overlays for this property
    if (property.geometry?.type === 'Polygon' || property.geometry?.type === 'MultiPolygon') {
      setIsLoadingOverlays(true);
      setConstraints([]);
      setOverlays({});

      // Clear previous overlay layers
      addedLayersRef.current.forEach((layerId) => {
        removeOverlayFromMap(layerId as OverlayLayerId);
      });
      setVisibleOverlays(new Set());

      try {
        const geometry = property.geometry.type === 'Polygon'
          ? property.geometry as Polygon
          : { type: 'Polygon' as const, coordinates: (property.geometry as any).coordinates[0] };

        const overlayResults = await getPropertyOverlays(geometry);
        setOverlays(overlayResults);

        // Analyze constraints
        const propertyConstraints = analyzePropertyConstraints(overlayResults);
        setConstraints(propertyConstraints);

        // Add overlays with features to the map and make them visible
        const initialVisible = new Set<string>();
        const layersToAdd: Array<{ id: string; name: string; data: FeatureCollection; style: any; category: string }> = [];

        Object.entries(overlayResults).forEach(([id, data]) => {
          if (data.features.length > 0) {
            addOverlayToMap(id as OverlayLayerId, data);
            initialVisible.add(id);

            // Prepare layer info for parent
            const layerConfig = OVERLAY_LAYERS[id as OverlayLayerId];
            if (layerConfig) {
              layersToAdd.push({
                id: `property-overlay-${id}`,
                name: `${layerConfig.name} (${data.features.length})`,
                data,
                style: layerConfig.style,
                category: layerConfig.category,
              });
            }
          }
        });
        setVisibleOverlays(initialVisible);

        // Notify parent about loaded overlays
        if (layersToAdd.length > 0 && onOverlaysLoaded) {
          onOverlaysLoaded(layersToAdd);
        }

      } catch (err) {
        console.error('Failed to load overlays:', err);
        setError('Failed to load some overlay data.');
      } finally {
        setIsLoadingOverlays(false);
      }
    }
  }, [map, onPropertySelect, onOverlaysLoaded, addPropertyToMap, addOverlayToMap, removeOverlayFromMap]);

  // Handle map click for property selection
  useEffect(() => {
    if (!map || !isMapClickEnabled) return;

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
      setError(null);
      try {
        const results = await getPropertyAtPoint(e.lngLat.lng, e.lngLat.lat);
        if (results.features.length > 0) {
          handlePropertySelect(results.features[0]);
          setIsMapClickEnabled(false);
        } else {
          setError('No property found at this location.');
        }
      } catch (err) {
        console.error('Failed to get property at point:', err);
        setError('Failed to select property. Try again.');
      }
    };

    map.on('click', handleMapClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, isMapClickEnabled, handlePropertySelect]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle overlay visibility
  const toggleOverlay = (layerId: OverlayLayerId) => {
    setVisibleOverlays(prev => {
      const next = new Set(prev);
      const newState = !next.has(layerId);
      if (newState) {
        next.add(layerId);
      } else {
        next.delete(layerId);
      }
      toggleOverlayVisibility(layerId, newState);
      return next;
    });
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedProperty(null);
    setPropertyInfo(null);
    setConstraints([]);
    setOverlays({});
    setSearchResults([]);
    setSearchQuery('');
    setError(null);
    onPropertySelect?.(null);

    // Remove all overlay layers from map
    addedLayersRef.current.forEach((layerId) => {
      removeOverlayFromMap(layerId as OverlayLayerId);
    });
    setVisibleOverlays(new Set());
    removePropertyFromMap();
  };

  // Group constraints by category
  const constraintsByCategory = constraints.reduce((acc, constraint) => {
    if (!acc[constraint.category]) {
      acc[constraint.category] = [];
    }
    acc[constraint.category].push(constraint);
    return acc;
  }, {} as Record<string, PropertyConstraint[]>);

  // Count issues by severity
  const severityCounts = constraints.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={cn(
      "absolute top-20 left-4 bottom-20 w-80 z-10 pointer-events-auto",
      "bg-background/95 backdrop-blur rounded-lg shadow-lg flex flex-col overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">Property Analysis</span>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 border-b space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Search lot/plan (e.g. 1/SP123456)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 h-8 text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isMapClickEnabled ? 'default' : 'outline'}
            className="flex-1 h-7 text-xs"
            onClick={() => setIsMapClickEnabled(!isMapClickEnabled)}
          >
            <MapPin className="h-3 w-3 mr-1" />
            {isMapClickEnabled ? 'Click on map...' : 'Select on map'}
          </Button>
          {selectedProperty && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            {error}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 1 && (
          <div className="max-h-32 overflow-y-auto border rounded">
            {searchResults.map((result, idx) => (
              <button
                key={idx}
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted border-b last:border-b-0"
                onClick={() => handlePropertySelect(result)}
              >
                {result.properties?.LOT || result.properties?.lot}/{result.properties?.PLAN || result.properties?.plan}
                {(result.properties?.ADDRESS || result.properties?.address) && (
                  <span className="text-muted-foreground ml-2">
                    {result.properties.ADDRESS || result.properties.address}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedProperty ? (
          <div className="divide-y">
            {/* Property Info */}
            <div className="p-3 space-y-2">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Property Details
              </h3>
              {propertyInfo && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lot/Plan:</span>
                    <span className="font-mono">{propertyInfo.lotPlan}</span>
                  </div>
                  {propertyInfo.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="text-right max-w-[180px] truncate">{propertyInfo.address}</span>
                    </div>
                  )}
                  {propertyInfo.area && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area:</span>
                      <span>{propertyInfo.area > 10000
                        ? `${(propertyInfo.area / 10000).toFixed(2)} ha`
                        : `${propertyInfo.area.toLocaleString()} m²`}</span>
                    </div>
                  )}
                  {propertyInfo.localGovernment && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LGA:</span>
                      <span>{propertyInfo.localGovernment}</span>
                    </div>
                  )}
                  {propertyInfo.tenure && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{propertyInfo.tenure}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            {constraints.length > 0 && (
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-sm">Constraint Summary</h3>
                <div className="flex gap-2 flex-wrap">
                  {severityCounts.high > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {severityCounts.high} High
                    </Badge>
                  )}
                  {severityCounts.medium > 0 && (
                    <Badge className="bg-amber-500 text-xs">
                      {severityCounts.medium} Medium
                    </Badge>
                  )}
                  {severityCounts.low > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {severityCounts.low} Low
                    </Badge>
                  )}
                  {severityCounts.info > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {severityCounts.info} Info
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoadingOverlays && (
              <div className="p-6 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading overlays...</span>
              </div>
            )}

            {/* Constraints by Category */}
            {!isLoadingOverlays && Object.entries(constraintsByCategory).map(([category, items]) => {
              const CategoryIcon = CATEGORY_ICONS[category] || Info;
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category}>
                  <button
                    className="w-full p-3 flex items-center justify-between hover:bg-muted/50"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4" />
                      <span className="font-medium text-sm">{category}</span>
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {items.map((constraint, idx) => {
                        const style = SEVERITY_STYLES[constraint.severity];
                        const SeverityIcon = style.icon;
                        const isVisible = visibleOverlays.has(constraint.layerId);
                        const layerConfig = OVERLAY_LAYERS[constraint.layerId];

                        return (
                          <div
                            key={idx}
                            className={cn("p-2 rounded-lg", style.bg)}
                          >
                            <div className="flex items-start gap-2">
                              <SeverityIcon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", style.text)} />
                              <div className="flex-1 min-w-0">
                                <div className={cn("font-medium text-sm flex items-center justify-between", style.text)}>
                                  <span>{constraint.name}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleOverlay(constraint.layerId);
                                    }}
                                    className="ml-2 p-1 rounded hover:bg-black/10"
                                    title={isVisible ? 'Hide on map' : 'Show on map'}
                                  >
                                    {isVisible ? (
                                      <Eye className="h-3 w-3" />
                                    ) : (
                                      <EyeOff className="h-3 w-3 opacity-50" />
                                    )}
                                  </button>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {constraint.description}
                                </div>
                                {constraint.featureCount > 1 && (
                                  <div className="text-xs mt-1 opacity-70">
                                    {constraint.featureCount} features
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* No constraints message */}
            {!isLoadingOverlays && constraints.length === 0 && (
              <div className="p-4 text-center text-muted-foreground text-sm">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No planning constraints found for this property.
              </div>
            )}

            {/* Layer toggles section */}
            {Object.keys(overlays).length > 0 && (
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Map Layers
                </h3>
                <div className="space-y-1">
                  {Object.entries(overlays).map(([id, data]) => {
                    if (data.features.length === 0) return null;
                    const layer = OVERLAY_LAYERS[id as OverlayLayerId];
                    if (!layer) return null;
                    const isVisible = visibleOverlays.has(id);

                    return (
                      <button
                        key={id}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors",
                          isVisible ? "bg-muted" : "hover:bg-muted/50"
                        )}
                        onClick={() => toggleOverlay(id as OverlayLayerId)}
                      >
                        <div
                          className="w-3 h-3 rounded border"
                          style={{
                            backgroundColor: isVisible ? (layer.style.paint as any)['fill-color'] : 'transparent',
                            borderColor: (layer.style.paint as any)['fill-outline-color'] || (layer.style.paint as any)['fill-color'],
                            opacity: isVisible ? (layer.style.paint as any)['fill-opacity'] || 0.4 : 0.3,
                          }}
                        />
                        <span className="flex-1 text-left">{layer.name}</span>
                        <Badge variant="outline" className="text-[10px]">{data.features.length}</Badge>
                        {isVisible ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">
              Search for a property by lot/plan or click "Select on map" to choose a property.
            </p>
            <p className="text-xs mt-2">
              Example: 1/SP123456
            </p>
            <p className="text-xs mt-4 text-muted-foreground/60">
              Data source: Queensland Spatial Services
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {selectedProperty && (
        <div className="p-3 border-t">
          <Button size="sm" className="w-full" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report (Coming Soon)
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper to get bounds from geometry
function getBoundsFromGeometry(geometry: GeoJSON.Geometry): [[number, number], [number, number]] | null {
  const coords: number[][] = [];

  const extractCoords = (g: GeoJSON.Geometry) => {
    if (g.type === 'Point') {
      coords.push(g.coordinates as number[]);
    } else if (g.type === 'LineString' || g.type === 'MultiPoint') {
      coords.push(...(g.coordinates as number[][]));
    } else if (g.type === 'Polygon' || g.type === 'MultiLineString') {
      (g.coordinates as number[][][]).forEach(ring => coords.push(...ring));
    } else if (g.type === 'MultiPolygon') {
      (g.coordinates as number[][][][]).forEach(poly =>
        poly.forEach(ring => coords.push(...ring))
      );
    } else if (g.type === 'GeometryCollection') {
      g.geometries.forEach(extractCoords);
    }
  };

  extractCoords(geometry);

  if (coords.length === 0) return null;

  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return [[minLng, minLat], [maxLng, maxLat]];
}

export default PropertyAnalysisPanel;
