import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Project limits by tier
const PROJECT_LIMITS: Record<string, number> = {
  free: 3,
  pro: 25,
  enterprise: -1, // unlimited
};

/**
 * GET /api/projects - Get all projects for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile with tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const tier = profile.subscription_tier || 'free';
    const projectLimit = PROJECT_LIMITS[tier] ?? PROJECT_LIMITS.free;

    // Get all projects for the organization
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        bounds,
        settings,
        created_at,
        updated_at
      `)
      .eq('organization_id', profile.organization_id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[API/projects] Error fetching projects:', error);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Get layer counts for each project
    const projectIds = projects?.map(p => p.id) || [];
    const { data: layerCounts } = await supabase
      .from('layers')
      .select('project_id')
      .in('project_id', projectIds);

    const layerCountMap: Record<string, number> = {};
    layerCounts?.forEach(l => {
      layerCountMap[l.project_id] = (layerCountMap[l.project_id] || 0) + 1;
    });

    const projectsWithCounts = projects?.map(p => ({
      ...p,
      layerCount: layerCountMap[p.id] || 0,
    })) || [];

    return NextResponse.json({
      projects: projectsWithCounts,
      tier,
      projectLimit,
      canCreateMore: projectLimit === -1 || projectsWithCounts.length < projectLimit,
    });
  } catch (error) {
    console.error('[API/projects] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile with tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const tier = profile.subscription_tier || 'free';
    const projectLimit = PROJECT_LIMITS[tier] ?? PROJECT_LIMITS.free;

    // Check project count if not unlimited
    if (projectLimit !== -1) {
      const { count } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', profile.organization_id);

      if (count !== null && count >= projectLimit) {
        return NextResponse.json({
          error: 'Project limit reached',
          message: `Your ${tier} plan allows ${projectLimit} projects. Upgrade to create more.`,
          tier,
          limit: projectLimit,
        }, { status: 403 });
      }
    }

    // Parse request body
    const body = await request.json();
    const { name, description, settings } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Create the project
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        organization_id: profile.organization_id,
        name: name.trim(),
        description: description?.trim() || null,
        settings: settings || {
          defaultCenter: [153.0251, -27.4698], // Brisbane default
          defaultZoom: 10,
          basemap: 'streets',
        },
      })
      .select()
      .single();

    if (error) {
      console.error('[API/projects] Error creating project:', error);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[API/projects] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
