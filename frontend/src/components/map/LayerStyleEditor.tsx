"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import type { Layer, LayerStyle } from "@/types/gis";

interface LayerStyleEditorProps {
  layer: Layer;
  onStyleChange: (layerId: string, style: LayerStyle) => void;
  onClose: () => void;
}

// Preset color palettes
const COLOR_PRESETS = [
  { name: "Orange", fill: "#ff6600", outline: "#cc3300" },
  { name: "Blue", fill: "#3b82f6", outline: "#1d4ed8" },
  { name: "Green", fill: "#22c55e", outline: "#15803d" },
  { name: "Purple", fill: "#a855f7", outline: "#7c3aed" },
  { name: "Red", fill: "#ef4444", outline: "#b91c1c" },
  { name: "Teal", fill: "#14b8a6", outline: "#0d9488" },
  { name: "Yellow", fill: "#eab308", outline: "#ca8a04" },
  { name: "Pink", fill: "#ec4899", outline: "#be185d" },
];

export function LayerStyleEditor({ layer, onStyleChange, onClose }: LayerStyleEditorProps) {
  const [fillColor, setFillColor] = useState(
    (layer.style.paint?.["fill-color"] as string) || "#ff6600"
  );
  const [fillOpacity, setFillOpacity] = useState(
    ((layer.style.paint?.["fill-opacity"] as number) || 0.4) * 100
  );
  const [outlineColor, setOutlineColor] = useState(
    (layer.style.paint?.["fill-outline-color"] as string) || "#cc3300"
  );
  const [lineWidth, setLineWidth] = useState(
    (layer.style.paint?.["line-width"] as number) || 2
  );

  // For circle/point layers
  const [circleRadius, setCircleRadius] = useState(
    (layer.style.paint?.["circle-radius"] as number) || 6
  );
  const [circleColor, setCircleColor] = useState(
    (layer.style.paint?.["circle-color"] as string) || "#3b82f6"
  );

  const layerType = layer.style.type || "fill";

  const applyStyle = () => {
    let newPaint: Record<string, unknown> = {};

    if (layerType === "fill") {
      newPaint = {
        "fill-color": fillColor,
        "fill-opacity": fillOpacity / 100,
        "fill-outline-color": outlineColor,
      };
    } else if (layerType === "line") {
      newPaint = {
        "line-color": fillColor,
        "line-width": lineWidth,
        "line-opacity": fillOpacity / 100,
      };
    } else if (layerType === "circle") {
      newPaint = {
        "circle-color": circleColor,
        "circle-radius": circleRadius,
        "circle-opacity": fillOpacity / 100,
        "circle-stroke-color": outlineColor,
        "circle-stroke-width": 1,
      };
    }

    onStyleChange(layer.id, {
      ...layer.style,
      paint: newPaint,
    });
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setFillColor(preset.fill);
    setOutlineColor(preset.outline);
    setCircleColor(preset.fill);
  };

  // Auto-apply on changes
  useEffect(() => {
    applyStyle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillColor, fillOpacity, outlineColor, lineWidth, circleRadius, circleColor]);

  return (
    <div className="absolute top-0 right-0 w-72 bg-background border-l shadow-lg h-full z-30 flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Style Editor</h3>
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{layer.name}</p>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Color Presets */}
        <div className="space-y-2">
          <Label className="text-xs">Color Presets</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className="h-8 rounded border-2 border-transparent hover:border-primary transition-colors"
                style={{ backgroundColor: preset.fill }}
                onClick={() => applyPreset(preset)}
                title={preset.name}
              />
            ))}
          </div>
        </div>

        {/* Fill/Line Color */}
        {(layerType === "fill" || layerType === "line") && (
          <div className="space-y-2">
            <Label className="text-xs">{layerType === "fill" ? "Fill Color" : "Line Color"}</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="flex-1 h-9 font-mono text-xs"
                placeholder="#ff6600"
              />
            </div>
          </div>
        )}

        {/* Circle Color */}
        {layerType === "circle" && (
          <div className="space-y-2">
            <Label className="text-xs">Point Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={circleColor}
                onChange={(e) => setCircleColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={circleColor}
                onChange={(e) => setCircleColor(e.target.value)}
                className="flex-1 h-9 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Outline Color */}
        {(layerType === "fill" || layerType === "circle") && (
          <div className="space-y-2">
            <Label className="text-xs">Outline Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={outlineColor}
                onChange={(e) => setOutlineColor(e.target.value)}
                className="w-12 h-9 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={outlineColor}
                onChange={(e) => setOutlineColor(e.target.value)}
                className="flex-1 h-9 font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs">Opacity</Label>
            <span className="text-xs text-muted-foreground">{Math.round(fillOpacity)}%</span>
          </div>
          <Slider
            value={[fillOpacity]}
            onValueChange={([v]) => setFillOpacity(v)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Line Width */}
        {layerType === "line" && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Line Width</Label>
              <span className="text-xs text-muted-foreground">{lineWidth}px</span>
            </div>
            <Slider
              value={[lineWidth]}
              onValueChange={([v]) => setLineWidth(v)}
              min={1}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>
        )}

        {/* Circle Radius */}
        {layerType === "circle" && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs">Point Size</Label>
              <span className="text-xs text-muted-foreground">{circleRadius}px</span>
            </div>
            <Slider
              value={[circleRadius]}
              onValueChange={([v]) => setCircleRadius(v)}
              min={2}
              max={20}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Preview */}
        <div className="space-y-2">
          <Label className="text-xs">Preview</Label>
          <div className="h-16 rounded border bg-slate-800 flex items-center justify-center">
            {layerType === "fill" && (
              <div
                className="w-20 h-10 rounded"
                style={{
                  backgroundColor: fillColor,
                  opacity: fillOpacity / 100,
                  border: `2px solid ${outlineColor}`,
                }}
              />
            )}
            {layerType === "line" && (
              <div
                className="w-20 h-0"
                style={{
                  borderTop: `${lineWidth}px solid ${fillColor}`,
                  opacity: fillOpacity / 100,
                }}
              />
            )}
            {layerType === "circle" && (
              <div
                className="rounded-full"
                style={{
                  width: circleRadius * 2,
                  height: circleRadius * 2,
                  backgroundColor: circleColor,
                  opacity: fillOpacity / 100,
                  border: `1px solid ${outlineColor}`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
