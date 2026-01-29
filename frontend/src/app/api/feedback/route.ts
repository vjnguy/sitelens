import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/feedback - Submit feedback or bug report
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Try to get authenticated user (optional)
    const { data: { user } } = await supabase.auth.getUser();

    // Parse request body
    const body = await request.json();
    const { type, title, description, email, pageUrl } = body;

    // Validate required fields
    if (!type || !['bug', 'feature_request', 'general'].includes(type)) {
      return NextResponse.json({ error: 'Valid feedback type is required' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user?.id || null,
        email: email.trim(),
        type,
        title: title.trim(),
        description: description.trim(),
        page_url: pageUrl || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API/feedback] Error creating feedback:', error);
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (error) {
    console.error('[API/feedback] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
