import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/markers/export - Export markers as CSV
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

    // Get project name for filename
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    // Get all markers for the project (RLS ensures user has access)
    const { data: markers, error } = await supabase
      .from('project_markers')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[API/markers/export] Error fetching markers:', error);
      return NextResponse.json({ error: 'Failed to fetch markers' }, { status: 500 });
    }

    if (!markers || markers.length === 0) {
      return NextResponse.json({ error: 'No markers to export' }, { status: 404 });
    }

    // Collect all unique attribute keys across all markers
    const attributeKeys = new Set<string>();
    markers.forEach(marker => {
      if (marker.attributes && typeof marker.attributes === 'object') {
        Object.keys(marker.attributes).forEach(key => attributeKeys.add(key));
      }
    });

    // Build CSV header
    const baseHeaders = ['Name', 'Description', 'Longitude', 'Latitude', 'Color', 'Created'];
    const attributeHeaders = Array.from(attributeKeys).sort();
    const allHeaders = [...baseHeaders, ...attributeHeaders];

    // Build CSV rows
    const rows = markers.map(marker => {
      const location = marker.location as { lng: number; lat: number } | null;
      const attributes = marker.attributes as Record<string, unknown> | null;

      const baseValues = [
        escapeCSV(marker.name || ''),
        escapeCSV(marker.description || ''),
        location?.lng?.toString() || '',
        location?.lat?.toString() || '',
        marker.color || '',
        marker.created_at ? new Date(marker.created_at).toISOString().split('T')[0] : '',
      ];

      const attributeValues = attributeHeaders.map(key => {
        const value = attributes?.[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return escapeCSV(JSON.stringify(value));
        return escapeCSV(String(value));
      });

      return [...baseValues, ...attributeValues];
    });

    // Combine header and rows
    const csvContent = [
      allHeaders.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Generate filename
    const projectName = project?.name?.replace(/[^a-z0-9]/gi, '_') || 'project';
    const date = new Date().toISOString().split('T')[0];
    const filename = `${projectName}_markers_${date}.csv`;

    // Return CSV response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[API/markers/export] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (!value) return '';

  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
