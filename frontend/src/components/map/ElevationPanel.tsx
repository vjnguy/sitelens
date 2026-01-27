"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Mountain,
  MapPin,
  TrendingUp,
  Trash2,
  Copy,
  Check,
  Target,
  Info,
  ArrowUp,
  ArrowDown,
  Ruler,
  Loader2,
  Database,
  Calendar,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as turf from '@turf/turf';
import type { Position } from 'geojson';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getElevationAtPoint,
  getElevationProfile,
  calculateSlope,
  type ElevationResult,
  type ElevationProfileResult,
  type ElevationProfilePoint,
} from '@/lib/api/elevation';

interface ElevationPanelProps {
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
}

type ElevationMode = 'none' | 'point' | 'profile';

interface PointMeasurement {
  id: string;
  result: ElevationResult;
  timestamp: Date;
}

interface ProfileMeasurement {
  id: string;
  result: ElevationProfileResult;
  coordinates: Position[];
  timestamp: Date;
}

export function ElevationPanel({
  map,
  onClose,
  className,
}: ElevationPanelProps) {
  const [mode, setMode] = useState<ElevationMode>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Point measurements
  const [pointMeasurements, setPointMeasurements] = useState<PointMeasurement[]>([]);

  // Profile measurements
  const [profileMeasurements, setProfileMeasurements] = useState<ProfileMeasurement[]>([]);
  const [currentProfilePoints, setCurrentProfilePoints] = useState<Position[]>([]);

  // Selected for details view
  const [selectedProfile, setSelectedProfile] = useState<ProfileMeasurement | null>(null);

  const sourceId = 'elevation-source';
  const measureIdCounter = useRef(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize map layers
  useEffect(() => {
    if (!map) return;

    const lineLayerId = 'elevation-lines';
    const pointLayerId = 'elevation-points';

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
          'line-dasharray': [2, 1],
        },
      });

      map.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#10b981',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });
    }

    return () => {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map]);

  // Update map features
  const updateMapFeatures = useCallback(() => {
    if (!map || !map.getSource(sourceId)) return;

    const features: GeoJSON.Feature[] = [];

    // Add point measurements
    pointMeasurements.forEach((m) => {
      features.push({
        type: 'Feature',
        properties: {
          id: m.id,
          elevation: m.result.elevation,
        },
        geometry: {
          type: 'Point',
          coordinates: [m.result.location.lng, m.result.location.lat],
        },
      });
    });

    // Add profile measurements
    profileMeasurements.forEach((m) => {
      if (m.coordinates.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { id: m.id },
          geometry: {
            type: 'LineString',
            coordinates: m.coordinates,
          },
        });
      }
      m.coordinates.forEach((coord) => {
        features.push({
          type: 'Feature',
          properties: { id: m.id },
          geometry: { type: 'Point', coordinates: coord },
        });
      });
    });

    // Add current drawing points
    currentProfilePoints.forEach((coord) => {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: coord },
      });
    });

    if (currentProfilePoints.length >= 2) {
      features.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: currentProfilePoints,
        },
      });
    }

    const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [map, pointMeasurements, profileMeasurements, currentProfilePoints]);

  useEffect(() => {
    updateMapFeatures();
  }, [updateMapFeatures]);

  // Handle map clicks
  useEffect(() => {
    if (!map || mode === 'none') return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      const coord: Position = [e.lngLat.lng, e.lngLat.lat];

      if (mode === 'point') {
        // Query elevation at point
        setIsLoading(true);
        setError(null);

        try {
          const result = await getElevationAtPoint(e.lngLat.lng, e.lngLat.lat);
          const id = `elev-point-${measureIdCounter.current++}`;

          setPointMeasurements((prev) => [
            ...prev,
            { id, result, timestamp: new Date() },
          ]);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to query elevation');
        } finally {
          setIsLoading(false);
        }
      } else if (mode === 'profile') {
        setCurrentProfilePoints((prev) => [...prev, coord]);
      }
    };

    const handleDoubleClick = async (e: mapboxgl.MapMouseEvent) => {
      if (mode !== 'profile' || currentProfilePoints.length < 2) return;

      e.preventDefault();
      setIsLoading(true);
      setError(null);

      try {
        const coords = currentProfilePoints as [number, number][];
        const result = await getElevationProfile(coords, 50);
        const id = `elev-profile-${measureIdCounter.current++}`;

        setProfileMeasurements((prev) => [
          ...prev,
          { id, result, coordinates: currentProfilePoints, timestamp: new Date() },
        ]);
        setCurrentProfilePoints([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to query elevation profile');
      } finally {
        setIsLoading(false);
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDoubleClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDoubleClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, mode, currentProfilePoints]);

  const handleSetMode = (newMode: ElevationMode) => {
    setMode(newMode === mode ? 'none' : newMode);
    setCurrentProfilePoints([]);
    setError(null);
  };

  const deletePointMeasurement = (id: string) => {
    setPointMeasurements((prev) => prev.filter((m) => m.id !== id));
  };

  const deleteProfileMeasurement = (id: string) => {
    setProfileMeasurements((prev) => prev.filter((m) => m.id !== id));
    if (selectedProfile?.id === id) setSelectedProfile(null);
  };

  const clearAll = () => {
    setPointMeasurements([]);
    setProfileMeasurements([]);
    setCurrentProfilePoints([]);
    setSelectedProfile(null);
    setError(null);
  };

  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatElevation = (m: number) => `${m.toFixed(1)}m AHD`;
  const formatDistance = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(0)} m`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 flex flex-col overflow-hidden h-full",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20">
              <Mountain className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold">Elevation Tools</h2>
              <p className="text-[10px] text-muted-foreground">QLD LiDAR DEM (0.5-1m)</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tool Selection */}
      <div className="p-4 border-b">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === 'point' ? 'default' : 'outline'}
            className={cn(
              "flex-1 h-10 transition-all",
              mode === 'point' && "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
            )}
            onClick={() => handleSetMode('point')}
            disabled={isLoading}
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            Point
          </Button>
          <Button
            size="sm"
            variant={mode === 'profile' ? 'default' : 'outline'}
            className={cn(
              "flex-1 h-10 transition-all",
              mode === 'profile' && "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
            )}
            onClick={() => handleSetMode('profile')}
            disabled={isLoading}
          >
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Profile
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
            >
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Querying Queensland DEM...
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 p-2.5 bg-destructive/10 rounded-lg border border-destructive/20"
            >
              <div className="flex items-center gap-2 text-xs text-destructive">
                <Info className="h-3.5 w-3.5" />
                {error}
              </div>
            </motion.div>
          ) : mode !== 'none' ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20"
            >
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <Target className="h-3.5 w-3.5 animate-pulse" />
                {mode === 'point'
                  ? 'Click on the map to query elevation'
                  : 'Click points to draw profile. Double-click to finish.'}
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="inactive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-3 text-xs text-muted-foreground text-center"
            >
              Select a tool to query elevation data
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Drawing Progress */}
      <AnimatePresence>
        {currentProfilePoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b bg-gradient-to-r from-emerald-500/10 to-transparent"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Drawing profile
              </span>
              <span className="font-mono text-sm text-emerald-600">
                {currentProfilePoints.length} points
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="flex-1 overflow-y-auto max-h-80">
        {pointMeasurements.length === 0 && profileMeasurements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 text-center"
          >
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-30" />
              <div className="relative bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-full p-3.5">
                <Crosshair className="h-7 w-7 text-emerald-600" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No elevation data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Select a tool and click on the map</p>
          </motion.div>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Point Measurements */}
            {pointMeasurements.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:to-transparent transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span className="font-mono font-semibold text-lg">
                      {formatElevation(m.result.elevation)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => copyValue(m.id, formatElevation(m.result.elevation))}
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deletePointMeasurement(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-2 ml-7 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span className="truncate max-w-[180px]" title={m.result.metadata.dataSource}>
                      {m.result.metadata.dataSource}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {m.result.metadata.captureDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {m.result.metadata.captureDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {m.result.metadata.resolution}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Accuracy: {m.result.metadata.accuracy}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Profile Measurements */}
            {profileMeasurements.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "p-3 hover:bg-gradient-to-r hover:from-emerald-500/5 hover:to-transparent transition-all group cursor-pointer",
                  selectedProfile?.id === m.id && "bg-emerald-500/10"
                )}
                onClick={() => setSelectedProfile(selectedProfile?.id === m.id ? null : m)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <div>
                      <span className="font-mono font-semibold">
                        {formatDistance(m.result.statistics.totalDistance)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">profile</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteProfileMeasurement(m.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Statistics */}
                <div className="mt-2 ml-7 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <ArrowUp className="h-3 w-3 text-emerald-500" />
                    <span>{m.result.statistics.maxElevation.toFixed(1)}m</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <ArrowDown className="h-3 w-3 text-red-500" />
                    <span>{m.result.statistics.minElevation.toFixed(1)}m</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    +{m.result.statistics.elevationGain.toFixed(0)}m gain
                  </div>
                  <div className="text-xs text-muted-foreground">
                    -{m.result.statistics.elevationLoss.toFixed(0)}m loss
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-2 ml-7 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span>{m.result.metadata.dataSource}</span>
                    {m.result.metadata.captureDate && (
                      <>
                        <span>|</span>
                        <Calendar className="h-3 w-3" />
                        <span>{m.result.metadata.captureDate}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Profile Chart */}
                <AnimatePresence>
                  {selectedProfile?.id === m.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 ml-7"
                    >
                      <ElevationChart
                        profile={m.result}
                        map={map}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <AnimatePresence>
        {(pointMeasurements.length > 0 || profileMeasurements.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border-t bg-muted/20"
          >
            <Button
              size="sm"
              variant="outline"
              className="w-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              onClick={clearAll}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Clear All ({pointMeasurements.length + profileMeasurements.length})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data Attribution */}
      <div className="p-2 border-t bg-muted/10">
        <p className="text-[9px] text-center text-muted-foreground">
          Data: Queensland Government Spatial Services | LiDAR 0.5-1m resolution
        </p>
      </div>
    </motion.div>
  );
}

// Interactive SVG-based elevation chart with map marker sync
function ElevationChart({
  profile,
  map
}: {
  profile: ElevationProfileResult;
  map: mapboxgl.Map | null;
}) {
  const { points, statistics } = profile;
  const [hoveredPoint, setHoveredPoint] = useState<ElevationProfilePoint | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (points.length < 2) return null;

  const width = 220;
  const height = 100;
  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const elevationRange = statistics.maxElevation - statistics.minElevation || 1;
  const distanceRange = statistics.totalDistance || 1;

  // Calculate point positions
  const pointPositions = points.map((p) => ({
    x: padding.left + (p.distance / distanceRange) * chartWidth,
    y: padding.top + chartHeight - ((p.elevation - statistics.minElevation) / elevationRange) * chartHeight,
    point: p
  }));

  // Generate path
  const pathPoints = pointPositions.map((pp, i) =>
    `${i === 0 ? 'M' : 'L'} ${pp.x} ${pp.y}`
  ).join(' ');

  // Generate filled area
  const areaPath = `${pathPoints} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

  // Handle mouse move on chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !map) return;

    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find the closest point to the mouse X position
    let closestPoint = pointPositions[0];
    let minDist = Math.abs(mouseX - closestPoint.x);

    for (const pp of pointPositions) {
      const dist = Math.abs(mouseX - pp.x);
      if (dist < minDist) {
        minDist = dist;
        closestPoint = pp;
      }
    }

    setHoveredPoint(closestPoint.point);

    // Update or create marker on map
    const { lng, lat } = closestPoint.point.location;

    if (!markerRef.current && (window as any).mapboxgl) {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'elevation-hover-marker';
      el.style.cssText = `
        width: 16px;
        height: 16px;
        background: #10b981;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        pointer-events: none;
      `;

      markerRef.current = new (window as any).mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    } else if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  // Cleanup marker on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  // Calculate hovered point position for crosshair
  const hoveredPosition = hoveredPoint ? {
    x: padding.left + (hoveredPoint.distance / distanceRange) * chartWidth,
    y: padding.top + chartHeight - ((hoveredPoint.elevation - statistics.minElevation) / elevationRange) * chartHeight,
  } : null;

  return (
    <div className="bg-background/50 rounded-lg p-2 border">
      {/* Hover info */}
      {hoveredPoint && (
        <div className="mb-2 px-1 flex items-center justify-between text-[10px]">
          <span className="text-emerald-600 font-medium">
            {hoveredPoint.elevation.toFixed(1)}m AHD
          </span>
          <span className="text-muted-foreground">
            {hoveredPoint.distance >= 1000
              ? `${(hoveredPoint.distance / 1000).toFixed(2)}km`
              : `${hoveredPoint.distance.toFixed(0)}m`}
          </span>
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeOpacity={0.2}
        />

        {/* Filled area */}
        <path d={areaPath} fill="rgb(16, 185, 129)" fillOpacity={0.2} />

        {/* Line */}
        <path
          d={pathPoints}
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover crosshair */}
        {hoveredPosition && (
          <>
            {/* Vertical line */}
            <line
              x1={hoveredPosition.x}
              y1={padding.top}
              x2={hoveredPosition.x}
              y2={padding.top + chartHeight}
              stroke="rgb(16, 185, 129)"
              strokeWidth={1}
              strokeDasharray="3,3"
              strokeOpacity={0.7}
            />
            {/* Hover point */}
            <circle
              cx={hoveredPosition.x}
              cy={hoveredPosition.y}
              r={5}
              fill="rgb(16, 185, 129)"
              stroke="white"
              strokeWidth={2}
            />
          </>
        )}

        {/* Y-axis labels */}
        <text
          x={padding.left - 4}
          y={padding.top + 4}
          textAnchor="end"
          className="text-[8px] fill-muted-foreground"
        >
          {statistics.maxElevation.toFixed(0)}m
        </text>
        <text
          x={padding.left - 4}
          y={padding.top + chartHeight}
          textAnchor="end"
          className="text-[8px] fill-muted-foreground"
        >
          {statistics.minElevation.toFixed(0)}m
        </text>

        {/* X-axis labels */}
        <text
          x={padding.left}
          y={height - 4}
          textAnchor="start"
          className="text-[8px] fill-muted-foreground"
        >
          0
        </text>
        <text
          x={padding.left + chartWidth}
          y={height - 4}
          textAnchor="end"
          className="text-[8px] fill-muted-foreground"
        >
          {statistics.totalDistance >= 1000
            ? `${(statistics.totalDistance / 1000).toFixed(1)}km`
            : `${statistics.totalDistance.toFixed(0)}m`}
        </text>
      </svg>

      <p className="text-[9px] text-muted-foreground text-center mt-1">
        Hover to see position on map
      </p>
    </div>
  );
}

export default ElevationPanel;
