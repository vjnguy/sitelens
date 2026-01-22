"use client";

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Feature } from 'geojson';
import type { Layer, MapState, BoundingBox } from '@/types/gis';
import { MAPBOX_STYLES, DEFAULT_CENTER, DEFAULT_ZOOM, DEFAULT_STYLE, MapStyle, STYLE_INFO } from '@/lib/mapbox/styles';
import { cn } from '@/lib/utils';

// Set Mapbox access token from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapViewerProps {
  className?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  initialStyle?: MapStyle;
  layers?: Layer[];
  onMapLoad?: (map: mapboxgl.Map) => void;
  onMapMove?: (state: MapState) => void;
  onFeatureClick?: (feature: Feature, layerId: string) => void;
  onFeatureHover?: (feature: Feature | null, layerId: string) => void;
  onStyleChange?: (style: MapStyle) => void;
  interactive?: boolean;
  showControls?: boolean;
}

export interface MapViewerRef {
  getMap: () => mapboxgl.Map | null;
  flyTo: (center: [number, number], zoom?: number) => void;
  fitBounds: (bounds: BoundingBox, padding?: number) => void;
  changeStyle: (style: MapStyle) => void;
  getCurrentStyle: () => MapStyle;
}

export const MapViewer = forwardRef<MapViewerRef, MapViewerProps>(({
  className,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  initialStyle = DEFAULT_STYLE,
  layers = [],
  onMapLoad,
  onMapMove,
  onFeatureClick,
  onFeatureHover,
  onStyleChange,
  interactive = true,
  showControls = true,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStyle, setCurrentStyle] = useState<MapStyle>(initialStyle);
  const layersAddedRef = useRef<Set<string>>(new Set());

  // Change style
  const changeStyle = useCallback((style: MapStyle) => {
    if (mapRef.current && MAPBOX_STYLES[style]) {
      setCurrentStyle(style);
      mapRef.current.setStyle(MAPBOX_STYLES[style]);
      onStyleChange?.(style);
      // Clear layers added ref since style change removes all layers
      layersAddedRef.current.clear();
    }
  }, [onStyleChange]);

  // Fly to location
  const flyTo = useCallback((center: [number, number], zoom?: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center,
        zoom: zoom ?? mapRef.current.getZoom(),
        duration: 1500,
      });
    }
  }, []);

  // Fit to bounds
  const fitBounds = useCallback((bounds: BoundingBox, padding: number = 50) => {
    if (mapRef.current) {
      mapRef.current.fitBounds(
        [[bounds.west, bounds.south], [bounds.east, bounds.north]],
        { padding, duration: 1000 }
      );
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
    flyTo,
    fitBounds,
    changeStyle,
    getCurrentStyle: () => currentStyle,
  }), [flyTo, fitBounds, changeStyle, currentStyle]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    if (!MAPBOX_TOKEN) {
      setError('Mapbox token not found. Set NEXT_PUBLIC_MAPBOX_TOKEN environment variable.');
      return;
    }

    try {
      console.log('[MapViewer] Initializing with token:', MAPBOX_TOKEN?.substring(0, 20) + '...');
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAPBOX_STYLES[initialStyle],
        center: initialCenter,
        zoom: initialZoom,
        interactive,
      });

      if (showControls) {
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');
      }

      let mapLoaded = false;

      map.on('load', () => {
        console.log('[MapViewer] Map loaded successfully');
        mapLoaded = true;
        setIsLoaded(true);
        onMapLoad?.(map);
      });

      // Timeout fallback - if map doesn't load in 20 seconds, show error
      const loadTimeout = setTimeout(() => {
        if (!mapLoaded) {
          console.error('[MapViewer] Map load timeout');
          setError('Map failed to load. Check your network connection and Mapbox token.');
        }
      }, 20000);

      map.on('style.load', () => {
        console.log('[MapViewer] Style loaded');
        // Re-add layers after style change
        layersAddedRef.current.clear();
      });

      map.on('error', (e) => {
        console.error('[MapViewer] Map error:', e);
        if (e.error?.message) {
          setError(`Map error: ${e.error.message}`);
        }
      });

      map.on('moveend', () => {
        const center = map.getCenter();
        onMapMove?.({
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      });

      mapRef.current = map;

      return () => {
        clearTimeout(loadTimeout);
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to initialize map.');
    }
  }, []);

  // Add/update layers
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    const map = mapRef.current;

    layers.forEach((layer) => {
      try {
        const existingSource = map.getSource(layer.id) as mapboxgl.GeoJSONSource | undefined;

        if (layer.source_type === 'geojson' && layer.source_config.data) {
          if (!existingSource) {
            // Add new source
            map.addSource(layer.id, {
              type: 'geojson',
              data: layer.source_config.data,
            });
          } else {
            // Update existing source with new data
            existingSource.setData(layer.source_config.data);
          }
        }

        if (!map.getLayer(layer.id) && map.getSource(layer.id)) {
          map.addLayer({
            id: layer.id,
            source: layer.id,
            type: (layer.style.type || 'circle') as any,
            paint: layer.style.paint || {},
            layout: { visibility: layer.visible ? 'visible' : 'none' },
          });

          if (onFeatureClick) {
            map.on('click', layer.id, (e) => {
              if (e.features?.[0]) {
                onFeatureClick(e.features[0] as unknown as Feature, layer.id);
              }
            });
          }

          map.on('mouseenter', layer.id, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layer.id, () => {
            map.getCanvas().style.cursor = '';
          });

          layersAddedRef.current.add(layer.id);
        } else if (map.getLayer(layer.id)) {
          // Update visibility
          map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none');

          // Update paint properties if they changed
          if (layer.style.paint) {
            Object.entries(layer.style.paint).forEach(([prop, value]) => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                map.setPaintProperty(layer.id, prop as any, value);
              } catch {
                // Property might not be valid for this layer type
              }
            });
          }
        }
      } catch (err) {
        console.warn(`Failed to add layer ${layer.id}:`, err);
      }
    });
  }, [layers, isLoaded, onFeatureClick]);

  return (
    <div className={cn('relative', className)} style={{ width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1e293b' }} />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md text-center">
            <p className="text-destructive font-medium mb-2">Map Error</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-white text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
});

MapViewer.displayName = 'MapViewer';
