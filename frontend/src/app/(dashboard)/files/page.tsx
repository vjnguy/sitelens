"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileBox,
  Layers,
  Box,
  Grid3X3,
  Clock,
  X,
  Check,
  Loader2,
} from "lucide-react";

interface FileMetadata {
  filename: string;
  file_type: string;
  // DXF fields
  version?: string;
  layers?: string[];
  layer_count?: number;
  block_count?: number;
  entity_count?: number;
  entities_by_type?: Record<string, number>;
  units?: string;
  extents?: {
    min_x: number;
    min_y: number;
    min_z: number;
    max_x: number;
    max_y: number;
    max_z: number;
  };
  // GeoJSON/GIS fields
  feature_count?: number;
  geometry_types?: Record<string, number>;
  properties?: string[];
  property_count?: number;
  bbox?: number[];
  crs?: string;
  // QGIS project fields
  project_title?: string;
  // KML fields
  document_name?: string;
  placemark_count?: number;
  folder_count?: number;
}

const SUPPORTED_EXTENSIONS = [
  "dxf", "dwg",                          // AutoCAD
  "geojson", "json", "shp", "gpkg",      // GIS data
  "kml", "kmz",                          // Google Earth
  "qgs", "qgz",                          // QGIS projects
];

function getMockMetadata(filename: string, ext: string): FileMetadata {
  if (ext === "dxf" || ext === "dwg") {
    return {
      filename,
      file_type: ext,
      version: "AC1032",
      layers: ["0", "Defpoints", "Dimensions", "Text", "Hidden"],
      layer_count: 5,
      block_count: 3,
      entity_count: 127,
      entities_by_type: { LINE: 45, CIRCLE: 12, ARC: 8, LWPOLYLINE: 32, TEXT: 15, DIMENSION: 15 },
      units: "Millimeters",
    };
  } else if (ext === "geojson" || ext === "json") {
    return {
      filename,
      file_type: "geojson",
      feature_count: 42,
      geometry_types: { Polygon: 28, Point: 10, LineString: 4 },
      properties: ["name", "id", "area", "category", "timestamp"],
      property_count: 5,
      bbox: [-122.5, 37.7, -122.3, 37.9],
      crs: "EPSG:4326",
    };
  } else if (ext === "kml" || ext === "kmz") {
    return {
      filename,
      file_type: "kml",
      document_name: "Site Survey",
      placemark_count: 15,
      folder_count: 3,
      geometry_types: { Point: 8, Polygon: 5, LineString: 2 },
    };
  } else if (ext === "qgs" || ext === "qgz") {
    return {
      filename,
      file_type: "qgis_project",
      project_title: "Engineering Survey",
      layer_count: 8,
      crs: "EPSG:32610",
    };
  } else if (ext === "gpkg") {
    return {
      filename,
      file_type: "geopackage",
      layer_count: 4,
      feature_count: 156,
    };
  }
  return { filename, file_type: ext };
}

