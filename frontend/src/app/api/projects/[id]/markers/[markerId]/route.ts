import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string; markerId: string }>;
}

/**
 * PATCH /api/projects/[id]/markers/[markerId] - Update a marker
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, markerId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, location, color, icon, attributes } = body;

    // Build update object
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (location !== undefined) updates.location = { lng: location.lng, lat: location.lat };
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;
    if (attributes !== undefined) updates.attributes = attributes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update the marker (RLS ensures user has access)
    const { data: marker, error } = await supabase
      .from('project_markers')
      .update(updates)
      .eq('id', markerId)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      console.error('[API/markers] Error updating marker:', error);
      return NextResponse.json({ error: 'Failed to update marker' }, { status: 500 });
    }

    if (!marker) {
      return NextResponse.json({ error: 'Marker not found' }, { status: 404 });
    }

    return NextResponse.json({ marker });
  } catch (error) {
    console.error('[API/markers] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/markers/[markerId] - Delete a marker
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: projectId, markerId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the marker (RLS ensures user has access)
    const { error } = await supabase
      .from('project_markers')
      .delete()
      .eq('id', markerId)
      .eq('project_id', projectId);

    if (error) {
      console.error('[API/markers] Error deleting marker:', error);
      return NextResponse.json({ error: 'Failed to delete marker' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/markers] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
