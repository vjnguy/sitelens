"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Layers,
  Database,
  Code,
  Eye,
  EyeOff,
  Trash2,
  Focus,
  Palette,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Upload,
  Link2,
  Play,
  Square,
  Minus,
  MapPin,
  Loader2,
  Search,
  FolderPlus,
  Folder,
  FolderOpen,
  GripVertical,
  Table,
  List,
  FileJson,
  Globe,
  FileUp,
  MapPinned,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import type { Layer, LayerStyle, Feature, FeatureCollection } from "@/types/gis";
import { cn } from "@/lib/utils";
import {
  importFile,
  importFromUrl,
  getSupportedFileTypes,
  getFormatDescription,
  type ImportResult,
} from "@/lib/import/file-import";
import { OverlayLayersPanelV2 } from "./OverlayLayersPanelV2";
import { LegendLayer } from "./MapLegend";

interface LayerGroup {
  id: string;
  name: string;
  expanded: boolean;
  layerIds: string[];
}

interface LayersPanelProps {
  layers: Layer[];
  map?: mapboxgl.Map | null;
  onToggleVisibility: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onZoomToExtent: (layerId: string) => void;
  onEditStyle: (layerId: string) => void;
  onAddLayer: () => void;
  onAddCustomLayer?: (name: string, geojson: FeatureCollection) => void;
  onClose: () => void;
  onActiveLegendLayersChange?: (layers: LegendLayer[]) => void;
  className?: string;
}

type TabType = "layers" | "overlays" | "data" | "code";
type ViewMode = "table" | "list";

