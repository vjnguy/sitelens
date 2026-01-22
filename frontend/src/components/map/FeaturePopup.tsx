"use client";

import { X, Copy, ZoomIn, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Feature } from 'geojson';
import { cn } from '@/lib/utils';
import { formatArea, formatLength, formatCoordinates, getCenter } from '@/lib/mapbox/utils';

interface FeaturePopupProps {
  feature: Feature;
  layerName?: string;
  onClose: () => void;
  onZoomTo?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function FeaturePopup({
  feature,
  layerName,
  onClose,
  onZoomTo,
  onDelete,
  className,
}: FeaturePopupProps) {
  const properties = feature.properties || {};
  const geometryType = feature.geometry?.type || 'Unknown';

  // Calculate measurements based on geometry type
  let measurement: string | null = null;
  if (feature.geometry) {
    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      const area = calculateAreaFromFeature(feature);
      measurement = formatArea(area);
    } else if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
      const length = calculateLengthFromFeature(feature);
      measurement = formatLength(length);
    }
  }

  // Get center coordinates
  const center = feature.geometry ? getCenter(feature) : null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={cn('bg-background border rounded-lg shadow-lg w-72 max-h-96 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">
            {properties.name || properties.title || `${geometryType} Feature`}
          </h3>
          {layerName && (
            <p className="text-xs text-muted-foreground truncate">{layerName}</p>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-2" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
        {/* Geometry info */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Geometry</p>
          <p className="text-sm">{geometryType}</p>
          {measurement && (
            <p className="text-sm text-muted-foreground">{measurement}</p>
          )}
          {center && (
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground">
                {formatCoordinates(center)}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                onClick={() => copyToClipboard(formatCoordinates(center))}
                title="Copy coordinates"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Properties */}
        {Object.keys(properties).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Properties</p>
            <div className="space-y-1">
              {Object.entries(properties)
                .filter(([key]) => !key.startsWith('_'))
                .slice(0, 10)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{key}</span>
                    <span className="font-medium truncate max-w-[150px]" title={String(value)}>
                      {formatValue(value)}
                    </span>
                  </div>
                ))}
              {Object.keys(properties).filter(k => !k.startsWith('_')).length > 10 && (
                <p className="text-xs text-muted-foreground">
                  +{Object.keys(properties).filter(k => !k.startsWith('_')).length - 10} more properties
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 p-2 border-t bg-muted/30">
        {onZoomTo && (
          <Button size="sm" variant="ghost" className="h-8 flex-1" onClick={onZoomTo}>
            <ZoomIn className="h-4 w-4 mr-1" />
            Zoom to
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper to format property values
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toFixed(2);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Helper to calculate area (simplified - use turf in production)
function calculateAreaFromFeature(feature: Feature): number {
  try {
    const turf = require('@turf/turf');
    return turf.area(feature);
  } catch {
    return 0;
  }
}

// Helper to calculate length (simplified - use turf in production)
function calculateLengthFromFeature(feature: Feature): number {
  try {
    const turf = require('@turf/turf');
    return turf.length(feature, { units: 'meters' });
  } catch {
    return 0;
  }
}
