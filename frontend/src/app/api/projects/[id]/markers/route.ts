import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/markers - Get all markers for a project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get markers for the project (RLS ensures user has access)
    const { data: markers, error } = await supabase
      .from('project_markers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API/markers] Error fetching markers:', error);
      return NextResponse.json({ error: 'Failed to fetch markers' }, { status: 500 });
    }

    return NextResponse.json({ markers: markers || [] });
  } catch (error) {
    console.error('[API/markers] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/markers - Create a new marker
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify project access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, location, color, icon, attributes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Marker name is required' }, { status: 400 });
    }

    if (!location?.lng || !location?.lat) {
      return NextResponse.json({ error: 'Marker location is required' }, { status: 400 });
    }

    // Create the marker
    const { data: marker, error } = await supabase
      .from('project_markers')
      .insert({
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        location: { lng: location.lng, lat: location.lat },
        color: color || '#3b82f6',
        icon: icon || 'map-pin',
        attributes: attributes || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[API/markers] Error creating marker:', error);
      return NextResponse.json({ error: 'Failed to create marker' }, { status: 500 });
    }

    return NextResponse.json({ marker }, { status: 201 });
  } catch (error) {
    console.error('[API/markers] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
