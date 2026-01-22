"use client";

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Layer, LayerStyle } from '@/types/gis';
import { cn } from '@/lib/utils';
import { COLOR_PALETTES } from '@/lib/mapbox/styles';

interface StyleEditorProps {
  layer: Layer;
  onStyleChange: (layerId: string, style: LayerStyle) => void;
  onClose: () => void;
  className?: string;
}

export function StyleEditor({
  layer,
  onStyleChange,
  onClose,
  className,
}: StyleEditorProps) {
  const [style, setStyle] = useState<LayerStyle>(layer.style);

  useEffect(() => {
    setStyle(layer.style);
  }, [layer.style]);

  const handleColorChange = (property: string, value: string) => {
    const newStyle = {
      ...style,
      paint: {
        ...style.paint,
        [property]: value,
      },
    };
    setStyle(newStyle);
    onStyleChange(layer.id, newStyle);
  };

  const handleNumberChange = (property: string, value: number) => {
    const newStyle = {
      ...style,
      paint: {
        ...style.paint,
        [property]: value,
      },
    };
    setStyle(newStyle);
    onStyleChange(layer.id, newStyle);
  };

  const renderFillControls = () => (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Fill Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={String(style.paint?.['fill-color'] || '#088888')}
            onChange={(e) => handleColorChange('fill-color', e.target.value)}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={String(style.paint?.['fill-color'] || '#088888')}
            onChange={(e) => handleColorChange('fill-color', e.target.value)}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Fill Opacity</Label>
        <Input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={Number(style.paint?.['fill-opacity'] ?? 0.4)}
          onChange={(e) => handleNumberChange('fill-opacity', parseFloat(e.target.value))}
          className="h-8"
        />
        <span className="text-xs text-muted-foreground">
          {(Number(style.paint?.['fill-opacity'] ?? 0.4) * 100).toFixed(0)}%
        </span>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Outline Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={String(style.paint?.['fill-outline-color'] || '#088888')}
            onChange={(e) => handleColorChange('fill-outline-color', e.target.value)}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={String(style.paint?.['fill-outline-color'] || '#088888')}
            onChange={(e) => handleColorChange('fill-outline-color', e.target.value)}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>
    </>
  );

  const renderLineControls = () => (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Line Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={String(style.paint?.['line-color'] || '#088888')}
            onChange={(e) => handleColorChange('line-color', e.target.value)}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={String(style.paint?.['line-color'] || '#088888')}
            onChange={(e) => handleColorChange('line-color', e.target.value)}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Line Width</Label>
        <Input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={Number(style.paint?.['line-width'] ?? 2)}
          onChange={(e) => handleNumberChange('line-width', parseFloat(e.target.value))}
          className="h-8"
        />
        <span className="text-xs text-muted-foreground">
          {Number(style.paint?.['line-width'] ?? 2)}px
        </span>
      </div>
    </>
  );

  const renderCircleControls = () => (
    <>
      <div className="space-y-2">
        <Label className="text-xs">Circle Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={String(style.paint?.['circle-color'] || '#088888')}
            onChange={(e) => handleColorChange('circle-color', e.target.value)}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={String(style.paint?.['circle-color'] || '#088888')}
            onChange={(e) => handleColorChange('circle-color', e.target.value)}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Circle Radius</Label>
        <Input
          type="range"
          min="2"
          max="20"
          step="1"
          value={Number(style.paint?.['circle-radius'] ?? 6)}
          onChange={(e) => handleNumberChange('circle-radius', parseFloat(e.target.value))}
          className="h-8"
        />
        <span className="text-xs text-muted-foreground">
          {Number(style.paint?.['circle-radius'] ?? 6)}px
        </span>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Stroke Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={String(style.paint?.['circle-stroke-color'] || '#ffffff')}
            onChange={(e) => handleColorChange('circle-stroke-color', e.target.value)}
            className="w-12 h-8 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={String(style.paint?.['circle-stroke-color'] || '#ffffff')}
            onChange={(e) => handleColorChange('circle-stroke-color', e.target.value)}
            className="flex-1 h-8 text-xs"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Stroke Width</Label>
        <Input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={Number(style.paint?.['circle-stroke-width'] ?? 2)}
          onChange={(e) => handleNumberChange('circle-stroke-width', parseFloat(e.target.value))}
          className="h-8"
        />
        <span className="text-xs text-muted-foreground">
          {Number(style.paint?.['circle-stroke-width'] ?? 2)}px
        </span>
      </div>
    </>
  );

  return (
    <div className={cn('bg-background border rounded-lg shadow-lg w-64', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <h3 className="font-medium text-sm">Style Editor</h3>
          <p className="text-xs text-muted-foreground truncate">{layer.name}</p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Controls */}
      <div className="p-3 space-y-4">
        {style.type === 'fill' && renderFillControls()}
        {style.type === 'line' && renderLineControls()}
        {style.type === 'circle' && renderCircleControls()}
        {!style.type && renderCircleControls()}
      </div>

      {/* Color presets */}
      <div className="p-3 border-t">
        <Label className="text-xs mb-2 block">Color Presets</Label>
        <div className="flex flex-wrap gap-1">
          {COLOR_PALETTES.categorical.default.slice(0, 8).map((color) => (
            <button
              key={color}
              className="w-6 h-6 rounded border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              onClick={() => {
                if (style.type === 'fill') {
                  handleColorChange('fill-color', color);
                  handleColorChange('fill-outline-color', color);
                } else if (style.type === 'line') {
                  handleColorChange('line-color', color);
                } else {
                  handleColorChange('circle-color', color);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