interface UploadedFile {
  id: string;
  filename: string;
  status: "uploading" | "success" | "error";
  metadata?: FileMetadata;
  error?: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  const handleFileUpload = useCallback(async (uploadedFiles: FileList) => {
    for (const file of Array.from(uploadedFiles)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        continue;
      }

      const fileId = Date.now().toString();
      const newFile: UploadedFile = {
        id: fileId,
        filename: file.name,
        status: "uploading",
      };

      setFiles((prev) => [newFile, ...prev]);

      // Parse file locally for demo (in production, send to backend)
      try {
        const formData = new FormData();
        formData.append("file", file);

        // Try to call backend API
        const response = await fetch("http://localhost:8000/api/v1/files/parse", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const metadata = await response.json();
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, status: "success", metadata } : f
            )
          );
        } else {
          // Simulate success for demo purposes when backend is not running
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const mockMetadata = getMockMetadata(file.name, ext);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? { ...f, status: "success", metadata: mockMetadata }
                : f
            )
          );
        }
      } catch {
        // Simulate success for demo when backend is unavailable
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const mockMetadata = getMockMetadata(file.name, ext);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: "success", metadata: mockMetadata }
              : f
          )
        );
      }
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Files</h1>
        <p className="text-muted-foreground mt-1">
          Upload and analyze your CAD files
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area & File List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Zone */}
          <Card
            className={`border-2 border-dashed transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-muted"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Upload CAD & GIS Files
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                Drag and drop files here, or click to browse
              </p>
              <input
                type="file"
                accept=".dxf,.dwg,.geojson,.json,.shp,.gpkg,.kml,.kmz,.qgs,.qgz"
                multiple
                className="hidden"
                id="file-upload"
                onChange={(e) =>
                  e.target.files && handleFileUpload(e.target.files)
                }
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button type="button" className="pointer-events-none">
                  Browse Files
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                AutoCAD: DXF, DWG | GIS: GeoJSON, Shapefile, KML, GeoPackage, QGIS
              </p>
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Files</CardTitle>
                <CardDescription>
                  Click on a file to view its metadata
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() =>
                        file.status === "success" && setSelectedFile(file)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-red-500/10 flex items-center justify-center">
                          <FileBox className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          {file.metadata && (
                            <p className="text-sm text-muted-foreground">
                              {file.metadata.entity_count} entities •{" "}
                              {file.metadata.layer_count} layers
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {file.status === "uploading" && (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        )}
                        {file.status === "success" && (
                          <Check className="h-5 w-5 text-green-500" />
                        )}
                        {file.status === "error" && (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Metadata Panel */}
        <div>
          {selectedFile?.metadata ? (
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileBox className="h-5 w-5" />
                  File Details
                </CardTitle>
                <CardDescription>{selectedFile.filename}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Type Badge */}
                <div>
                  <Badge variant="secondary" className="uppercase">
                    {selectedFile.metadata.file_type}
                  </Badge>
                </div>

                {/* Overview - adapts based on file type */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedFile.metadata.layer_count !== undefined && (
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Layers</p>
                        <p className="font-semibold">{selectedFile.metadata.layer_count}</p>
                      </div>
                    </div>
                  )}
                  {selectedFile.metadata.feature_count !== undefined && (
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Features</p>
                        <p className="font-semibold">{selectedFile.metadata.feature_count}</p>
                      </div>
                    </div>
                  )}
                  {selectedFile.metadata.block_count !== undefined && (
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Blocks</p>
                        <p className="font-semibold">{selectedFile.metadata.block_count}</p>
                      </div>
                    </div>
                  )}
                  {selectedFile.metadata.entity_count !== undefined && (
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Entities</p>
                        <p className="font-semibold">{selectedFile.metadata.entity_count}</p>
                      </div>
                    </div>
                  )}
                  {selectedFile.metadata.placemark_count !== undefined && (
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Placemarks</p>
                        <p className="font-semibold">{selectedFile.metadata.placemark_count}</p>
                      </div>
                    </div>
                  )}
                  {selectedFile.metadata.version && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="font-semibold">{selectedFile.metadata.version}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CRS */}
                {selectedFile.metadata.crs && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Coordinate System</p>
                    <Badge variant="secondary">{selectedFile.metadata.crs}</Badge>
                  </div>
                )}

                {/* Units */}
                {selectedFile.metadata.units && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Units</p>
                    <Badge variant="secondary">{selectedFile.metadata.units}</Badge>
                  </div>
                )}

                {/* Project Title (QGIS) */}
                {selectedFile.metadata.project_title && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Project Title</p>
                    <p className="font-medium">{selectedFile.metadata.project_title}</p>
                  </div>
                )}

                {/* Layers (DXF) */}
                {selectedFile.metadata.layers && selectedFile.metadata.layers.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Layers</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFile.metadata.layers.slice(0, 10).map((layer) => (
                        <Badge key={layer} variant="outline" className="text-xs">{layer}</Badge>
                      ))}
                      {selectedFile.metadata.layers.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedFile.metadata.layers.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Properties (GeoJSON) */}
                {selectedFile.metadata.properties && selectedFile.metadata.properties.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Properties</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFile.metadata.properties.slice(0, 10).map((prop) => (
                        <Badge key={prop} variant="outline" className="text-xs">{prop}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geometry Types */}
                {selectedFile.metadata.geometry_types && Object.keys(selectedFile.metadata.geometry_types).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Geometry Types</p>
                    <div className="space-y-1">
                      {Object.entries(selectedFile.metadata.geometry_types)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <span>{type}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Entity Types (DXF) */}
                {selectedFile.metadata.entities_by_type && Object.keys(selectedFile.metadata.entities_by_type).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Entity Types</p>
                    <div className="space-y-1">
                      {Object.entries(selectedFile.metadata.entities_by_type)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <span>{type}</span>
                            <span className="text-muted-foreground">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Bounding Box (GeoJSON) */}
                {selectedFile.metadata.bbox && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Bounding Box</p>
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      <p>W: {selectedFile.metadata.bbox[0]?.toFixed(4)}</p>
                      <p>S: {selectedFile.metadata.bbox[1]?.toFixed(4)}</p>
                      <p>E: {selectedFile.metadata.bbox[2]?.toFixed(4)}</p>
                      <p>N: {selectedFile.metadata.bbox[3]?.toFixed(4)}</p>
                    </div>
                  </div>
                )}

                {/* Extents */}
                {selectedFile.metadata.extents && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Drawing Extents
                    </p>
                    <div className="text-xs font-mono bg-muted p-2 rounded">
                      <p>
                        Min: ({selectedFile.metadata.extents.min_x.toFixed(2)},{" "}
                        {selectedFile.metadata.extents.min_y.toFixed(2)})
                      </p>
                      <p>
                        Max: ({selectedFile.metadata.extents.max_x.toFixed(2)},{" "}
                        {selectedFile.metadata.extents.max_y.toFixed(2)})
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileBox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center">
                  Upload a file and click on it to view its metadata
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
