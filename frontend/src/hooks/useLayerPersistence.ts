'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Layer, FeatureCollection } from '@/types/gis';

interface DbLayer {
  id: string;
  project_id: string;
  name: string;
  type: string;
  source_type: string;
  source_config: Record<string, unknown>;
  style: Record<string, unknown>;
  visible: boolean;
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface UseLayerPersistenceOptions {
  /** Specific project ID to load layers from (optional, defaults to default workspace) */
  projectId?: string | null;
}

interface UseLayerPersistenceReturn {
  layers: Layer[];
  projectId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  addLayer: (layer: Omit<Layer, 'id' | 'project_id' | 'created_at'>) => Promise<Layer | null>;
  updateLayer: (id: string, updates: Partial<Layer>) => Promise<boolean>;
  deleteLayer: (id: string) => Promise<boolean>;
  toggleVisibility: (id: string) => Promise<boolean>;
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  refreshLayers: () => Promise<void>;
}

/**
 * Hook to manage layer persistence with Supabase
 * @param options.projectId - Optional project ID to load layers from
 */
export function useLayerPersistence(options: UseLayerPersistenceOptions = {}): UseLayerPersistenceReturn {
  const { projectId: requestedProjectId } = options;
  const [layers, setLayers] = useState<Layer[]>([]);
  const [projectId, setProjectId] = useState<string | null>(requestedProjectId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which layers are from the database vs. temporary
  const dbLayerIds = useRef<Set<string>>(new Set());

  /**
   * Convert DB layer to frontend Layer format
   */
  const dbLayerToLayer = useCallback((dbLayer: DbLayer): Layer => {
    return {
      id: dbLayer.id,
      project_id: dbLayer.project_id,
      name: dbLayer.name,
      type: dbLayer.type as Layer['type'],
      source_type: dbLayer.source_type as Layer['source_type'],
      source_config: dbLayer.source_config as Layer['source_config'],
      style: dbLayer.style as Layer['style'],
      visible: dbLayer.visible,
      order_index: dbLayer.order_index,
      created_at: dbLayer.created_at,
      featureCount: (dbLayer.metadata?.featureCount as number) || undefined,
    };
  }, []);

  /**
   * Load layers from the API
   */
  const loadLayers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build URL with optional projectId
      const url = requestedProjectId
        ? `/api/layers?projectId=${requestedProjectId}`
        : '/api/layers';

      const response = await fetch(url);

      if (response.status === 401) {
        // User not authenticated - that's OK, just don't load layers
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load layers');
      }

      const data = await response.json();
      setProjectId(data.projectId);

      const loadedLayers = (data.layers || []).map(dbLayerToLayer);

      // Track which layers are from the database
      dbLayerIds.current = new Set(loadedLayers.map((l: Layer) => l.id));

      setLayers(loadedLayers);
    } catch (err) {
      console.error('[useLayerPersistence] Error loading layers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load layers');
    } finally {
      setIsLoading(false);
    }
  }, [dbLayerToLayer, requestedProjectId]);

  /**
   * Add a new layer and save to database
   */
  const addLayer = useCallback(async (
    layer: Omit<Layer, 'id' | 'project_id' | 'created_at'>
  ): Promise<Layer | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/layers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId || requestedProjectId,
          name: layer.name,
          type: layer.type || 'vector',
          source_type: layer.source_type || 'geojson',
          source_config: layer.source_config || {},
          style: layer.style || {},
          visible: layer.visible ?? true,
          order_index: layer.order_index ?? layers.length,
          metadata: {
            featureCount: layer.featureCount,
          },
        }),
      });

      if (response.status === 401) {
        // User not authenticated - create temporary layer
        const tempLayer: Layer = {
          ...layer,
          id: `temp-${Date.now()}`,
          project_id: 'temp',
          created_at: new Date().toISOString(),
        };
        setLayers(prev => [...prev, tempLayer]);
        return tempLayer;
      }

      if (!response.ok) {
        throw new Error('Failed to save layer');
      }

      const data = await response.json();
      const newLayer = dbLayerToLayer(data.layer);

      dbLayerIds.current.add(newLayer.id);
      setLayers(prev => [...prev, newLayer]);

      return newLayer;
    } catch (err) {
      console.error('[useLayerPersistence] Error adding layer:', err);
      setError(err instanceof Error ? err.message : 'Failed to save layer');

      // Still add locally even if save fails
      const tempLayer: Layer = {
        ...layer,
        id: `temp-${Date.now()}`,
        project_id: 'temp',
        created_at: new Date().toISOString(),
      };
      setLayers(prev => [...prev, tempLayer]);
      return tempLayer;
    } finally {
      setIsSaving(false);
    }
  }, [layers.length, dbLayerToLayer, projectId, requestedProjectId]);

  /**
   * Update an existing layer
   */
  const updateLayer = useCallback(async (
    id: string,
    updates: Partial<Layer>
  ): Promise<boolean> => {
    try {
      setIsSaving(true);

      // Update locally first
      setLayers(prev => prev.map(l =>
        l.id === id ? { ...l, ...updates } : l
      ));

      // Only sync to database if it's a persisted layer
      if (dbLayerIds.current.has(id)) {
        const response = await fetch(`/api/layers/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok && response.status !== 401) {
          console.error('[useLayerPersistence] Failed to sync layer update');
        }
      }

      return true;
    } catch (err) {
      console.error('[useLayerPersistence] Error updating layer:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Delete a layer
   */
  const deleteLayer = useCallback(async (id: string): Promise<boolean> => {
    try {
      setIsSaving(true);

      // Remove locally first
      setLayers(prev => prev.filter(l => l.id !== id));

      // Only sync to database if it's a persisted layer
      if (dbLayerIds.current.has(id)) {
        const response = await fetch(`/api/layers/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok && response.status !== 401) {
          console.error('[useLayerPersistence] Failed to sync layer deletion');
        }

        dbLayerIds.current.delete(id);
      }

      return true;
    } catch (err) {
      console.error('[useLayerPersistence] Error deleting layer:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Toggle layer visibility
   */
  const toggleVisibility = useCallback(async (id: string): Promise<boolean> => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return false;

    return updateLayer(id, { visible: !layer.visible });
  }, [layers, updateLayer]);

  /**
   * Refresh layers from database
   */
  const refreshLayers = useCallback(async () => {
    await loadLayers();
  }, [loadLayers]);

  // Load layers on mount or when project changes
  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  // Reset layers when project changes
  useEffect(() => {
    setLayers([]);
    dbLayerIds.current = new Set();
  }, [requestedProjectId]);

  return {
    layers,
    projectId,
    isLoading,
    isSaving,
    error,
    addLayer,
    updateLayer,
    deleteLayer,
    toggleVisibility,
    setLayers,
    refreshLayers,
  };
}
