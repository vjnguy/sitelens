"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  MousePointer2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  MapPin,
  Layers,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type mapboxgl from "mapbox-gl";
import { ALL_LAYERS, type OverlayLayer } from "@/lib/overlays";
import { identifyArcGISFeatures } from "@/lib/overlays/adapters";
import type { Layer } from "@/types/gis";

interface FeatureInfo {
  layerId: string;
  layerName: string;
  properties: Record<string, unknown>;
  geometry?: GeoJSON.Geometry;
  coordinates?: [number, number];
  /** Source type for styling the result differently */
  source?: "overlay" | "user";
}

interface FeatureInspectorProps {
  map: mapboxgl.Map | null;
  enabled: boolean;
  onClose: () => void;
  /** Offset from right edge to avoid overlapping with other panels (in pixels) */
  rightOffset?: number;
  /** User-imported layers from the Layers tab */
  userLayers?: Layer[];
}

// Format property values for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    // Format numbers nicely
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

// Format property names (convert SNAKE_CASE to Title Case)
function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// Filter out internal/system properties
function filterProperties(props: Record<string, unknown>): Record<string, unknown> {
  const excludePatterns = [
    /^objectid$/i,
    /^oid$/i,
    /^fid$/i,
    /^shape[._]/i,
    /^st_area/i,
    /^st_length/i,
    /^globalid$/i,
    /^created?_?(date|user|by)/i,
    /^last_?edit/i,
    /^modified/i,
  ];

  return Object.fromEntries(
    Object.entries(props).filter(([key, value]) => {
      // Exclude null/undefined/empty values
      if (value === null || value === undefined || value === "") return false;
      // Exclude system fields
      return !excludePatterns.some((pattern) => pattern.test(key));
    })
  );
}

