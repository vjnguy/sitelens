"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { Feature, FeatureCollection } from 'geojson';
import type { MapState, Layer, BoundingBox, DrawMode } from '@/types/gis';
import { DEFAULT_CENTER, DEFAULT_ZOOM, DEFAULT_STYLE, MAPBOX_STYLES, MapStyle } from '@/lib/mapbox/styles';
import { boundsToMapbox, calculateBounds } from '@/lib/mapbox/utils';

interface UseMapboxOptions {
  initialCenter?: [number, number];
  initialZoom?: number;
  initialStyle?: MapStyle;
}

interface UseMapboxReturn {
  mapRef: React.MutableRefObject<MapboxMap | null>;
  mapState: MapState;
  currentStyle: MapStyle;
  layers: Layer[];
  selectedFeatures: Feature[];
  isLoaded: boolean;
  setMapRef: (map: MapboxMap | null) => void;
  setMapState: (state: Partial<MapState>) => void;
  setStyle: (style: MapStyle) => void;
  addLayer: (layer: Layer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  reorderLayers: (layerIds: string[]) => void;
  fitBounds: (bounds: BoundingBox, padding?: number) => void;
  fitToFeatures: (features: FeatureCollection) => void;
  selectFeatures: (features: Feature[]) => void;
  clearSelection: () => void;
  flyTo: (center: [number, number], zoom?: number) => void;
}

export function useMapbox(options: UseMapboxOptions = {}): UseMapboxReturn {
  const {
    initialCenter = DEFAULT_CENTER,
    initialZoom = DEFAULT_ZOOM,
    initialStyle = DEFAULT_STYLE,
  } = options;

  const mapRef = useRef<MapboxMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapStyle>(initialStyle);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [mapState, setMapStateInternal] = useState<MapState>({
    center: initialCenter,
    zoom: initialZoom,
    bearing: 0,
    pitch: 0,
  });

  const setMapRef = useCallback((map: MapboxMap | null) => {
    mapRef.current = map;
    if (map) {
      map.on('load', () => setIsLoaded(true));
      map.on('moveend', () => {
        const center = map.getCenter();
        setMapStateInternal((prev) => ({
          ...prev,
          center: [center.lng, center.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        }));
      });
    }
  }, []);

  const setMapState = useCallback((state: Partial<MapState>) => {
    setMapStateInternal((prev) => ({ ...prev, ...state }));

    if (mapRef.current && state.center) {
      mapRef.current.setCenter(state.center);
    }
    if (mapRef.current && state.zoom !== undefined) {
      mapRef.current.setZoom(state.zoom);
    }
    if (mapRef.current && state.bearing !== undefined) {
      mapRef.current.setBearing(state.bearing);
    }
    if (mapRef.current && state.pitch !== undefined) {
      mapRef.current.setPitch(state.pitch);
    }
  }, []);

  const setStyle = useCallback((style: MapStyle) => {
    setCurrentStyle(style);
    if (mapRef.current) {
      mapRef.current.setStyle(MAPBOX_STYLES[style]);
    }
  }, []);

  const addLayer = useCallback((layer: Layer) => {
    setLayers((prev) => [...prev, layer]);
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== layerId));

    // Remove from Mapbox map
    if (mapRef.current) {
      if (mapRef.current.getLayer(layerId)) {
        mapRef.current.removeLayer(layerId);
      }
      if (mapRef.current.getSource(layerId)) {
        mapRef.current.removeSource(layerId);
      }
    }
  }, []);

  const updateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, ...updates } : l))
    );

    // Update Mapbox layer if style changed
    if (mapRef.current && updates.style) {
      const layer = mapRef.current.getLayer(layerId);
      if (layer && updates.style.paint) {
        Object.entries(updates.style.paint).forEach(([prop, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mapRef.current?.setPaintProperty(layerId, prop as any, value);
        });
      }
    }
  }, []);

  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, visible: !l.visible } : l
      )
    );

    if (mapRef.current) {
      const layer = mapRef.current.getLayer(layerId);
      if (layer) {
        const visibility = mapRef.current.getLayoutProperty(layerId, 'visibility');
        mapRef.current.setLayoutProperty(
          layerId,
          'visibility',
          visibility === 'visible' ? 'none' : 'visible'
        );
      }
    }
  }, []);

  const reorderLayers = useCallback((layerIds: string[]) => {
    setLayers((prev) => {
      const layerMap = new Map(prev.map((l) => [l.id, l]));
      return layerIds
        .map((id, index) => {
          const layer = layerMap.get(id);
          return layer ? { ...layer, order_index: index } : null;
        })
        .filter((l): l is Layer => l !== null);
    });

    // Reorder on Mapbox map
    if (mapRef.current) {
      layerIds.forEach((id, index) => {
        if (index > 0 && mapRef.current?.getLayer(id)) {
          mapRef.current.moveLayer(id, layerIds[index - 1]);
        }
      });
    }
  }, []);

  const fitBounds = useCallback((bounds: BoundingBox, padding: number = 50) => {
    if (mapRef.current) {
      mapRef.current.fitBounds(boundsToMapbox(bounds), {
        padding,
        duration: 1000,
      });
    }
  }, []);

  const fitToFeatures = useCallback((features: FeatureCollection) => {
    const bounds = calculateBounds(features);
    if (bounds) {
      fitBounds(bounds);
    }
  }, [fitBounds]);

  const selectFeatures = useCallback((features: Feature[]) => {
    setSelectedFeatures(features);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  const flyTo = useCallback((center: [number, number], zoom?: number) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center,
        zoom: zoom ?? mapRef.current.getZoom(),
        duration: 1500,
      });
    }
  }, []);

  return {
    mapRef,
    mapState,
    currentStyle,
    layers,
    selectedFeatures,
    isLoaded,
    setMapRef,
    setMapState,
    setStyle,
    addLayer,
    removeLayer,
    updateLayer,
    toggleLayerVisibility,
    reorderLayers,
    fitBounds,
    fitToFeatures,
    selectFeatures,
    clearSelection,
    flyTo,
  };
}

// Hook for managing draw mode
export function useMapDraw() {
  const [drawMode, setDrawMode] = useState<DrawMode>('simple_select');
  const [drawnFeatures, setDrawnFeatures] = useState<Feature[]>([]);

  const startDrawing = useCallback((mode: DrawMode) => {
    setDrawMode(mode);
  }, []);

  const stopDrawing = useCallback(() => {
    setDrawMode('simple_select');
  }, []);

  const addDrawnFeature = useCallback((feature: Feature) => {
    setDrawnFeatures((prev) => [...prev, feature]);
  }, []);

  const removeDrawnFeature = useCallback((featureId: string) => {
    setDrawnFeatures((prev) =>
      prev.filter((f) => f.id !== featureId)
    );
  }, []);

  const clearDrawnFeatures = useCallback(() => {
    setDrawnFeatures([]);
  }, []);

  const updateDrawnFeature = useCallback((featureId: string, updates: Partial<Feature>) => {
    setDrawnFeatures((prev) =>
      prev.map((f) => (f.id === featureId ? { ...f, ...updates } : f))
    );
  }, []);

  return {
    drawMode,
    drawnFeatures,
    startDrawing,
    stopDrawing,
    addDrawnFeature,
    removeDrawnFeature,
    clearDrawnFeatures,
    updateDrawnFeature,
  };
}
