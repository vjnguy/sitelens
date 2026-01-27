"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Ruler,
  Square,
  Circle,
  Trash2,
  Copy,
  MousePointer2,
  Check,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as turf from '@turf/turf';
import type { Feature, LineString, Polygon, Point, Position } from 'geojson';
import { motion, AnimatePresence } from 'framer-motion';

interface MeasurementToolsProps {
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
}

type MeasurementMode = 'none' | 'distance' | 'area' | 'radius';

interface Measurement {
  id: string;
  type: 'distance' | 'area' | 'radius';
  value: number;
  unit: string;
  coordinates: Position[];
  displayValue: string;
}

export function MeasurementTools({
  map,
  onClose,
  className,
}: MeasurementToolsProps) {
  const [mode, setMode] = useState<MeasurementMode>('none');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Position[]>([]);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);

  const measureSourceRef = useRef<boolean>(false);
  const measureIdCounter = useRef(0);

  // Initialize map sources and layers
  useEffect(() => {
    if (!map) return;

    const sourceId = 'measurement-source';
    const lineLayerId = 'measurement-lines';
    const fillLayerId = 'measurement-fills';
    const pointLayerId = 'measurement-points';
    const labelLayerId = 'measurement-labels';

    // Create source if not exists
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Line layer
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 3,
          'line-dasharray': [2, 1],
        },
      });

      // Fill layer
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': '#f59e0b',
          'fill-opacity': 0.2,
        },
      });

      // Point layer
      map.addLayer({
        id: pointLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // Label layer
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 12,
          'text-offset': [0, -1.5],
          'text-anchor': 'bottom',
        },
        paint: {
          'text-color': '#000',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      });

      measureSourceRef.current = true;
    }

    return () => {
      // Cleanup on unmount
      if (map.getLayer(labelLayerId)) map.removeLayer(labelLayerId);
      if (map.getLayer(pointLayerId)) map.removeLayer(pointLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      measureSourceRef.current = false;
    };
  }, [map]);

  // Update map features
  const updateMapFeatures = useCallback(() => {
    if (!map || !measureSourceRef.current) return;

    const features: Feature[] = [];

    // Add completed measurements
    measurements.forEach((m) => {
      if (m.type === 'distance' && m.coordinates.length >= 2) {
        // Line
        features.push({
          type: 'Feature',
          properties: { label: m.displayValue, id: m.id },
          geometry: { type: 'LineString', coordinates: m.coordinates },
        });
        // Points
        m.coordinates.forEach((coord) => {
          features.push({
            type: 'Feature',
            properties: { id: m.id },
            geometry: { type: 'Point', coordinates: coord },
          });
        });
      } else if (m.type === 'area' && m.coordinates.length >= 3) {
        // Polygon
        const closed = [...m.coordinates, m.coordinates[0]];
        features.push({
          type: 'Feature',
          properties: { label: m.displayValue, id: m.id },
          geometry: { type: 'Polygon', coordinates: [closed] },
        });
        // Points
        m.coordinates.forEach((coord) => {
          features.push({
            type: 'Feature',
            properties: { id: m.id },
            geometry: { type: 'Point', coordinates: coord },
          });
        });
      }
    });

    // Add current drawing
    if (currentPoints.length > 0) {
      currentPoints.forEach((coord) => {
        features.push({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: coord },
        });
      });

      if (currentPoints.length >= 2) {
        features.push({
          type: 'Feature',
          properties: { label: liveDistance ? formatDistance(liveDistance) : '' },
          geometry: { type: 'LineString', coordinates: currentPoints },
        });
      }
    }

    const source = map.getSource('measurement-source') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features });
    }
  }, [map, measurements, currentPoints, liveDistance]);

  useEffect(() => {
    updateMapFeatures();
  }, [updateMapFeatures]);

  // Handle map click
  useEffect(() => {
    if (!map || mode === 'none') return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const coord: Position = [e.lngLat.lng, e.lngLat.lat];
      setCurrentPoints((prev) => [...prev, coord]);
    };

    const handleDoubleClick = (e: mapboxgl.MapMouseEvent) => {
      e.preventDefault();

      if (currentPoints.length < 2) return;

      // Complete the measurement
      const id = `measure-${measureIdCounter.current++}`;

      if (mode === 'distance') {
        const line = turf.lineString(currentPoints);
        const length = turf.length(line, { units: 'meters' });
        const displayValue = formatDistance(length);

        setMeasurements((prev) => [
          ...prev,
          {
            id,
            type: 'distance',
            value: length,
            unit: 'm',
            coordinates: currentPoints,
            displayValue,
          },
        ]);
      } else if (mode === 'area' && currentPoints.length >= 3) {
        const closed = [...currentPoints, currentPoints[0]];
        const polygon = turf.polygon([closed]);
        const area = turf.area(polygon);
        const displayValue = formatArea(area);

        setMeasurements((prev) => [
          ...prev,
          {
            id,
            type: 'area',
            value: area,
            unit: 'm²',
            coordinates: currentPoints,
            displayValue,
          },
        ]);
      }

      setCurrentPoints([]);
      setLiveDistance(null);
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (currentPoints.length === 0) return;

      const coord: Position = [e.lngLat.lng, e.lngLat.lat];
      const allPoints = [...currentPoints, coord];

      if (mode === 'distance') {
        const line = turf.lineString(allPoints);
        const length = turf.length(line, { units: 'meters' });
        setLiveDistance(length);
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDoubleClick);
    map.on('mousemove', handleMouseMove);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDoubleClick);
      map.off('mousemove', handleMouseMove);
      map.getCanvas().style.cursor = '';
    };
  }, [map, mode, currentPoints]);

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(1)} m`;
  };

  // Format area
  const formatArea = (sqMeters: number): string => {
    if (sqMeters >= 10000) {
      return `${(sqMeters / 10000).toFixed(2)} ha`;
    }
    return `${sqMeters.toFixed(0)} m²`;
  };

  // Delete measurement
  const deleteMeasurement = (id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
  };

  // Clear all
  const clearAll = () => {
    setMeasurements([]);
    setCurrentPoints([]);
    setLiveDistance(null);
  };

  // Copy value
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Set mode
  const handleSetMode = (newMode: MeasurementMode) => {
    setMode(newMode === mode ? 'none' : newMode);
    setCurrentPoints([]);
    setLiveDistance(null);
  };

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
      <div className="p-4 border-b bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <Ruler className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold">Measurement Tools</h2>
              <p className="text-[10px] text-muted-foreground">Distance & area calculation</p>
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
            variant={mode === 'distance' ? 'default' : 'outline'}
            className={cn(
              "flex-1 h-10 transition-all",
              mode === 'distance' && "bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20"
            )}
            onClick={() => handleSetMode('distance')}
          >
            <Ruler className="h-4 w-4 mr-1.5" />
            Distance
          </Button>
          <Button
            size="sm"
            variant={mode === 'area' ? 'default' : 'outline'}
            className={cn(
              "flex-1 h-10 transition-all",
              mode === 'area' && "bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20"
            )}
            onClick={() => handleSetMode('area')}
          >
            <Square className="h-4 w-4 mr-1.5" />
            Area
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {mode !== 'none' ? (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 p-2.5 bg-amber-500/10 rounded-lg border border-amber-500/20"
            >
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                <Target className="h-3.5 w-3.5 animate-pulse" />
                {mode === 'distance'
                  ? 'Click points to measure. Double-click to finish.'
                  : 'Click points to draw polygon. Double-click to close.'}
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
              Select a measurement tool to begin
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Live Measurement */}
      <AnimatePresence>
        {liveDistance !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 border-b bg-gradient-to-r from-amber-500/10 to-transparent"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Live measurement
              </span>
              <span className="font-mono font-bold text-amber-600 text-lg">
                {formatDistance(liveDistance)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Measurements List */}
      <div className="flex-1 overflow-y-auto max-h-64">
        {measurements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 text-center"
          >
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping opacity-30" />
              <div className="relative bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full p-3.5">
                <MousePointer2 className="h-7 w-7 text-amber-600" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">No measurements yet</p>
            <p className="text-xs text-muted-foreground mt-1">Select a tool and click on the map</p>
          </motion.div>
        ) : (
          <div className="divide-y divide-border/50">
            {measurements.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 hover:bg-gradient-to-r hover:from-amber-500/5 hover:to-transparent transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      {m.type === 'distance' ? (
                        <Ruler className="h-3.5 w-3.5 text-amber-600" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    <span className="font-mono font-semibold">{m.displayValue}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 hover:bg-amber-500/10 hover:text-amber-600"
                      onClick={() => copyValue(m.id, m.displayValue)}
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
                      onClick={() => deleteMeasurement(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 ml-7">
                  {m.type === 'distance'
                    ? `${m.coordinates.length} points`
                    : `${m.coordinates.length} vertices`}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <AnimatePresence>
        {measurements.length > 0 && (
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
              Clear All ({measurements.length})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MeasurementTools;
