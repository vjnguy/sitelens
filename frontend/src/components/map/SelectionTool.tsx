"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Square,
  X,
  Download,
  Trash2,
  MousePointer2,
  Copy,
  Check,
  FileJson,
  Table,
  Loader2,
  MapPin,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeatureCollection, Feature, Polygon } from 'geojson';

interface SelectionToolProps {
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
}

interface SelectedFeature {
  id: string;
  layerId: string;
  layerName: string;
  properties: Record<string, unknown>;
  geometry: Feature['geometry'];
}

export function SelectionTool({ map, onClose, className }: SelectionToolProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  const [copied, setCopied] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get queryable layers
  const getQueryableLayers = useCallback(() => {
    if (!map) return [];

    const style = map.getStyle();
    if (!style?.layers) return [];

    // Get layers that have data we can query
    return style.layers
      .filter(layer => {
        // Include fill, line, circle layers
        return ['fill', 'line', 'circle', 'symbol'].includes(layer.type);
      })
      .map(layer => layer.id);
  }, [map]);

  // Start box selection
  const startSelection = useCallback(() => {
    if (!map) return;

    setIsSelecting(true);
    setSelectedFeatures([]);
    map.getCanvas().style.cursor = 'crosshair';

    const handleMouseDown = (e: mapboxgl.MapMouseEvent) => {
      setIsDrawing(true);
      setStartPoint({ x: e.point.x, y: e.point.y });
      setCurrentPoint({ x: e.point.x, y: e.point.y });
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      if (!isDrawing) return;
      setCurrentPoint({ x: e.point.x, y: e.point.y });
    };

    const handleMouseUp = (e: mapboxgl.MapMouseEvent) => {
      if (!isDrawing || !startPoint) return;

      const endPoint = { x: e.point.x, y: e.point.y };

      // Calculate bounding box
      const minX = Math.min(startPoint.x, endPoint.x);
      const maxX = Math.max(startPoint.x, endPoint.x);
      const minY = Math.min(startPoint.y, endPoint.y);
      const maxY = Math.max(startPoint.y, endPoint.y);

      // Query features in the box
      const features = map.queryRenderedFeatures(
        [[minX, minY], [maxX, maxY]],
        { layers: getQueryableLayers() }
      );

      // Process and dedupe features
      const processedFeatures: SelectedFeature[] = [];
      const seenIds = new Set<string>();

      features.forEach(feature => {
        const layerId = feature.layer?.id || 'unknown';
        const id = String(feature.id || feature.properties?.id || `${layerId}-${Math.random()}`);
        if (seenIds.has(id)) return;
        seenIds.add(id);

        processedFeatures.push({
          id,
          layerId,
          layerName: layerId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          properties: feature.properties || {},
          geometry: feature.geometry,
        });
      });

      setSelectedFeatures(processedFeatures);
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);

    // Store handlers for cleanup
    (map as any)._selectionHandlers = { handleMouseDown, handleMouseMove, handleMouseUp };
  }, [map, isDrawing, startPoint, getQueryableLayers]);

  // Stop box selection
  const stopSelection = useCallback(() => {
    if (!map) return;

    setIsSelecting(false);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
    map.getCanvas().style.cursor = '';

    const handlers = (map as any)._selectionHandlers;
    if (handlers) {
      map.off('mousedown', handlers.handleMouseDown);
      map.off('mousemove', handlers.handleMouseMove);
      map.off('mouseup', handlers.handleMouseUp);
      delete (map as any)._selectionHandlers;
    }
  }, [map]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  // Export as GeoJSON
  const exportGeoJSON = useCallback(() => {
    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: selectedFeatures.map(f => ({
        type: 'Feature',
        id: f.id,
        properties: {
          ...f.properties,
          _layer: f.layerName,
        },
        geometry: f.geometry,
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selection-${new Date().toISOString().split('T')[0]}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedFeatures]);

  // Export as CSV
  const exportCSV = useCallback(() => {
    if (selectedFeatures.length === 0) return;

    // Get all unique keys from properties
    const allKeys = new Set<string>();
    selectedFeatures.forEach(f => {
      Object.keys(f.properties).forEach(key => allKeys.add(key));
    });
    const headers = ['_id', '_layer', ...Array.from(allKeys)];

    // Build CSV rows
    const rows = selectedFeatures.map(f => {
      return headers.map(header => {
        if (header === '_id') return f.id;
        if (header === '_layer') return f.layerName;
        const value = f.properties[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }).map(v => `"${v.replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selection-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedFeatures]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: selectedFeatures.map(f => ({
        type: 'Feature',
        id: f.id,
        properties: f.properties,
        geometry: f.geometry,
      })),
    };

    await navigator.clipboard.writeText(JSON.stringify(geojson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [selectedFeatures]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSelection();
    };
  }, [stopSelection]);

  // Selection box overlay
  const boxStyle = startPoint && currentPoint ? {
    left: Math.min(startPoint.x, currentPoint.x),
    top: Math.min(startPoint.y, currentPoint.y),
    width: Math.abs(currentPoint.x - startPoint.x),
    height: Math.abs(currentPoint.y - startPoint.y),
  } : null;

  // Group features by layer
  const featuresByLayer = selectedFeatures.reduce((acc, f) => {
    if (!acc[f.layerName]) acc[f.layerName] = [];
    acc[f.layerName].push(f);
    return acc;
  }, {} as Record<string, SelectedFeature[]>);

  return (
    <>
      {/* Selection box overlay */}
      {isDrawing && boxStyle && (
        <div
          className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-500/20"
          style={boxStyle}
        />
      )}

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "absolute bottom-20 left-4 w-80 z-10 pointer-events-auto",
          "bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border/50 overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Square className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <h2 className="font-semibold">Box Selection</h2>
                <p className="text-[10px] text-muted-foreground">Select & export features</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                stopSelection();
                onClose();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Selection Controls */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className={cn("flex-1", isSelecting && "bg-cyan-600 hover:bg-cyan-700")}
              onClick={isSelecting ? stopSelection : startSelection}
            >
              <MousePointer2 className="h-4 w-4 mr-2" />
              {isSelecting ? 'Stop Selection' : 'Start Selection'}
            </Button>
            {selectedFeatures.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isSelecting && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 text-sm">
              <p className="text-cyan-700 dark:text-cyan-400 font-medium">
                Click and drag on the map to select features
              </p>
            </div>
          )}

          {/* Selected Features */}
          {selectedFeatures.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Features</span>
                <Badge variant="secondary">{selectedFeatures.length}</Badge>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {Object.entries(featuresByLayer).map(([layerName, features]) => (
                  <div key={layerName} className="bg-muted/30 rounded-lg p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{layerName}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {features.length}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {features.slice(0, 3).map((f, i) => (
                        <span key={f.id}>
                          {String(f.properties.name || f.properties.NAME || f.properties.lot_plan || f.id)}
                          {i < Math.min(features.length - 1, 2) && ', '}
                        </span>
                      ))}
                      {features.length > 3 && ` +${features.length - 3} more`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Export Options */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Export Selection</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={exportGeoJSON}
                  >
                    <FileJson className="h-3.5 w-3.5 mr-1.5" />
                    GeoJSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={exportCSV}
                  >
                    <Table className="h-3.5 w-3.5 mr-1.5" />
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="px-3"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isSelecting && selectedFeatures.length === 0 && (
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center mb-3">
                <Square className="h-6 w-6 text-cyan-600" />
              </div>
              <p className="text-sm text-muted-foreground">
                Draw a box on the map to select features
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

export default SelectionTool;
