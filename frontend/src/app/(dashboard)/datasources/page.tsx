"use client";

import { useState } from "react";
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
  Database,
  Globe,
  Link2,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { DataSource } from "@/types/gis";

// Mock data sources
const MOCK_DATA_SOURCES: DataSource[] = [
  {
    id: "1",
    name: "Data.gov.au",
    type: "api",
    config: {
      baseUrl: "https://data.gov.au/api/3",
    },
    status: "connected",
    lastSync: "2024-01-20T10:00:00Z",
  },
  {
    id: "2",
    name: "NSW Spatial Services",
    type: "wms",
    config: {
      baseUrl: "https://maps.six.nsw.gov.au/arcgis/rest/services",
    },
    status: "connected",
    lastSync: "2024-01-20T09:30:00Z",
  },
];

// Available data source templates
const DATA_SOURCE_TEMPLATES = [
  {
    id: "data-gov-au",
    name: "Data.gov.au",
    description: "Australian Government Open Data Portal",
    type: "api",
    icon: Globe,
    status: "available",
  },
  {
    id: "nsw-spatial",
    name: "NSW Spatial Services",
    description: "NSW cadastral, zoning, and environmental data",
    type: "wms",
    icon: Globe,
    status: "available",
  },
  {
    id: "vic-planning",
    name: "VicPlan",
    description: "Victoria planning and property information",
    type: "api",
    icon: Globe,
    status: "coming_soon",
  },
  {
    id: "qld-globe",
    name: "Queensland Globe",
    description: "Queensland spatial data portal",
    type: "api",
    icon: Globe,
    status: "coming_soon",
  },
  {
    id: "osm",
    name: "OpenStreetMap",
    description: "Free geographic data including roads, buildings, and POIs",
    type: "api",
    icon: Globe,
    status: "available",
  },
  {
    id: "custom-api",
    name: "Custom API",
    description: "Connect to any REST API with GeoJSON support",
    type: "api",
    icon: Link2,
    status: "available",
  },
  {
    id: "wms-wfs",
    name: "WMS/WFS Service",
    description: "Connect to OGC-compliant web map services",
    type: "wms",
    icon: Database,
    status: "available",
  },
];

export default function DataSourcesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dataSources, setDataSources] = useState<DataSource[]>(MOCK_DATA_SOURCES);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const getStatusIcon = (status: DataSource["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: DataSource["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Connected</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground mt-1">
            Connect to property data, spatial APIs, and external services
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Data Source
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search data sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Connected Data Sources */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Connected Sources</h2>
        {dataSources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No data sources connected</p>
              <Button
                variant="link"
                onClick={() => setShowAddDialog(true)}
                className="mt-2"
              >
                Add your first data source
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dataSources.map((source) => (
              <Card key={source.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{source.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {source.type.toUpperCase()}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusIcon(source.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      {getStatusBadge(source.status)}
                    </div>
                    {source.lastSync && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last sync</span>
                        <span className="text-sm">
                          {new Date(source.lastSync).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Data Sources */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DATA_SOURCE_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className={
                template.status === "coming_soon" ? "opacity-60" : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <template.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{template.type.toUpperCase()}</Badge>
                  {template.status === "coming_soon" ? (
                    <Badge variant="outline">Coming Soon</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setShowAddDialog(true)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Connect Data Source</CardTitle>
              <CardDescription>
                Add a new data source to your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Source Name</label>
                <Input placeholder="My Data Source" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select className="w-full h-10 px-3 border rounded-lg bg-background">
                  <option value="api">REST API</option>
                  <option value="wms">WMS Service</option>
                  <option value="wfs">WFS Service</option>
                  <option value="tiles">Tile Server</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input placeholder="https://api.example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key (optional)</label>
                <Input type="password" placeholder="Enter API key" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setShowAddDialog(false)}>
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
