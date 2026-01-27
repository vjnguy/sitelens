/**
 * Fetch real cadastral and flood data from Brisbane Council ArcGIS services
 * This script queries the actual APIs and outputs coordinates for use in the video
 */

const BCC_ARCGIS = 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services';

// Demo location - Toowong/Milton riverside area with confirmed Brisbane River flood
// Very close to Brisbane River with known flood planning areas
const DEMO_CENTER = { lng: 152.9950, lat: -27.4850 };

interface ArcGISFeature {
  attributes: Record<string, any>;
  geometry: {
    rings?: number[][][];
    paths?: number[][][];
  };
}

interface ArcGISResponse {
  features: ArcGISFeature[];
  error?: { message: string };
}

async function fetchByPoint(
  serviceUrl: string,
  point: { lng: number; lat: number }
): Promise<ArcGISFeature[]> {
  const params = new URLSearchParams({
    f: 'json',
    geometry: `${point.lng},${point.lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
  });

  const url = `${serviceUrl}/query?${params.toString()}`;
  console.log(`Fetching from point: ${serviceUrl.split('/').slice(-2).join('/')}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      }
    });
    const data: ArcGISResponse = await response.json();

    if (data.error) {
      console.error(`  Error: ${data.error.message}`);
      return [];
    }

    console.log(`  Found ${data.features?.length || 0} features`);
    return data.features || [];
  } catch (error) {
    console.error(`  Fetch failed:`, error);
    return [];
  }
}

