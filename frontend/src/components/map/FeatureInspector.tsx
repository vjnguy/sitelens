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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type mapboxgl from "mapbox-gl";
import { ALL_LAYERS, type OverlayLayer } from "@/lib/overlays";

interface FeatureInfo {
  layerId: string;
  layerName: string;
  properties: Record<string, unknown>;
  geometry?: GeoJSON.Geometry;
  coordinates?: [number, number];
}

interface FeatureInspectorProps {
  map: mapboxgl.Map | null;
  enabled: boolean;
  onClose: () => void;
  /** Offset from right edge to avoid overlapping with other panels (in pixels) */
  rightOffset?: number;
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

export function FeatureInspector({ map, enabled, onClose, rightOffset = 64 }: FeatureInspectorProps) {
  const [features, setFeatures] = useState<FeatureInfo[]>([]);
  const [expandedFeature, setExpandedFeature] = useState<number>(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  // Get list of active overlay layer IDs
  const getActiveOverlayLayerIds = useCallback((): string[] => {
    if (!map) return [];

    const layerIds: string[] = [];
    ALL_LAYERS.forEach((layer) => {
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

  // Handle map click for feature inspection
  useEffect(() => {
    if (!map || !enabled) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const overlayLayerIds = getActiveOverlayLayerIds();
      if (overlayLayerIds.length === 0) return;

      // Query features at click point
      const clickedFeatures = map.queryRenderedFeatures(e.point, {
        layers: overlayLayerIds,
      });

      if (clickedFeatures.length === 0) {
        setFeatures([]);
        return;
      }

      // Convert to FeatureInfo format
      const featureInfos: FeatureInfo[] = clickedFeatures
        .filter((f) => f.layer) // Filter out features without layer info
        .map((f) => {
          // Find the overlay layer definition
          let layerId = f.layer!.id;
          // Remove -outline suffix if present
          if (layerId.endsWith("-outline")) {
            layerId = layerId.replace("-outline", "");
          }

          const overlayLayer = ALL_LAYERS.find((l) => l.id === layerId);

          return {
            layerId,
            layerName: overlayLayer?.name || layerId,
            properties: (f.properties || {}) as Record<string, unknown>,
            geometry: f.geometry,
            coordinates: [e.lngLat.lng, e.lngLat.lat],
          };
        });

      // Remove duplicates (same layer, same properties)
      const uniqueFeatures = featureInfos.filter(
        (f, i, arr) =>
          arr.findIndex(
            (x) => x.layerId === f.layerId && JSON.stringify(x.properties) === JSON.stringify(f.properties)
          ) === i
      );

      setFeatures(uniqueFeatures);
      setExpandedFeature(0);
      setCursorPosition({ x: e.point.x, y: e.point.y });
    };

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      const overlayLayerIds = getActiveOverlayLayerIds();
      if (overlayLayerIds.length === 0) {
        map.getCanvas().style.cursor = "";
        return;
      }

      const hoveredFeatures = map.queryRenderedFeatures(e.point, {
        layers: overlayLayerIds,
      });

      map.getCanvas().style.cursor = hoveredFeatures.length > 0 ? "crosshair" : "crosshair";
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
  }, [map, enabled, getActiveOverlayLayerIds]);

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

      {/* Feature Info Panel */}
      <AnimatePresence>
        {features.length > 0 && (
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
