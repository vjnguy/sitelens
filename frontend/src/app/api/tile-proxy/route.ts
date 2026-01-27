import { NextRequest, NextResponse } from 'next/server';

/**
 * Tile Proxy for ArcGIS MapServer raster tiles
 *
 * This proxy allows browser requests to ArcGIS MapServer export endpoints
 * that may have CORS restrictions. It fetches tiles server-side and returns them.
 *
 * Usage: /api/tile-proxy?base=<encoded-base-export-url>&bbox=<bbox-values>
 *
 * The 'base' parameter contains everything except the bbox.
 * The 'bbox' parameter is the actual bounding box (provided by Mapbox).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const baseEncoded = searchParams.get('base');
  const bbox = searchParams.get('bbox');

  console.log('[Tile Proxy] Request received, base:', baseEncoded?.substring(0, 50), 'bbox:', bbox);

  if (!baseEncoded) {
    console.error('[Tile Proxy] Missing base parameter');
    return new NextResponse('Base URL parameter required', { status: 400 });
  }

  if (!bbox) {
    console.error('[Tile Proxy] Missing bbox parameter');
    return new NextResponse('Bbox parameter required', { status: 400 });
  }

  // Decode the base URL (it was encoded when constructing the proxy URL)
  const base = decodeURIComponent(baseEncoded);

  // Construct the full URL
  const url = `${base}&bbox=${bbox}`;
  console.log('[Tile Proxy] Fetching URL:', url.substring(0, 100) + '...');

  // Only allow requests to trusted spatial data servers
  const allowedHosts = [
    'spatial-gis.information.qld.gov.au',
    'gisservices.information.qld.gov.au',
    'services2.arcgis.com',
    'services5.arcgis.com',
    'portal.spatial.nsw.gov.au',
    'floodinformation.brisbane.qld.gov.au',
    'tiles.arcgis.com',
  ];

  try {
    const targetUrl = new URL(url);

    if (!allowedHosts.some(host => targetUrl.hostname.includes(host))) {
      console.warn('[Tile Proxy] Host not allowed:', targetUrl.hostname);
      return new NextResponse('Host not allowed', { status: 403 });
    }

    // Fetch the tile from ArcGIS
    const response = await fetch(url, {
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'Siteora-GIS/1.0',
      },
    });

    if (!response.ok) {
      console.error('[Tile Proxy] Upstream error:', response.status, response.statusText);
      return new NextResponse(`Upstream error: ${response.status}`, { status: response.status });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Tile Proxy] Error:', error);
    return new NextResponse('Failed to fetch tile', { status: 500 });
  }
}
