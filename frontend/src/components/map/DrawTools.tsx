"use client";

import { useEffect, useRef, useCallback, useState } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Feature, FeatureCollection, Polygon, LineString, Point } from 'geojson';
import * as turf from '@turf/turf';
import {
  MousePointer2,
  Pencil,
  Square,
  Minus,
  MapPin,
  Trash2,
  Ruler,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Import draw styles
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

export type DrawMode = 'simple_select' | 'draw_point' | 'draw_line_string' | 'draw_polygon';

interface DrawToolsProps {
  map: mapboxgl.Map | null;
  onDrawCreate?: (features: Feature[]) => void;
  onDrawUpdate?: (features: Feature[]) => void;
  onDrawDelete?: (features: Feature[]) => void;
  onSelectionChange?: (features: Feature[]) => void;
  onFeaturesChange?: (fc: FeatureCollection) => void;
  className?: string;
}

interface DrawStats {
  area?: number;
  length?: number;
  pointCount: number;
}

const DRAW_TOOLS = [
  { mode: 'simple_select' as DrawMode, icon: MousePointer2, label: 'Select' },
  { mode: 'draw_point' as DrawMode, icon: MapPin, label: 'Point' },
  { mode: 'draw_line_string' as DrawMode, icon: Minus, label: 'Line' },
  { mode: 'draw_polygon' as DrawMode, icon: Pencil, label: 'Polygon' },
];

export function DrawTools({
  map,
  onDrawCreate,
  onDrawUpdate,
  onDrawDelete,
  onSelectionChange,
  onFeaturesChange,
  className,
}: DrawToolsProps) {
  const drawRef = useRef<MapboxDraw | null>(null);
  const [activeMode, setActiveMode] = useState<DrawMode>('simple_select');
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [stats, setStats] = useState<DrawStats | null>(null);

  // Initialize MapboxDraw
  useEffect(() => {
    if (!map || drawRef.current) return;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      defaultMode: 'simple_select',
      styles: [
        // Polygon fill
        {
          id: 'gl-draw-polygon-fill',
          type: 'fill',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          paint: {
            'fill-color': '#3bb2d0',
            'fill-outline-color': '#3bb2d0',
            'fill-opacity': 0.2,
          },
        },
        // Polygon outline
        {
          id: 'gl-draw-polygon-stroke-active',
          type: 'line',
          filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#3bb2d0', 'line-width': 2 },
        },
        // Line
        {
          id: 'gl-draw-line',
          type: 'line',
          filter: ['all', ['==', '$type', 'LineString'], ['!=', 'mode', 'static']],
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#3bb2d0', 'line-width': 2, 'line-dasharray': [2, 2] },
        },
        // Point
        {
          id: 'gl-draw-point',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'feature'], ['!=', 'mode', 'static']],
          paint: { 'circle-radius': 6, 'circle-color': '#3bb2d0' },
        },
        // Vertex points
        {
          id: 'gl-draw-vertex-active',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'vertex'], ['!=', 'mode', 'static']],
          paint: { 'circle-radius': 5, 'circle-color': '#fff', 'circle-stroke-color': '#3bb2d0', 'circle-stroke-width': 2 },
        },
        // Midpoint
        {
          id: 'gl-draw-midpoint',
          type: 'circle',
          filter: ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          paint: { 'circle-radius': 3, 'circle-color': '#3bb2d0' },
        },
      ],
    });

    map.addControl(draw);
    drawRef.current = draw;

    const handleCreate = (e: any) => {
      onDrawCreate?.(e.features);
      updateStats(e.features);
      onFeaturesChange?.(draw.getAll());
    };

    const handleUpdate = (e: any) => {
      onDrawUpdate?.(e.features);
      updateStats(e.features);
      onFeaturesChange?.(draw.getAll());
    };

    const handleDelete = (e: any) => {
      onDrawDelete?.(e.features);
      setStats(null);
      onFeaturesChange?.(draw.getAll());
    };

    const handleSelectionChange = (e: any) => {
      setSelectedFeatures(e.features);
      onSelectionChange?.(e.features);
      updateStats(e.features);
    };

    const handleModeChange = (e: any) => {
      setActiveMode(e.mode as DrawMode);
    };

    map.on('draw.create', handleCreate);
    map.on('draw.update', handleUpdate);
    map.on('draw.delete', handleDelete);
    map.on('draw.selectionchange', handleSelectionChange);
    map.on('draw.modechange', handleModeChange);

    return () => {
      map.off('draw.create', handleCreate);
      map.off('draw.update', handleUpdate);
      map.off('draw.delete', handleDelete);
      map.off('draw.selectionchange', handleSelectionChange);
      map.off('draw.modechange', handleModeChange);

      if (drawRef.current) {
        map.removeControl(drawRef.current);
        drawRef.current = null;
      }
    };
  }, [map, onDrawCreate, onDrawUpdate, onDrawDelete, onSelectionChange, onFeaturesChange]);

  const updateStats = useCallback((features: Feature[]) => {
    if (features.length === 0) {
      setStats(null);
      return;
    }

    let totalArea = 0;
    let totalLength = 0;
    let pointCount = 0;

    features.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        totalArea += turf.area(feature as Feature<Polygon>);
        totalLength += turf.length(feature as Feature<Polygon>, { units: 'meters' });
      } else if (feature.geometry.type === 'LineString') {
        totalLength += turf.length(feature as Feature<LineString>, { units: 'meters' });
      } else if (feature.geometry.type === 'Point') {
        pointCount++;
      }
    });

    setStats({
      area: totalArea > 0 ? totalArea : undefined,
      length: totalLength > 0 ? totalLength : undefined,
      pointCount,
    });
  }, []);

  const setMode = useCallback((mode: DrawMode) => {
    if (drawRef.current) {
      drawRef.current.changeMode(mode);
      setActiveMode(mode);
    }
  }, []);

  const deleteSelected = useCallback(() => {
    if (drawRef.current && selectedFeatures.length > 0) {
      const ids = selectedFeatures.map(f => f.id as string);
      drawRef.current.delete(ids);
      setSelectedFeatures([]);
      setStats(null);
      onFeaturesChange?.(drawRef.current.getAll());
    }
  }, [selectedFeatures, onFeaturesChange]);

  const formatArea = (sqm: number): string => {
    if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`;
    return `${sqm.toFixed(0)} m²`;
  };

  const formatLength = (m: number): string => {
    if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
    return `${m.toFixed(0)} m`;
  };

  if (!map) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Drawing Tools */}
      <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg p-1 flex flex-col gap-1">
        {DRAW_TOOLS.map((tool) => (
          <Button
            key={tool.mode}
            size="icon"
            variant={activeMode === tool.mode ? 'default' : 'ghost'}
            className="h-8 w-8"
            onClick={() => setMode(tool.mode)}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
        <div className="h-px bg-border my-1" />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive"
          onClick={deleteSelected}
          disabled={selectedFeatures.length === 0}
          title="Delete Selected"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Measurement Stats */}
      {stats && (stats.area || stats.length || stats.pointCount > 0) && (
        <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg p-2 text-xs space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Ruler className="h-3 w-3" />
            <span className="font-medium">Measurements</span>
          </div>
          {stats.area !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Area:</span>
              <span className="font-mono">{formatArea(stats.area)}</span>
            </div>
          )}
          {stats.length !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Perimeter:</span>
              <span className="font-mono">{formatLength(stats.length)}</span>
            </div>
          )}
          {stats.pointCount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Points:</span>
              <span className="font-mono">{stats.pointCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Selection Info */}
      {selectedFeatures.length > 0 && (
        <div className="bg-background/95 backdrop-blur rounded-lg shadow-lg p-2">
          <Badge variant="secondary" className="text-xs">
            {selectedFeatures.length} selected
          </Badge>
        </div>
      )}
    </div>
  );
}

export default DrawTools;
