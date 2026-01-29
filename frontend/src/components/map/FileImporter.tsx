"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileJson,
  Globe,
  FileArchive,
  Table,
  PenTool,
  Image,
  Navigation,
  File,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  importFile,
  importFromUrl,
  previewCSV,
  getSupportedFileTypes,
  getFormatDescription,
  detectFormat,
  FORMAT_INFO,
  type ImportResult,
  type SupportedFormat,
} from "@/lib/import/file-import";
import type { FeatureCollection } from "geojson";

interface FileImporterProps {
  onImport: (name: string, data: FeatureCollection) => void;
  onRasterImport?: (name: string, imageUrl: string, bounds: [[number, number], [number, number]]) => void;
  onClose?: () => void;
  className?: string;
}

const FORMAT_ICONS: Record<string, React.ElementType> = {
  geojson: FileJson,
  kml: Globe,
  kmz: FileArchive,
  shapefile: FileArchive,
  csv: Table,
  dxf: PenTool,
  geotiff: Image,
  gpx: Navigation,
  image: Image,
  unknown: File,
};

export function FileImporter({
  onImport,
  onRasterImport,
  onClose,
  className,
}: FileImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [showFormats, setShowFormats] = useState(false);

  // CSV column mapping state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<{
    columns: string[];
    sampleData: Record<string, unknown>[];
    suggestedLatColumn?: string;
    suggestedLngColumn?: string;
  } | null>(null);
  const [selectedLatColumn, setSelectedLatColumn] = useState<string>("");
  const [selectedLngColumn, setSelectedLngColumn] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback(
    async (file: File, options?: { latColumn?: string; lngColumn?: string }) => {
      setIsLoading(true);
      setLastResult(null);

      const format = detectFormat(file.name);

      // Handle CSV with column mapping
      if (format === "csv" && !options?.latColumn) {
        try {
          const preview = await previewCSV(file);
          setCsvFile(file);
          setCsvPreview(preview);
          setSelectedLatColumn(preview.suggestedLatColumn || "");
          setSelectedLngColumn(preview.suggestedLngColumn || "");
          setIsLoading(false);
          return;
        } catch (err) {
          setLastResult({
            success: false,
            fileName: file.name,
            format: "csv",
            error: err instanceof Error ? err.message : "Failed to preview CSV",
          });
          setIsLoading(false);
          return;
        }
      }

      const result = await importFile(file, options);
      setLastResult(result);
      setIsLoading(false);

      if (result.success) {
        // Handle vector data
        if (result.data) {
          const layerName = file.name.replace(/\.[^.]+$/, "");
          onImport(layerName, result.data);
        }
        // Handle raster data
        else if (result.rasterData && onRasterImport) {
          const layerName = file.name.replace(/\.[^.]+$/, "");
          onRasterImport(layerName, result.rasterData.imageUrl, result.rasterData.bounds);
        }
      }
    },
    [onImport, onRasterImport]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await processFile(files[0]);
      }
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processFile]
  );

  const handleUrlImport = useCallback(async () => {
    if (!urlValue.trim()) return;

    setIsLoading(true);
    setLastResult(null);

    const result = await importFromUrl(urlValue);
    setLastResult(result);
    setIsLoading(false);

    if (result.success && result.data) {
      const urlParts = urlValue.split("/");
      let layerName = urlParts[urlParts.length - 1].split("?")[0];
      layerName = layerName.replace(/\.[^.]+$/, "") || "Imported Layer";
      onImport(layerName, result.data);
      setUrlValue("");
      setShowUrlInput(false);
    }
  }, [urlValue, onImport]);

  const handleCsvColumnSubmit = useCallback(async () => {
    if (!csvFile || !selectedLatColumn || !selectedLngColumn) return;

    await processFile(csvFile, {
      latColumn: selectedLatColumn,
      lngColumn: selectedLngColumn,
    });

    // Clear CSV state
    setCsvFile(null);
    setCsvPreview(null);
    setSelectedLatColumn("");
    setSelectedLngColumn("");
  }, [csvFile, selectedLatColumn, selectedLngColumn, processFile]);

  const cancelCsvMapping = useCallback(() => {
    setCsvFile(null);
    setCsvPreview(null);
    setSelectedLatColumn("");
    setSelectedLngColumn("");
  }, []);

  // Render CSV column mapping UI
  if (csvPreview) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <span className="font-medium">Map CSV Columns</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelCsvMapping}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Select which columns contain latitude and longitude coordinates.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Latitude Column</Label>
            <Select value={selectedLatColumn} onValueChange={setSelectedLatColumn}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {csvPreview.columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Longitude Column</Label>
            <Select value={selectedLngColumn} onValueChange={setSelectedLngColumn}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {csvPreview.columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="text-xs font-medium px-2 py-1.5 bg-muted/50">
            Preview ({csvPreview.sampleData.length} rows)
          </div>
          <div className="overflow-x-auto max-h-32">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr>
                  {csvPreview.columns.slice(0, 5).map((col) => (
                    <th
                      key={col}
                      className={cn(
                        "px-2 py-1 text-left font-medium",
                        col === selectedLatColumn && "bg-blue-500/20",
                        col === selectedLngColumn && "bg-green-500/20"
                      )}
                    >
                      {col}
                    </th>
                  ))}
                  {csvPreview.columns.length > 5 && (
                    <th className="px-2 py-1 text-muted-foreground">
                      +{csvPreview.columns.length - 5} more
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {csvPreview.sampleData.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-t">
                    {csvPreview.columns.slice(0, 5).map((col) => (
                      <td
                        key={col}
                        className={cn(
                          "px-2 py-1 truncate max-w-[100px]",
                          col === selectedLatColumn && "bg-blue-500/10",
                          col === selectedLngColumn && "bg-green-500/10"
                        )}
                      >
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                    {csvPreview.columns.length > 5 && <td className="px-2 py-1">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handleCsvColumnSubmit}
          disabled={!selectedLatColumn || !selectedLngColumn}
        >
          Import CSV
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {onClose && (
        <div className="flex items-center justify-between">
          <span className="font-medium">Import Data</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          isLoading && "pointer-events-none opacity-60"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getSupportedFileTypes()}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-2 text-center">
          {isLoading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : isDragging ? (
            <Upload className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}

          <div>
            <p className="text-sm font-medium">
              {isLoading ? "Processing..." : isDragging ? "Drop file here" : "Drop file or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              GeoJSON, KML, KMZ, Shapefile, CSV, DXF, GeoTIFF, GPX
            </p>
          </div>
        </div>
      </div>

      {/* Import Result Feedback */}
      {lastResult && (
        <div
          className={cn(
            "flex items-start gap-2 p-3 rounded-lg text-sm",
            lastResult.success
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {lastResult.success ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {lastResult.success ? (
              <>
                <p className="font-medium">
                  Imported {lastResult.featureCount ?? 0} features
                </p>
                <p className="text-xs opacity-80 truncate">
                  {lastResult.fileName} • {getFormatDescription(lastResult.format)}
                  {lastResult.extractedImages && lastResult.extractedImages > 0 && (
                    <> • {lastResult.extractedImages} images</>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Import failed</p>
                <p className="text-xs opacity-80">{lastResult.error}</p>
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => setLastResult(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* URL Import */}
      <div className="space-y-2">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowUrlInput(!showUrlInput)}
        >
          <Link2 className="h-4 w-4" />
          <span>Import from URL</span>
          {showUrlInput ? (
            <ChevronUp className="h-3 w-3 ml-auto" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-auto" />
          )}
        </button>

        {showUrlInput && (
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/data.geojson"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
              className="flex-1 h-9 text-sm"
              disabled={isLoading}
            />
            <Button
              size="sm"
              className="h-9"
              onClick={handleUrlImport}
              disabled={isLoading || !urlValue.trim()}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Supported Formats */}
      <div className="space-y-2">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowFormats(!showFormats)}
        >
          <File className="h-4 w-4" />
          <span>Supported formats</span>
          {showFormats ? (
            <ChevronUp className="h-3 w-3 ml-auto" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-auto" />
          )}
        </button>

        {showFormats && (
          <div className="grid grid-cols-2 gap-1.5 p-2 bg-muted/30 rounded-lg">
            {Object.entries(FORMAT_INFO)
              .filter(([key]) => key !== "unknown")
              .map(([key, info]) => {
                const Icon = FORMAT_ICONS[key] || File;
                return (
                  <div key={key} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{info.description}</span>
                    {info.isRaster && (
                      <span className="text-[10px] text-muted-foreground">(raster)</span>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FileImporter;
