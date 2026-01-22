"use client";

import { useState } from 'react';
import {
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  Settings,
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Layer } from '@/types/gis';
import { cn } from '@/lib/utils';

interface LayerPanelProps {
  layers: Layer[];
  onToggleVisibility: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onReorderLayers: (layerIds: string[]) => void;
  onEditStyle: (layerId: string) => void;
  onAddLayer: () => void;
  className?: string;
}

export function LayerPanel({
  layers,
  onToggleVisibility,
  onRemoveLayer,
  onReorderLayers,
  onEditStyle,
  onAddLayer,
  className,
}: LayerPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentIds = layers.map((l) => l.id);
    const draggedIndex = currentIds.indexOf(draggedId);
    const targetIndex = currentIds.indexOf(targetId);

    const newIds = [...currentIds];
    newIds.splice(draggedIndex, 1);
    newIds.splice(targetIndex, 0, draggedId);

    onReorderLayers(newIds);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const getLayerIcon = (layer: Layer) => {
    const type = layer.style.type || 'circle';
    switch (type) {
      case 'fill':
        return (
          <div
            className="w-4 h-4 rounded-sm border"
            style={{
              backgroundColor: String(layer.style.paint?.['fill-color'] || '#088'),
              opacity: Number(layer.style.paint?.['fill-opacity'] ?? 0.4),
            }}
          />
        );
      case 'line':
        return (
          <div
            className="w-4 h-0.5"
            style={{
              backgroundColor: String(layer.style.paint?.['line-color'] || '#088'),
            }}
          />
        );
      case 'circle':
        return (
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: String(layer.style.paint?.['circle-color'] || '#088'),
            }}
          />
        );
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('bg-background border rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Layers className="h-4 w-4" />
          <span className="font-medium">Layers</span>
          <span className="text-xs text-muted-foreground">({layers.length})</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            onAddLayer();
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Layer list */}
      {expanded && (
        <div className="max-h-[400px] overflow-y-auto">
          {layers.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No layers yet</p>
              <Button
                variant="link"
                size="sm"
                onClick={onAddLayer}
                className="mt-1"
              >
                Add your first layer
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {layers.map((layer) => (
                <li
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, layer.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, layer.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors',
                    draggedId === layer.id && 'opacity-50'
                  )}
                >
                  {/* Drag handle */}
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                  {/* Layer icon */}
                  {getLayerIcon(layer)}

                  {/* Layer name */}
                  <span className="flex-1 text-sm truncate" title={layer.name}>
                    {layer.name}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onToggleVisibility(layer.id)}
                      title={layer.visible ? 'Hide layer' : 'Show layer'}
                    >
                      {layer.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onEditStyle(layer.id)}
                      title="Edit style"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => onRemoveLayer(layer.id)}
                      title="Remove layer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
