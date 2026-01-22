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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  FileBox,
  Settings,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  status: "active" | "inactive" | "error";
  filesProcessed: number;
}

const availableConnectors = [
  {
    type: "autocad",
    name: "AutoCAD",
    description: "Import and analyze DXF/DWG files",
    color: "bg-red-500",
    available: true,
  },
  {
    type: "qgis",
    name: "QGIS",
    description: "GeoJSON, Shapefiles, KML, GeoPackage, QGIS projects",
    color: "bg-green-600",
    available: true,
  },
  {
    type: "solidworks",
    name: "SolidWorks",
    description: "Connect to SolidWorks for SLDPRT/SLDASM files",
    color: "bg-orange-500",
    available: false,
  },
  {
    type: "fusion360",
    name: "Fusion 360",
    description: "Sync with Autodesk Fusion 360 projects",
    color: "bg-blue-500",
    available: false,
  },
  {
    type: "onshape",
    name: "Onshape",
    description: "Connect to Onshape cloud CAD",
    color: "bg-purple-500",
    available: false,
  },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [connectorName, setConnectorName] = useState("");

  const handleAddConnector = () => {
    if (!selectedType || !connectorName) return;

    const newConnector: ConnectorConfig = {
      id: Date.now().toString(),
      name: connectorName,
      type: selectedType,
      status: "active",
      filesProcessed: 0,
    };

    setConnectors([...connectors, newConnector]);
    setShowAddDialog(false);
    setSelectedType(null);
    setConnectorName("");
  };

  const handleRemoveConnector = (id: string) => {
    setConnectors(connectors.filter((c) => c.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Connectors</h1>
          <p className="text-muted-foreground mt-1">
            Manage your engineering tool integrations
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connector
        </Button>
      </div>

      {/* Active Connectors */}
      {connectors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Active Connectors</h2>
          <div className="grid gap-4">
            {connectors.map((connector) => (
              <Card key={connector.id}>
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <FileBox className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{connector.name}</p>
                        <Badge
                          variant={
                            connector.status === "active" ? "success" : "destructive"
                          }
                        >
                          {connector.status === "active" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {connector.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {connector.type.toUpperCase()} connector •{" "}
                        {connector.filesProcessed} files processed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveConnector(connector.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Connector Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add Connector</CardTitle>
              <CardDescription>
                Choose an integration to connect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedType ? (
                <div className="grid grid-cols-2 gap-4">
                  {availableConnectors.map((connector) => (
                    <button
                      key={connector.type}
                      onClick={() =>
                        connector.available && setSelectedType(connector.type)
                      }
                      disabled={!connector.available}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        connector.available
                          ? "hover:border-primary cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`h-10 w-10 rounded-lg ${connector.color}/10 flex items-center justify-center`}
                        >
                          <FileBox
                            className={`h-5 w-5 ${connector.color.replace(
                              "bg-",
                              "text-"
                            )}`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{connector.name}</p>
                          {!connector.available && (
                            <Badge variant="secondary" className="text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {connector.description}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="connectorName">Connector Name</Label>
                    <Input
                      id="connectorName"
                      placeholder="My AutoCAD Connector"
                      value={connectorName}
                      onChange={(e) => setConnectorName(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedType(null);
                        setConnectorName("");
                      }}
                    >
                      Back
                    </Button>
                    <Button onClick={handleAddConnector} disabled={!connectorName}>
                      Create Connector
                    </Button>
                  </div>
                </div>
              )}
              {!selectedType && (
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {connectors.length === 0 && !showAddDialog && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Plug className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No connectors yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Connect your engineering tools to start automating workflows and
              analyzing CAD files.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Connector
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Plug(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}
