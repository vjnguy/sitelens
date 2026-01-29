"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  MapPin,
  Plus,
  Trash2,
  Download,
  Pencil,
  Check,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface MarkerAttribute {
  key: string;
  value: string;
}

interface ProjectMarker {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  location: { lng: number; lat: number };
  color: string;
  icon: string;
  attributes: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface ProjectMarkersPanelProps {
  projectId: string;
  map: mapboxgl.Map | null;
  onClose: () => void;
  className?: string;
}

const MARKER_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#64748b", // slate
];

export function ProjectMarkersPanel({
  projectId,
  map,
  onClose,
  className,
}: ProjectMarkersPanelProps) {
  const [markers, setMarkers] = useState<ProjectMarker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add marker mode
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [newMarkerName, setNewMarkerName] = useState("");
  const [newMarkerColor, setNewMarkerColor] = useState(MARKER_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Expanded marker (to show attributes)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Map markers reference
  const mapMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Load markers
  const loadMarkers = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/markers`);

      if (!response.ok) {
        throw new Error("Failed to load markers");
      }

      const data = await response.json();
      setMarkers(data.markers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markers");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);

  // Sync markers to map
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    mapMarkersRef.current.forEach((marker) => marker.remove());
    mapMarkersRef.current.clear();

    // Add markers for each project marker
    markers.forEach((marker) => {
      const el = document.createElement("div");
      el.className = "project-marker";
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: ${marker.color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;
      el.title = marker.name;

      el.addEventListener("click", () => {
        setExpandedId(expandedId === marker.id ? null : marker.id);
      });

      const mapMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([marker.location.lng, marker.location.lat])
        .addTo(map);

      mapMarkersRef.current.set(marker.id, mapMarker);
    });

    return () => {
      mapMarkersRef.current.forEach((marker) => marker.remove());
      mapMarkersRef.current.clear();
    };
  }, [map, markers, expandedId]);

  // Handle map click when adding marker
  useEffect(() => {
    if (!map || !isAddingMarker) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      setPendingLocation({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };

    map.on("click", handleClick);
    map.getCanvas().style.cursor = "crosshair";

    return () => {
      map.off("click", handleClick);
      map.getCanvas().style.cursor = "";
    };
  }, [map, isAddingMarker]);

  // Save new marker
  const handleSaveMarker = async () => {
    if (!pendingLocation || !newMarkerName.trim()) return;

    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}/markers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMarkerName.trim(),
          location: pendingLocation,
          color: newMarkerColor,
          attributes: {},
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save marker");
      }

      // Reset and reload
      setNewMarkerName("");
      setPendingLocation(null);
      setIsAddingMarker(false);
      loadMarkers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save marker");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete marker
  const handleDeleteMarker = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/markers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete marker");
      }

      loadMarkers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete marker");
    }
  };

  // Rename marker
  const handleRenameMarker = async (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/markers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename marker");
      }

      setEditingId(null);
      loadMarkers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename marker");
    }
  };

  // Export markers as CSV
  const handleExport = () => {
    window.open(`/api/projects/${projectId}/markers/export`, "_blank");
  };

  // Fly to marker
  const handleFlyTo = (marker: ProjectMarker) => {
    map?.flyTo({
      center: [marker.location.lng, marker.location.lat],
      zoom: 17,
      duration: 1000,
    });
  };

  // Copy coordinates
  const handleCopyCoords = (marker: ProjectMarker) => {
    const coords = `${marker.location.lat.toFixed(6)}, ${marker.location.lng.toFixed(6)}`;
    navigator.clipboard.writeText(coords);
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
      <div className="p-4 border-b bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20">
              <MapPin className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold">Project Markers</h2>
              <p className="text-[10px] text-muted-foreground">{markers.length} locations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {markers.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={handleExport}
                title="Export as CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
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
      </div>

      {/* Add Marker Button / Form */}
      <div className="p-4 border-b">
        {!isAddingMarker ? (
          <Button className="w-full gap-2" onClick={() => setIsAddingMarker(true)}>
            <Plus className="h-4 w-4" />
            Add Marker
          </Button>
        ) : pendingLocation ? (
          <div className="space-y-3">
            <Input
              placeholder="Marker name..."
              value={newMarkerName}
              onChange={(e) => setNewMarkerName(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Color:</span>
              {MARKER_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform",
                    newMarkerColor === color ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewMarkerColor(color)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveMarker}
                disabled={!newMarkerName.trim() || isSaving}
                className="flex-1"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAddingMarker(false);
                  setPendingLocation(null);
                  setNewMarkerName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
              <Target className="h-4 w-4 animate-pulse" />
              Click on the map to place marker
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => setIsAddingMarker(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Markers List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : markers.length === 0 ? (
          <div className="text-center py-8 px-4">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No markers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add markers to save important locations
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {markers.map((marker) => (
              <div key={marker.id} className="p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Color indicator */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 cursor-pointer"
                    style={{ backgroundColor: marker.color }}
                    onClick={() => handleFlyTo(marker)}
                  />

                  {/* Name / Edit */}
                  <div className="flex-1 min-w-0">
                    {editingId === marker.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-7 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameMarker(marker.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                        />
                        <Button
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRenameMarker(marker.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p
                        className="font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => handleFlyTo(marker)}
                      >
                        {marker.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {marker.location.lat.toFixed(5)}, {marker.location.lng.toFixed(5)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleCopyCoords(marker)}
                      title="Copy coordinates"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(marker.id);
                        setEditingName(marker.name);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteMarker(marker.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setExpandedId(expandedId === marker.id ? null : marker.id)}
                    >
                      {expandedId === marker.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded attributes */}
                <AnimatePresence>
                  {expandedId === marker.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 ml-7 text-xs"
                    >
                      {marker.description && (
                        <p className="text-muted-foreground mb-2">{marker.description}</p>
                      )}
                      {Object.keys(marker.attributes || {}).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(marker.attributes).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span>{value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No custom attributes</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 border-t bg-destructive/10 text-destructive text-sm"
          >
            {error}
            <Button
              size="sm"
              variant="ghost"
              className="ml-2 h-6"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ProjectMarkersPanel;
