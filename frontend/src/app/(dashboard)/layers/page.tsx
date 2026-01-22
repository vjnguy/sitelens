"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Layers,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  Upload,
  Download,
  MapPin,
  Square,
  Minus,
} from "lucide-react";
import type { Layer } from "@/types/gis";
import { cn } from "@/lib/utils";

// Mock layers
const MOCK_LAYERS: (Layer & { projectName: string })[] = [
  {
    id: "1",
    project_id: "1",
    projectName: "Sydney CBD Analysis",
    name: "Landmarks",
    type: "vector",
    source_type: "geojson",
    source_config: { data: { type: "FeatureCollection", features: [] } },
    style: { type: "circle", paint: { "circle-color": "#3bb2d0" } },
    visible: true,
    order_index: 0,
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    project_id: "1",
    projectName: "Sydney CBD Analysis",
    name: "Heritage Areas",
    type: "vector",
    source_type: "geojson",
    source_config: { data: { type: "FeatureCollection", features: [] } },
    style: { type: "fill", paint: { "fill-color": "#8B4513", "fill-opacity": 0.3 } },
    visible: true,
    order_index: 1,
    created_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "3",
    project_id: "2",
    projectName: "Melbourne Metro Assessment",
    name: "Flood Zones",
    type: "vector",
    source_type: "api",
    source_config: { apiEndpoint: "https://api.example.com/flood" },
    style: { type: "fill", paint: { "fill-color": "#4169E1", "fill-opacity": 0.3 } },
    visible: false,
    order_index: 0,
    created_at: "2024-01-10T09:00:00Z",
  },
];

const getLayerIcon = (styleType: string | undefined) => {
  switch (styleType) {
    case "fill":
      return Square;
    case "line":
      return Minus;
    case "circle":
    default:
      return MapPin;
  }
};

export default function LayersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [layers] = useState(MOCK_LAYERS);

  const filteredLayers = layers.filter(
    (layer) =>
      layer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      layer.projectName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group layers by project
  const layersByProject = filteredLayers.reduce((acc, layer) => {
    if (!acc[layer.project_id]) {
      acc[layer.project_id] = {
        projectName: layer.projectName,
        layers: [],
      };
    }
    acc[layer.project_id].layers.push(layer);
    return acc;
  }, {} as Record<string, { projectName: string; layers: typeof layers }>);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Layers</h1>
          <p className="text-muted-foreground mt-1">
            Manage all layers across your projects
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Layer
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Layers by Project */}
      {Object.keys(layersByProject).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No layers yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Create a project and add layers to start visualizing your spatial data.
            </p>
            <Link href="/projects">
              <Button>Go to Projects</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(layersByProject).map(([projectId, { projectName, layers: projectLayers }]) => (
            <Card key={projectId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{projectName}</CardTitle>
                    <CardDescription>
                      {projectLayers.length} layer{projectLayers.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <Link href={`/projects/${projectId}`}>
                    <Button variant="outline" size="sm">
                      Open Project
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {projectLayers.map((layer) => {
                    const LayerIcon = getLayerIcon(layer.style.type);
                    return (
                      <div
                        key={layer.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded flex items-center justify-center"
                            style={{
                              backgroundColor:
                                String(
                                  layer.style.paint?.["fill-color"] ||
                                    layer.style.paint?.["line-color"] ||
                                    layer.style.paint?.["circle-color"] ||
                                    "#3bb2d0"
                                ) + "20",
                            }}
                          >
                            <LayerIcon
                              className="h-4 w-4"
                              style={{
                                color:
                                  String(
                                    layer.style.paint?.["fill-color"] ||
                                      layer.style.paint?.["line-color"] ||
                                      layer.style.paint?.["circle-color"] ||
                                      "#3bb2d0"
                                  ),
                              }}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{layer.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {layer.type}
                              </Badge>
                              <span>•</span>
                              <span>{layer.source_type}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={layer.visible ? "Hide" : "Show"}
                          >
                            {layer.visible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Settings"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