async function fetchWithBbox(
  serviceUrl: string,
  center: { lng: number; lat: number },
  radius: number
): Promise<ArcGISFeature[]> {
  const bbox = {
    xmin: center.lng - radius,
    ymin: center.lat - radius,
    xmax: center.lng + radius,
    ymax: center.lat + radius,
  };

  const params = new URLSearchParams({
    f: 'json',
    geometry: `${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}`,
    geometryType: 'esriGeometryEnvelope',
    spatialRel: 'esriSpatialRelIntersects',
    inSR: '4326',
    outSR: '4326',
    outFields: '*',
    returnGeometry: 'true',
    resultRecordCount: '5',
  });

  const url = `${serviceUrl}/query?${params.toString()}`;
  console.log(`Fetching bbox: ${serviceUrl.split('/').slice(-2).join('/')}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      }
    });
    const data: ArcGISResponse = await response.json();

    if (data.error) {
      console.error(`  Error: ${data.error.message}`);
      return [];
    }

    console.log(`  Found ${data.features?.length || 0} features`);
    return data.features || [];
  } catch (error) {
    console.error(`  Fetch failed:`, error);
    return [];
  }
}

// Simplify polygon by taking evenly distributed points
function simplifyPolygon(coords: number[][], maxPoints: number): number[][] {
  if (coords.length <= maxPoints) return coords;

  const step = Math.floor(coords.length / (maxPoints - 1));
  const simplified: number[][] = [];

  for (let i = 0; i < coords.length && simplified.length < maxPoints - 1; i += step) {
    simplified.push(coords[i]);
  }

  // Ensure closed polygon
  if (simplified.length > 0 &&
      (simplified[0][0] !== simplified[simplified.length - 1][0] ||
       simplified[0][1] !== simplified[simplified.length - 1][1])) {
    simplified.push([...simplified[0]]);
  }

  return simplified;
}

function formatAsTypeScript(name: string, coords: number[][], comment: string): string {
  const simplified = simplifyPolygon(coords, 8);
  const formatted = simplified.map(([lng, lat]) =>
    `  [${lng.toFixed(6)}, ${lat.toFixed(6)}]`
  ).join(',\n');

  return `// ${comment}\nexport const ${name}: [number, number][] = [\n${formatted},\n];\n`;
}

async function main() {
  console.log('\n=== Fetching Real Brisbane Council Data ===\n');
  console.log(`Demo center: ${DEMO_CENTER.lng}, ${DEMO_CENTER.lat}\n`);

  // 1. Fetch Property Boundaries - use a small bbox
  console.log('\n--- Property Boundaries ---');
  const cadastreFeatures = await fetchWithBbox(
    `${BCC_ARCGIS}/property_boundaries_parcel/FeatureServer/0`,
    DEMO_CENTER,
    0.0005 // Very small area ~50m
  );

  // 2. Fetch Brisbane River Flood Overlay
  console.log('\n--- Brisbane River Flood Overlay ---');
  const riverFloodFeatures = await fetchByPoint(
    `${BCC_ARCGIS}/Flood_overlay_Brisbane_River_flood_planning_area/FeatureServer/0`,
    DEMO_CENTER
  );

  // 3. Fetch Creek/Waterway Flood Overlay - try nearby creek area
  console.log('\n--- Creek/Waterway Flood Overlay ---');
  // Try a point closer to Enoggera Creek
  const creekPoint = { lng: 153.0050, lat: -27.4580 };
  const creekFloodFeatures = await fetchByPoint(
    `${BCC_ARCGIS}/Flood_overlay_Creek_waterway_flood_planning_area/FeatureServer/0`,
    creekPoint
  );

  // 4. Fetch Overland Flow (alternative flood layer)
  console.log('\n--- Overland Flow ---');
  const overlandFeatures = await fetchByPoint(
    `${BCC_ARCGIS}/Flood_overlay_Overland_flow/FeatureServer/0`,
    DEMO_CENTER
  );

  // 5. Fetch Heritage Overlay - try Paddington heritage area
  console.log('\n--- Heritage/Character Overlay ---');
  const heritageFeatures = await fetchByPoint(
    `${BCC_ARCGIS}/Traditional_building_character_overlay/FeatureServer/0`,
    DEMO_CENTER
  );

  // Generate TypeScript output
  console.log('\n\n=== Generated TypeScript Code for AppUI.tsx ===\n');

  // Property boundary
  if (cadastreFeatures.length > 0) {
    const prop = cadastreFeatures[0];
    if (prop.geometry?.rings?.[0]) {
      console.log(formatAsTypeScript(
        'SAMPLE_PROPERTY_BOUNDARY',
        prop.geometry.rings[0],
        `Real cadastral boundary - ${prop.attributes?.LOTPLAN || 'Brisbane property'}`
      ));
    }
  } else {
    console.log('// No cadastral data found - using fallback');
  }

  // Brisbane River Flood
  if (riverFloodFeatures.length > 0) {
    const flood = riverFloodFeatures[0];
    const rings = flood.geometry?.rings;
    if (rings && rings[0]) {
      console.log(formatAsTypeScript(
        'FLOOD_ZONE_POLYGON',
        rings[0],
        `Brisbane River Flood Overlay - Area ${flood.attributes?.FLOOD_AREA || flood.attributes?.FPA || 'Unknown'}`
      ));
    }
  } else {
    console.log('// No Brisbane River flood data at this location');
  }

  // Creek Flood
  if (creekFloodFeatures.length > 0) {
    const creek = creekFloodFeatures[0];
    const rings = creek.geometry?.rings;
    if (rings && rings[0]) {
      console.log(formatAsTypeScript(
        'CREEK_FLOOD_POLYGON',
        rings[0],
        `Creek/Waterway Flood Overlay - ${creek.attributes?.FLOOD_AREA || 'Creek flood zone'}`
      ));
    }
  } else if (overlandFeatures.length > 0) {
    const overland = overlandFeatures[0];
    const rings = overland.geometry?.rings;
    if (rings && rings[0]) {
      console.log(formatAsTypeScript(
        'CREEK_FLOOD_POLYGON',
        rings[0],
        'Overland Flow Flood Overlay'
      ));
    }
  } else {
    console.log('// No creek/overland flood data at this location');
  }

  // Heritage
  if (heritageFeatures.length > 0) {
    const heritage = heritageFeatures[0];
    const rings = heritage.geometry?.rings;
    if (rings && rings[0]) {
      console.log(formatAsTypeScript(
        'HERITAGE_OVERLAY_POLYGON',
        rings[0],
        `Traditional Building Character - ${heritage.attributes?.TBC_CAT || heritage.attributes?.CATEGORY || 'Character area'}`
      ));
    }
  } else {
    console.log('// No heritage data at this location');
  }

  // Also output the map center based on first property
  if (cadastreFeatures.length > 0 && cadastreFeatures[0].geometry?.rings?.[0]) {
    const coords = cadastreFeatures[0].geometry.rings[0];
    const centerLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const centerLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    console.log(`\n// Map center for this property`);
    console.log(`export const DEFAULT_MAP_CENTER: [number, number] = [${centerLng.toFixed(6)}, ${centerLat.toFixed(6)}];`);
  }

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
