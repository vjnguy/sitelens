import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/layers/[id] - Get a specific layer
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the layer (RLS will ensure user has access)
    const { data: layer, error } = await supabase
      .from('layers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !layer) {
      return NextResponse.json({ error: 'Layer not found' }, { status: 404 });
    }

    return NextResponse.json({ layer });
  } catch (error) {
    console.error('[API/layers/id] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/layers/[id] - Update a layer
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, type, source_type, source_config, style, visible, order_index, metadata } = body;

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (source_type !== undefined) updates.source_type = source_type;
    if (source_config !== undefined) updates.source_config = source_config;
    if (style !== undefined) updates.style = style;
    if (visible !== undefined) updates.visible = visible;
    if (order_index !== undefined) updates.order_index = order_index;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update the layer (RLS will ensure user has access)
    const { data: layer, error } = await supabase
      .from('layers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API/layers/id] Error updating layer:', error);
      return NextResponse.json({ error: 'Failed to update layer' }, { status: 500 });
    }

    if (!layer) {
      return NextResponse.json({ error: 'Layer not found' }, { status: 404 });
    }

    return NextResponse.json({ layer });
  } catch (error) {
    console.error('[API/layers/id] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/layers/[id] - Delete a layer
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the layer (RLS will ensure user has access)
    const { error } = await supabase
      .from('layers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[API/layers/id] Error deleting layer:', error);
      return NextResponse.json({ error: 'Failed to delete layer' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/layers/id] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
