import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/layers - Get all layers for a project
 * Query params:
 *   - projectId: specific project ID (optional, defaults to default workspace)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const requestedProjectId = searchParams.get('projectId');

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile to find their organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    let projectId = requestedProjectId;

    // If no projectId provided, get or create default project
    if (!projectId) {
      const project = await getOrCreateDefaultProject(supabase, profile.organization_id);
      if (!project) {
        return NextResponse.json({ error: 'Failed to get workspace' }, { status: 500 });
      }
      projectId = project.id;
    } else {
      // Verify user has access to the requested project (RLS will also check)
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Get all layers for the project
    const { data: layers, error: layersError } = await supabase
      .from('layers')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (layersError) {
      console.error('[API/layers] Error fetching layers:', layersError);
      return NextResponse.json({ error: 'Failed to fetch layers' }, { status: 500 });
    }

    return NextResponse.json({
      projectId,
      layers: layers || [],
    });
  } catch (error) {
    console.error('[API/layers] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/layers - Create a new layer
 * Body params:
 *   - projectId: specific project ID (optional, defaults to default workspace)
 *   - name, type, source_type, source_config, style, visible, order_index, metadata
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { projectId: requestedProjectId, name, type, source_type, source_config, style, visible, order_index, metadata } = body;

    let projectId = requestedProjectId;

    // If no projectId provided, get or create default project
    if (!projectId) {
      const project = await getOrCreateDefaultProject(supabase, profile.organization_id);
      if (!project) {
        return NextResponse.json({ error: 'Failed to get workspace' }, { status: 500 });
      }
      projectId = project.id;
    } else {
      // Verify user has access to the requested project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create the layer
    const { data: layer, error: createError } = await supabase
      .from('layers')
      .insert({
        project_id: projectId,
        name,
        type: type || 'vector',
        source_type: source_type || 'geojson',
        source_config: source_config || {},
        style: style || {},
        visible: visible ?? true,
        order_index: order_index ?? 0,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (createError) {
      console.error('[API/layers] Error creating layer:', createError);
      return NextResponse.json({ error: 'Failed to create layer' }, { status: 500 });
    }

    return NextResponse.json({ layer }, { status: 201 });
  } catch (error) {
    console.error('[API/layers] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper function to get or create the default project
 */
async function getOrCreateDefaultProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
) {
  // Check for existing default project
  const { data: existingProject } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('name', 'Default Workspace')
    .single();

  if (existingProject) {
    return existingProject;
  }

  // Create default project
  const { data: newProject, error } = await supabase
    .from('projects')
    .insert({
      organization_id: organizationId,
      name: 'Default Workspace',
      description: 'Your default workspace for map layers and data',
      settings: {
        defaultCenter: [153.0251, -27.4698],
        defaultZoom: 10,
        basemap: 'streets',
      },
    })
    .select()
    .single();

  if (error) {
    console.error('[API/layers] Error creating default project:', error);
    return null;
  }

  return newProject;
}