export function LayersPanel({
  layers,
  map,
  onToggleVisibility,
  onRemoveLayer,
  onZoomToExtent,
  onEditStyle,
  onAddLayer,
  onAddCustomLayer,
  onClose,
  onActiveLegendLayersChange,
  className,
}: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overlays"); // Default to overlays tab
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchQuery, setSearchQuery] = useState("");

  // Layer groups
  const [groups, setGroups] = useState<LayerGroup[]>([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Custom data input
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDataName, setCustomDataName] = useState("");
  const [customDataJson, setCustomDataJson] = useState("");
  const [customDataError, setCustomDataError] = useState<string | null>(null);
  const [customDataUrl, setCustomDataUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);

  // Code editor
  const [codeContent, setCodeContent] = useState(`// Spatial analysis code
// Available: layers, turf, map

const cadastre = getLayer('qld-cadastre');
if (cadastre) {
  const features = cadastre.features.slice(0, 10);
  console.log('Features:', features.length);

  // Calculate total area
  const totalArea = features.reduce((sum, f) => {
    return sum + (turf.area(f) || 0);
  }, 0);

  console.log('Total area:', totalArea, 'm²');
}
`);

  const filteredLayers = layers.filter((layer) =>
    layer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get layers not in any group
  const ungroupedLayers = filteredLayers.filter(
    (layer) => !groups.some((g) => g.layerIds.includes(layer.id))
  );

  const getLayerIcon = (type: string | undefined) => {
    switch (type) {
      case "fill":
        return Square;
      case "line":
        return Minus;
      default:
        return MapPin;
    }
  };

  const getLayerColor = (layer: Layer) => {
    return String(
      layer.style.paint?.["fill-color"] ||
        layer.style.paint?.["line-color"] ||
        layer.style.paint?.["circle-color"] ||
        "#3bb2d0"
    );
  };

  const createGroup = () => {
    if (!newGroupName.trim()) return;

    const group: LayerGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName,
      expanded: true,
      layerIds: [],
    };

    setGroups((prev) => [...prev, group]);
    setNewGroupName("");
    setShowNewGroupInput(false);
  };

  const toggleGroupExpanded = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, expanded: !g.expanded } : g))
    );
  };

  const addLayerToGroup = (layerId: string, groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId && !g.layerIds.includes(layerId)) {
          return { ...g, layerIds: [...g.layerIds, layerId] };
        }
        return g;
      })
    );
  };

  const removeLayerFromGroup = (layerId: string, groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id === groupId) {
          return { ...g, layerIds: g.layerIds.filter((id) => id !== layerId) };
        }
        return g;
      })
    );
  };

  const deleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleAddCustomData = () => {
    if (!customDataName.trim() || !customDataJson.trim()) {
      setCustomDataError("Please provide both name and GeoJSON data");
      return;
    }

    try {
      const geojson = JSON.parse(customDataJson);

      // Validate it's a FeatureCollection
      if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
        setCustomDataError("Invalid GeoJSON: must be a FeatureCollection");
        return;
      }

      onAddCustomLayer?.(customDataName, geojson);
      setCustomDataName("");
      setCustomDataJson("");
      setCustomDataError(null);
      setShowCustomInput(false);
    } catch (err) {
      setCustomDataError("Invalid JSON format");
    }
  };

  const handleLoadFromUrl = async () => {
    if (!customDataUrl.trim()) return;

    setIsLoadingUrl(true);
    setCustomDataError(null);
    setLastImportResult(null);

    try {
      const result = await importFromUrl(customDataUrl);
      setLastImportResult(result);

      if (!result.success || !result.data) {
        setCustomDataError(result.error || "Failed to load data from URL");
        return;
      }

      // Extract name from URL (remove extension and query params)
      const urlParts = customDataUrl.split("/");
      let fileName = urlParts[urlParts.length - 1].split("?")[0];
      fileName = fileName.replace(/\.(geojson|json|kml|kmz|zip|shp)$/i, "");

      onAddCustomLayer?.(fileName || "Imported Layer", result.data);
      setCustomDataUrl("");
      setShowCustomInput(false);
    } catch (err) {
      setCustomDataError("Failed to load data from URL");
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    setCustomDataError(null);
    setLastImportResult(null);

    try {
      const result = await importFile(file);
      setLastImportResult(result);

      if (!result.success || !result.data) {
        setCustomDataError(result.error || "Failed to parse file");
        return;
      }

      // Remove extension from filename
      const name = file.name.replace(/\.(geojson|json|kml|kmz|zip|shp)$/i, "");
      onAddCustomLayer?.(name, result.data);
      setShowCustomInput(false);
    } catch (err) {
      setCustomDataError("Failed to parse file");
    } finally {
      setIsLoadingFile(false);
    }

    // Reset input
    e.target.value = "";
  };

  const tabs: { id: TabType; label: string; icon: typeof Layers }[] = [
    { id: "layers", label: "Layers", icon: Layers },
    { id: "overlays", label: "Overlays", icon: Globe },
    { id: "data", label: "Data", icon: Database },
    { id: "code", label: "Code", icon: Code },
  ];

  const renderLayerRow = (layer: Layer, inGroup?: string) => {
    const LayerIcon = getLayerIcon(layer.style.type);
    const color = getLayerColor(layer);

    if (viewMode === "table") {
      return (
        <tr
          key={layer.id}
          className={cn(
            "border-b hover:bg-muted/30 transition-colors group",
            !layer.visible && "opacity-50"
          )}
        >
          <td className="p-2">
            <div
              className="h-5 w-5 rounded flex items-center justify-center"
              style={{ backgroundColor: color + "30" }}
            >
              <LayerIcon className="h-3 w-3" style={{ color }} />
            </div>
          </td>
          <td className="p-2">
            <div className="flex items-center gap-1.5">
              <span className="font-medium truncate max-w-[120px]" title={layer.name}>
                {layer.name}
              </span>
              {layer.isLoading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
              {layer.dynamicSource && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  Dynamic
                </Badge>
              )}
            </div>
          </td>
          <td className="p-2 text-muted-foreground text-xs capitalize">
            {layer.style.type || "point"}
          </td>
          <td className="p-2 font-mono text-xs">
            {layer.featureCount ?? layer.source_config?.data?.features?.length ?? "-"}
          </td>
          <td className="p-2">
            <div className="flex items-center justify-end gap-0.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onZoomToExtent(layer.id)}
                title="Zoom to extent"
              >
                <Focus className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onEditStyle(layer.id)}
                title="Edit style"
              >
                <Palette className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => onToggleVisibility(layer.id)}
                title={layer.visible ? "Hide" : "Show"}
              >
                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive"
                onClick={() => onRemoveLayer(layer.id)}
                title="Remove"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <div
        key={layer.id}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group",
          !layer.visible && "opacity-50"
        )}
      >
        <div
          className="h-7 w-7 rounded flex items-center justify-center shrink-0"
          style={{ backgroundColor: color + "20" }}
        >
          <LayerIcon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium truncate">{layer.name}</p>
            {layer.isLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {layer.style.type || "point"} •{" "}
            {layer.featureCount ?? layer.source_config?.data?.features?.length ?? 0} features
          </p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onZoomToExtent(layer.id)}
            title="Zoom to extent"
          >
            <Focus className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onEditStyle(layer.id)}
            title="Edit style"
          >
            <Palette className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => onToggleVisibility(layer.id)}
            title={layer.visible ? "Hide" : "Show"}
          >
            {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-destructive"
            onClick={() => onRemoveLayer(layer.id)}
            title="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-background/95 backdrop-blur rounded-lg shadow-lg h-full flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Header with Tabs */}
      <div className="border-b">
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={activeTab === tab.id ? "default" : "ghost"}
                className="h-8 px-3"
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4 mr-1.5" />
                {tab.label}
                {tab.id === "layers" && (
                  <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1">
                    {layers.length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layers Tab */}
      {activeTab === "layers" && (
        <>
          {/* Toolbar */}
          <div className="p-2 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search layers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setShowNewGroupInput(true)}
              title="Create group"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center border rounded-md">
              <Button
                size="sm"
                variant={viewMode === "table" ? "secondary" : "ghost"}
                className="h-8 w-8 p-0 rounded-r-none"
                onClick={() => setViewMode("table")}
              >
                <Table className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                className="h-8 w-8 p-0 rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* New Group Input */}
          {showNewGroupInput && (
            <div className="p-2 border-b flex items-center gap-2">
              <Input
                placeholder="Group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createGroup();
                  if (e.key === "Escape") {
                    setShowNewGroupInput(false);
                    setNewGroupName("");
                  }
                }}
                className="h-8 text-sm flex-1"
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={createGroup}>
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setShowNewGroupInput(false);
                  setNewGroupName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Layers Content */}
          <div className="flex-1 overflow-y-auto">
            {filteredLayers.length === 0 && groups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Layers className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No layers yet</p>
                <p className="text-xs mt-1">Add data from the Data tab</p>
              </div>
            ) : (
              <>
                {/* Layer Groups */}
                {groups.map((group) => {
                  const groupLayers = filteredLayers.filter((l) =>
                    group.layerIds.includes(l.id)
                  );

                  return (
                    <div key={group.id} className="border-b">
                      <div
                        className="flex items-center gap-2 p-2 hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleGroupExpanded(group.id)}
                      >
                        {group.expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {group.expanded ? (
                          <FolderOpen className="h-4 w-4 text-primary" />
                        ) : (
                          <Folder className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium text-sm flex-1">{group.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {groupLayers.length}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGroup(group.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      {group.expanded && (
                        <div className="pl-6">
                          {viewMode === "table" ? (
                            <table className="w-full text-sm">
                              <tbody>
                                {groupLayers.map((layer) => renderLayerRow(layer, group.id))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="p-2 space-y-1">
                              {groupLayers.map((layer) => renderLayerRow(layer, group.id))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ungrouped Layers */}
                {ungroupedLayers.length > 0 && (
                  <>
                    {groups.length > 0 && (
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                        Ungrouped
                      </div>
                    )}
                    {viewMode === "table" ? (
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium text-muted-foreground w-8"></th>
                            <th className="text-left p-2 font-medium text-muted-foreground">
                              Layer
                            </th>
                            <th className="text-left p-2 font-medium text-muted-foreground w-16">
                              Type
                            </th>
                            <th className="text-left p-2 font-medium text-muted-foreground w-16">
                              Count
                            </th>
                            <th className="text-right p-2 font-medium text-muted-foreground w-24">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>{ungroupedLayers.map((layer) => renderLayerRow(layer))}</tbody>
                      </table>
                    ) : (
                      <div className="p-2 space-y-1">
                        {ungroupedLayers.map((layer) => renderLayerRow(layer))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Add Layer Button */}
          <div className="p-2 border-t">
            <Button size="sm" variant="outline" className="w-full" onClick={() => {
              setActiveTab("data");
              setShowCustomInput(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Layer
            </Button>
          </div>
        </>
      )}

      {/* Overlays Tab */}
      {activeTab === "overlays" && (
        <div className="flex-1 overflow-y-auto p-2">
          <OverlayLayersPanelV2
            map={map || null}
            onActiveLegendLayersChange={onActiveLegendLayersChange}
          />
        </div>
      )}

      {/* Data Tab */}
      {activeTab === "data" && (
        <div className="flex-1 overflow-y-auto p-3">
          {showCustomInput ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Add Custom Data</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomDataError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Upload File</Label>
                <label className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                  isLoadingFile ? "opacity-50 cursor-wait" : "hover:bg-muted/30 hover:border-primary/50"
                )}>
                  {isLoadingFile ? (
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  ) : (
                    <FileUp className="h-6 w-6 text-muted-foreground" />
                  )}
                  <div className="text-center">
                    <span className="text-sm text-foreground font-medium">
                      {isLoadingFile ? "Processing..." : "Drop file or click to browse"}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      GeoJSON, KML, KMZ, Shapefile (.zip)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept={getSupportedFileTypes()}
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoadingFile}
                  />
                </label>

                {/* Import result feedback */}
                {lastImportResult && (
                  <div className={cn(
                    "flex items-start gap-2 p-2 rounded-lg text-xs",
                    lastImportResult.success
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-destructive/10 text-destructive"
                  )}>
                    {lastImportResult.success ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      {lastImportResult.success ? (
                        <>
                          <p className="font-medium">Imported {lastImportResult.featureCount} features</p>
                          <p className="text-muted-foreground">
                            Format: {getFormatDescription(lastImportResult.format)}
                            {lastImportResult.extractedImages && lastImportResult.extractedImages > 0 && (
                              <> • {lastImportResult.extractedImages} images extracted</>
                            )}
                          </p>
                        </>
                      ) : (
                        <p>{lastImportResult.error}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Load from URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/data.geojson"
                    value={customDataUrl}
                    onChange={(e) => setCustomDataUrl(e.target.value)}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    className="h-9"
                    onClick={handleLoadFromUrl}
                    disabled={isLoadingUrl || !customDataUrl.trim()}
                  >
                    {isLoadingUrl ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Paste GeoJSON */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Paste GeoJSON</Label>
                <Input
                  placeholder="Layer name..."
                  value={customDataName}
                  onChange={(e) => setCustomDataName(e.target.value)}
                  className="h-9 text-sm"
                />
                <textarea
                  className="w-full h-32 p-2 text-xs font-mono border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-muted/30"
                  placeholder='{"type": "FeatureCollection", "features": [...]}'
                  value={customDataJson}
                  onChange={(e) => {
                    setCustomDataJson(e.target.value);
                    setCustomDataError(null);
                  }}
                />
                {customDataError && (
                  <p className="text-xs text-destructive">{customDataError}</p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAddCustomData}
                  disabled={!customDataName.trim() || !customDataJson.trim()}
                >
                  <FileJson className="h-4 w-4 mr-1" />
                  Add GeoJSON Layer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Data Sources
              </p>

              <div className="space-y-2">
                <button
                  className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  onClick={() => setActiveTab("overlays")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="font-medium">Queensland Spatial</span>
                    <Badge variant="secondary" className="text-[10px]">
                      API
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cadastre, boundaries, zoning data
                  </p>
                </button>

                <button className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-green-500" />
                    <span className="font-medium">NSW Spatial</span>
                    <Badge variant="outline" className="text-[10px]">
                      Coming
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">NSW property and planning data</p>
                </button>

                <button className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left opacity-60">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Victoria Spatial</span>
                    <Badge variant="outline" className="text-[10px]">
                      Coming
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Victorian property datasets</p>
                </button>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Custom Data
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-9"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom GeoJSON / URL
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Tab */}
      {activeTab === "code" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-2">
            <textarea
              className="w-full h-full font-mono text-xs bg-slate-900 text-slate-100 rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              value={codeContent}
              onChange={(e) => setCodeContent(e.target.value)}
              placeholder="// Write spatial analysis code here..."
              spellCheck={false}
            />
          </div>
          <div className="p-2 border-t flex items-center gap-2">
            <Button size="sm" className="flex-1">
              <Play className="h-3.5 w-3.5 mr-1" />
              Run Code
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCodeContent("")}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LayersPanel;
