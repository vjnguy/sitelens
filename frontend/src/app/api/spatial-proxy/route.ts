import { NextRequest, NextResponse } from 'next/server';

// Proxy for ArcGIS REST API requests to bypass CORS
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  // Only allow requests to trusted spatial data servers
  const allowedHosts = [
    'spatial-gis.information.qld.gov.au',
    'portal.spatial.nsw.gov.au',
    'opendata.transport.nsw.gov.au',
    'data.gov.au',
  ];

  try {
    const targetUrl = new URL(url);

    if (!allowedHosts.some(host => targetUrl.hostname.includes(host))) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