export function FeatureInspector({ map, enabled, onClose, rightOffset = 64, userLayers = [] }: FeatureInspectorProps) {
  const [features, setFeatures] = useState<FeatureInfo[]>([]);
  const [expandedFeature, setExpandedFeature] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Get list of active overlay layer IDs (vector layers only - for queryRenderedFeatures)
  const getActiveVectorLayerIds = useCallback((): string[] => {
    if (!map) return [];

    const layerIds: string[] = [];
    ALL_LAYERS.forEach((layer) => {
      // Skip raster layers - they need server-side identify
      if (layer.service.type === 'arcgis-dynamic' || layer.service.type === 'arcgis-cached') {
        return;
      }
      if (map.getLayer(layer.id)) {
        layerIds.push(layer.id);
      }
      // Also check for outline layers
      if (map.getLayer(`${layer.id}-outline`)) {
        layerIds.push(`${layer.id}-outline`);
      }
    });
    return layerIds;
  }, [map]);

  // Get list of visible user layer IDs
  const getActiveUserLayerIds = useCallback((): Array<{ id: string; name: string }> => {
    if (!map) return [];

    const activeUserLayers: Array<{ id: string; name: string }> = [];
    userLayers.forEach((layer) => {
      // Only include visible layers that are on the map
      if (layer.visible && map.getLayer(layer.id)) {
        activeUserLayers.push({ id: layer.id, name: layer.name });
      }
    });
    return activeUserLayers;
  }, [map, userLayers]);

  // Get active raster layers that need server-side identify
  const getActiveRasterLayers = useCallback((): OverlayLayer[] => {
    if (!map) return [];

    return ALL_LAYERS.filter((layer) => {
      // Only arcgis-dynamic and arcgis-cached support identify
      if (layer.service.type !== 'arcgis-dynamic' && layer.service.type !== 'arcgis-cached') {
        return false;
      }
      // Check if layer is visible on map
      return map.getLayer(layer.id) !== undefined;
    });
  }, [map]);

  // Handle map click for feature inspection
  useEffect(() => {
    if (!map || !enabled) return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      const vectorLayerIds = getActiveVectorLayerIds();
      const rasterLayers = getActiveRasterLayers();
      const activeUserLayers = getActiveUserLayerIds();

      if (vectorLayerIds.length === 0 && rasterLayers.length === 0 && activeUserLayers.length === 0) return;

      // Show loading state if we need to query raster layers
      if (rasterLayers.length > 0) {
        setIsLoading(true);
      }

      const allFeatures: FeatureInfo[] = [];

      // Query user-imported layers first (they're typically more relevant)
      if (activeUserLayers.length > 0) {
        const userLayerIds = activeUserLayers.map((l) => l.id);
        const clickedUserFeatures = map.queryRenderedFeatures(e.point, {
          layers: userLayerIds,
        });

        // Convert to FeatureInfo format
        const userFeatures: FeatureInfo[] = clickedUserFeatures
          .filter((f) => f.layer)
          .map((f) => {
            const layerId = f.layer!.id;
            const userLayer = activeUserLayers.find((l) => l.id === layerId);
            return {
              layerId,
              layerName: userLayer?.name || layerId,
              properties: (f.properties || {}) as Record<string, unknown>,
              geometry: f.geometry,
              coordinates: [e.lngLat.lng, e.lngLat.lat] as [number, number],
              source: "user" as const,
            };
          });

        allFeatures.push(...userFeatures);
      }

      // Query overlay vector features at click point (client-side)
      if (vectorLayerIds.length > 0) {
        const clickedFeatures = map.queryRenderedFeatures(e.point, {
          layers: vectorLayerIds,
        });

        // Convert to FeatureInfo format
        const vectorFeatures: FeatureInfo[] = clickedFeatures
          .filter((f) => f.layer)
          .map((f) => {
            let layerId = f.layer!.id;
            if (layerId.endsWith("-outline")) {
              layerId = layerId.replace("-outline", "");
            }
            const overlayLayer = ALL_LAYERS.find((l) => l.id === layerId);
            return {
              layerId,
              layerName: overlayLayer?.name || layerId,
              properties: (f.properties || {}) as Record<string, unknown>,
              geometry: f.geometry,
              coordinates: [e.lngLat.lng, e.lngLat.lat] as [number, number],
              source: "overlay" as const,
            };
          });

        allFeatures.push(...vectorFeatures);
      }

      // Query raster layers via server-side identify
      if (rasterLayers.length > 0) {
        const bounds = map.getBounds();
        if (!bounds) {
          setIsLoading(false);
          return;
        }
        const mapExtent: [number, number, number, number] = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ];
        const canvas = map.getCanvas();
        const mapSize: [number, number] = [canvas.width, canvas.height];

        // Query each raster layer
        for (const layer of rasterLayers) {
          if (layer.service.type !== 'arcgis-dynamic' && layer.service.type !== 'arcgis-cached') {
            continue;
          }

          const config = layer.service;
          // Get layer IDs to query - from dynamicLayers JSON or layers array
          let layerIds: number[] | undefined;
          if (config.type === 'arcgis-dynamic') {
            if (config.dynamicLayers) {
              try {
                const dynamicLayersJson = JSON.parse(config.dynamicLayers);
                layerIds = dynamicLayersJson.map((dl: { id: number }) => dl.id);
              } catch {
                // Ignore parse errors
              }
            } else if (config.layers) {
              layerIds = config.layers;
            }
          }

          try {
            const results = await identifyArcGISFeatures(
              config.url,
              [e.lngLat.lng, e.lngLat.lat],
              mapExtent,
              mapSize,
              layerIds,
              5 // tolerance in pixels
            );

            // Convert identify results to FeatureInfo format
            for (const result of results) {
              allFeatures.push({
                layerId: layer.id,
                layerName: layer.name,
                properties: result.attributes,
                coordinates: [e.lngLat.lng, e.lngLat.lat],
                source: "overlay" as const,
              });
            }
          } catch (error) {
            console.error(`[FeatureInspector] Error identifying features for ${layer.id}:`, error);
          }
        }
      }

      // Remove duplicates (same layer, same properties)
      const uniqueFeatures = allFeatures.filter(
        (f, i, arr) =>
          arr.findIndex(
            (x) => x.layerId === f.layerId && JSON.stringify(x.properties) === JSON.stringify(f.properties)
          ) === i
      );

      setFeatures(uniqueFeatures);
      setExpandedFeature(0);
      setCursorPosition({ x: e.point.x, y: e.point.y });
      setIsLoading(false);
    };

    const handleMouseMove = () => {
      // Always show crosshair in inspection mode
      map.getCanvas().style.cursor = "crosshair";
    };

    map.on("click", handleClick);
    map.on("mousemove", handleMouseMove);

    // Set crosshair cursor when enabled
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      map.off("mousemove", handleMouseMove);
      map.getCanvas().style.cursor = "";
    };
  }, [map, enabled, getActiveVectorLayerIds, getActiveRasterLayers, getActiveUserLayerIds]);

  // Copy value to clipboard
  const copyValue = useCallback((key: string, value: unknown) => {
    navigator.clipboard.writeText(formatValue(value));
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Clear features when disabled
  useEffect(() => {
    if (!enabled) {
      setFeatures([]);
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Inspection Mode Indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
        >
          <MousePointer2 className="h-4 w-4" />
          <span className="text-sm font-medium">Inspection Mode</span>
          <span className="text-xs opacity-75">Click features to inspect</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 ml-2 hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Loading Indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 z-20 pointer-events-auto"
            style={{ right: rightOffset }}
          >
            <div className="bg-background/95 backdrop-blur rounded-lg shadow-xl border p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Querying features...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature Info Panel */}
      <AnimatePresence>
        {!isLoading && features.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-20 z-20 pointer-events-auto w-80"
            style={{ right: rightOffset }}
          >
            <div className="bg-background/95 backdrop-blur rounded-lg shadow-xl border overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">
                    {features.length} Feature{features.length !== 1 ? "s" : ""} Found
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => setFeatures([])}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Features List */}
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="divide-y">
                  {features.map((feature, index) => {
                    const isExpanded = expandedFeature === index;
                    const filteredProps = filterProperties(feature.properties);
                    const propCount = Object.keys(filteredProps).length;

                    return (
                      <div key={index} className="bg-background">
                        {/* Feature Header */}
                        <button
                          className="w-full p-3 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left"
                          onClick={() => setExpandedFeature(isExpanded ? -1 : index)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {feature.layerName}
                              </span>
                              {feature.source === "user" && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/50 text-primary">
                                  Layer
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {propCount} fields
                              </Badge>
                            </div>
                            {feature.coordinates && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {feature.coordinates[1].toFixed(5)}, {feature.coordinates[0].toFixed(5)}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Feature Properties */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 space-y-1">
                                {Object.entries(filteredProps).length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic py-2">
                                    No properties available
                                  </p>
                                ) : (
                                  Object.entries(filteredProps).map(([key, value]) => (
                                    <div
                                      key={key}
                                      className="flex items-start justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/30 group"
                                    >
                                      <span className="text-xs text-muted-foreground flex-shrink-0 max-w-[40%] truncate">
                                        {formatPropertyName(key)}
                                      </span>
                                      <div className="flex items-center gap-1 flex-1 justify-end min-w-0">
                                        <span
                                          className="text-xs font-medium text-right truncate max-w-[150px]"
                                          title={formatValue(value)}
                                        >
                                          {formatValue(value)}
                                        </span>
                                        <button
                                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                          onClick={() => copyValue(key, value)}
                                          title="Copy value"
                                        >
                                          {copiedField === key ? (
                                            <Check className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Copy className="h-3 w-3 text-muted-foreground" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-2 border-t bg-muted/20">
                <p className="text-[10px] text-muted-foreground text-center">
                  Click elsewhere on the map to inspect other features
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default FeatureInspector;
