import { createClient } from '@/lib/supabase/client';
import type { Layer, FeatureCollection, LayerType, SourceType } from '@/types/gis';

export interface DbLayer {
  id: string;
  project_id: string;
  name: string;
  type: LayerType;
  source_type: SourceType;
  source_config: {
    data?: FeatureCollection;
    url?: string;
    [key: string]: unknown;
  };
  style: {
    type?: string;
    paint?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    filter?: unknown[];
  };
  visible: boolean;
  order_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbProject {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  bounds?: { west: number; south: number; east: number; north: number };
  settings: {
    defaultCenter?: [number, number];
    defaultZoom?: number;
    basemap?: string;
  };
  created_at: string;
  updated_at: string;
}

/**
 * Get or create a default project/workspace for the user
 */
export async function getOrCreateDefaultProject(): Promise<DbProject | null> {
  const supabase = createClient();

  // Get user's profile to find their organization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) {
    console.error('[Layers] User has no organization');
    return null;
  }

  // Check for existing default project
  const { data: existingProject } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .eq('name', 'Default Workspace')
    .single();

  if (existingProject) {
    return existingProject as DbProject;
  }

  // Create default project
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      organization_id: profile.organization_id,
      name: 'Default Workspace',
      description: 'Your default workspace for map layers and data',
      settings: {
        defaultCenter: [153.0251, -27.4698], // Brisbane
        defaultZoom: 10,
        basemap: 'streets',
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[Layers] Error creating default project:', error);
    return null;
  }

  return newProject as DbProject;
}

/**
 * Get all layers for a project
 */
export async function getProjectLayers(projectId: string): Promise<DbLayer[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('layers')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });

  if (error) {
    console.error('[Layers] Error fetching layers:', error);
    return [];
  }

  return data as DbLayer[];
}

/**
 * Save a new layer to the database
 */
export async function saveLayer(
  projectId: string,
  layer: Omit<Layer, 'id' | 'project_id' | 'created_at'>
): Promise<DbLayer | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('layers')
    .insert({
      project_id: projectId,
      name: layer.name,
      type: layer.type || 'vector',
      source_type: layer.source_type || 'geojson',
      source_config: layer.source_config || {},
      style: layer.style || {},
      visible: layer.visible ?? true,
      order_index: layer.order_index ?? 0,
      metadata: {
        featureCount: layer.featureCount,
        ...((layer as unknown as Record<string, unknown>).metadata || {}),
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[Layers] Error saving layer:', error);
    return null;
  }

  return data as DbLayer;
}

/**
 * Update an existing layer
 */
export async function updateLayer(
  layerId: string,
  updates: Partial<DbLayer>
): Promise<DbLayer | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('layers')
    .update({
      ...updates,
      // Don't allow updating certain fields
      id: undefined,
      project_id: undefined,
      created_at: undefined,
    })
    .eq('id', layerId)
    .select()
    .single();

  if (error) {
    console.error('[Layers] Error updating layer:', error);
    return null;
  }

  return data as DbLayer;
}

/**
 * Delete a layer
 */
export async function deleteLayer(layerId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('layers')
    .delete()
    .eq('id', layerId);

  if (error) {
    console.error('[Layers] Error deleting layer:', error);
    return false;
  }

  return true;
}

/**
 * Update layer visibility
 */
export async function updateLayerVisibility(
  layerId: string,
  visible: boolean
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('layers')
    .update({ visible })
    .eq('id', layerId);

  if (error) {
    console.error('[Layers] Error updating visibility:', error);
    return false;
  }

  return true;
}

/**
 * Update layer order
 */
export async function updateLayerOrder(
  layerIds: string[]
): Promise<boolean> {
  const supabase = createClient();

  // Update each layer's order_index
  const updates = layerIds.map((id, index) =>
    supabase
      .from('layers')
      .update({ order_index: index })
      .eq('id', id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some((r) => r.error);

  if (hasError) {
    console.error('[Layers] Error updating layer order');
    return false;
  }

  return true;
}

/**
 * Convert DB layer to frontend Layer type
 */
export function dbLayerToLayer(dbLayer: DbLayer): Layer {
  return {
    id: dbLayer.id,
    project_id: dbLayer.project_id,
    name: dbLayer.name,
    type: dbLayer.type,
    source_type: dbLayer.source_type,
    source_config: dbLayer.source_config,
    style: dbLayer.style as Layer['style'],
    visible: dbLayer.visible,
    order_index: dbLayer.order_index,
    created_at: dbLayer.created_at,
    featureCount: (dbLayer.metadata?.featureCount as number) || undefined,
  };
}

/**
 * Convert frontend Layer to DB layer format
 */
export function layerToDbLayer(layer: Layer, projectId: string): Partial<DbLayer> {
  return {
    project_id: projectId,
    name: layer.name,
    type: layer.type || 'vector',
    source_type: layer.source_type || 'geojson',
    source_config: (layer.source_config || {}) as DbLayer['source_config'],
    style: (layer.style || {}) as DbLayer['style'],
    visible: layer.visible ?? true,
    order_index: layer.order_index ?? 0,
    metadata: {
      featureCount: layer.featureCount,
    },
  };
}
