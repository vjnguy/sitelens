/**
 * Australian Government Amenities Data Service
 *
 * Fetches nearby points of interest from official government data sources:
 * - Schools: QLD Spatial Services (ArcGIS)
 * - Transport: TransLink GTFS data
 * - Healthcare: QLD Health + Geocoding
 * - Parks: QLD Spatial Services (ArcGIS)
 * - Shopping/Dining: OpenStreetMap (no government source)
 */

import type { NearbyPlace, AmenityCategory } from './nearby-amenities';

const QLD_SPATIAL_BASE = 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services';

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate walk time (5 km/h average)
function calculateWalkTime(distanceMeters: number): number {
  return Math.round(distanceMeters / (5000 / 60));
}

// Calculate drive time (40 km/h average in suburbs)
function calculateDriveTime(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / (40000 / 60)));
}

/**
 * Query QLD ArcGIS MapServer for nearby features
 */
async function queryArcGISNearby(
  serviceUrl: string,
  layerIds: number[],
  lat: number,
  lng: number,
  radiusMeters: number,
  outFields: string = '*'
): Promise<any[]> {
  const results: any[] = [];

  for (const layerId of layerIds) {
    const url = new URL(`${serviceUrl}/${layerId}/query`);
    url.searchParams.set('f', 'json');
    url.searchParams.set('geometry', JSON.stringify({
      x: lng,
      y: lat,
      spatialReference: { wkid: 4326 }
    }));
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('spatialRel', 'esriSpatialRelIntersects');
    url.searchParams.set('distance', radiusMeters.toString());
    url.searchParams.set('units', 'esriSRUnit_Meter');
    url.searchParams.set('outFields', outFields);
    url.searchParams.set('outSR', '4326');
    url.searchParams.set('returnGeometry', 'true');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) continue;

      const data = await response.json();
      if (data.features) {
        results.push(...data.features.map((f: any) => ({
          ...f,
          layerId
        })));
      }
    } catch (err) {
      console.warn(`Failed to query layer ${layerId}:`, err);
    }
  }

  return results;
}

/**
 * Fetch schools from QLD Spatial Services (ArcGIS)
 * This is the primary/recommended method - uses server-side spatial filtering
 * Layers: 4 (Primary), 5 (Junior Secondary), 6 (Senior Secondary), 8 (Special), 9 (Non-Government)
 */
export async function fetchSchoolsQLD(
  lat: number,
  lng: number,
  radiusMeters: number = 10000 // 10km default for schools
): Promise<AmenityCategory> {
  const serviceUrl = `${QLD_SPATIAL_BASE}/Society/SchoolsAndSchoolCatchments/MapServer`;

  // Layer IDs: 4=Primary, 5=Junior Secondary, 6=Senior Secondary, 8=Special, 9=Non-Government
  const features = await queryArcGISNearby(
    serviceUrl,
    [4, 5, 6, 8, 9],
    lat,
    lng,
    radiusMeters,
    'SCHOOL_NAME,SCHOOL_CLAS,ADDRESS,OBJECTID'
  );

  const schoolTypeMap: Record<number, string> = {
    4: 'Primary School',
    5: 'Junior Secondary',
    6: 'Senior Secondary',
    8: 'Special School',
    9: 'Non-Government School'
  };

  const places: NearbyPlace[] = features
    .filter((f: any) => f.geometry?.x && f.geometry?.y)
    .map((f: any) => {
      const distance = calculateDistance(lat, lng, f.geometry.y, f.geometry.x);
      return {
        id: `school-${f.attributes.OBJECTID || Math.random()}`,
        name: f.attributes.SCHOOL_NAME || 'Unknown School',
        type: 'schools',
        subtype: schoolTypeMap[f.layerId] || f.attributes.SCHOOL_CLAS || 'School',
        distance: Math.round(distance),
        walkTime: calculateWalkTime(distance),
        driveTime: calculateDriveTime(distance),
        coordinates: [f.geometry.x, f.geometry.y] as [number, number],
        address: f.attributes.ADDRESS,
        tags: { source: 'QLD Spatial Services' }
      };
    })
    .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
    .slice(0, 20); // Return top 20 nearest

  // Score based on having schools within walking/driving distance
  const walkable = places.filter(p => p.walkTime <= 15).length;
  const nearby = places.filter(p => p.driveTime <= 10).length;
  const score = Math.min(100, walkable * 15 + nearby * 5);

  return {
    id: 'schools',
    name: 'Schools',
    icon: '🏫',
    places,
    score
  };
}

/**
 * Fetch schools from CKAN Data API (fallback source with more details)
 * Note: This downloads all QLD schools and filters client-side, so it's slower
 * Prefer fetchSchoolsQLD() which uses server-side spatial filtering
 */
export async function fetchSchoolsFromCKAN(
  lat: number,
  lng: number,
  radiusMeters: number = 10000 // 10km default
): Promise<AmenityCategory> {
  const resourceId = '5b39065c-df32-415c-994c-5ff12f8de997';
  const url = `https://www.data.qld.gov.au/api/3/action/datastore_search?resource_id=${resourceId}&limit=500`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('CKAN API error');

    const data = await response.json();

    if (!data.success || !data.result?.records) {
      throw new Error('Invalid CKAN response');
    }

    const places: NearbyPlace[] = data.result.records
      .filter((r: any) => r.Latitude && r.Longitude)
      .map((r: any) => {
        const schoolLat = parseFloat(r.Latitude);
        const schoolLng = parseFloat(r.Longitude);
        const distance = calculateDistance(lat, lng, schoolLat, schoolLng);

        return {
          id: `school-${r['Centre Code']}`,
          name: r['Centre Name'] || 'Unknown School',
          type: 'schools',
          subtype: r['Centre Type'] || 'School',
          distance: Math.round(distance),
          walkTime: calculateWalkTime(distance),
          driveTime: calculateDriveTime(distance),
          coordinates: [schoolLng, schoolLat] as [number, number],
          address: [r['Actual Address Line 1'], r['Actual Address Line 2'], r['Actual Address Post Code']]
            .filter(Boolean).join(', '),
          tags: {
            source: 'QLD Education',
            sector: r.Sector,
            yearLevels: `${r['Official Low Year Level'] || ''}-${r['Official High Year Level'] || ''}`,
            studentCount: r['All Student Count'],
            lga: r['Local Government Area']
          }
        };
      })
      .filter((p: NearbyPlace) => p.distance <= radiusMeters)
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 15);

    const walkableCount = places.filter(p => p.walkTime <= 15).length;
    const score = Math.min(100, walkableCount * 20);

    return {
      id: 'schools',
      name: 'Schools',
      icon: '🏫',
      places,
      score
    };
  } catch (err) {
    console.error('CKAN schools fetch failed:', err);
    // Fallback to ArcGIS
    return fetchSchoolsQLD(lat, lng, radiusMeters);
  }
}

/**
 * Fetch healthcare facilities from QLD Health CKAN API
 * Note: This data doesn't include coordinates, so we geocode the addresses
 */
export async function fetchHealthcareQLD(
  lat: number,
  lng: number,
  radiusMeters: number = 10000 // 10km default for hospitals
): Promise<AmenityCategory> {
  const resourceId = '7de61fec-6670-4cad-a163-d955f0102cef';
  const url = `https://www.data.qld.gov.au/api/3/action/datastore_search?resource_id=${resourceId}&limit=300`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('CKAN API error');

    const data = await response.json();

    if (!data.success || !data.result?.records) {
      throw new Error('Invalid CKAN response');
    }

    // Since the hospital data doesn't have coordinates, we need to geocode
    // For now, we'll use a simple bounding box approach based on address matching
    // In production, you'd cache geocoded results

    const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    const places: NearbyPlace[] = [];

    // Process hospitals in batches to avoid rate limiting
    for (const record of data.result.records.slice(0, 50)) {
      if (!record.Address) continue;

      try {
        // Geocode the address using Mapbox
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(record.Address)}.json?access_token=${MAPBOX_TOKEN}&country=AU&limit=1`;
        const geocodeResponse = await fetch(geocodeUrl);

        if (!geocodeResponse.ok) continue;

        const geocodeData = await geocodeResponse.json();

        if (geocodeData.features?.length > 0) {
          const [facilityLng, facilityLat] = geocodeData.features[0].center;
          const distance = calculateDistance(lat, lng, facilityLat, facilityLng);

          if (distance <= radiusMeters) {
            places.push({
              id: `hospital-${record['Facility Identifier']}`,
              name: record['Facility Name'],
              type: 'healthcare',
              subtype: 'Hospital',
              distance: Math.round(distance),
              walkTime: calculateWalkTime(distance),
              driveTime: calculateDriveTime(distance),
              coordinates: [facilityLng, facilityLat] as [number, number],
              address: record.Address,
              tags: {
                source: 'QLD Health',
                hhs: record['Hospital and Health Service'],
                phone: record['Phone Number']
              }
            });
          }
        }
      } catch (geocodeErr) {
        // Skip failed geocodes
        continue;
      }
    }

    places.sort((a, b) => a.distance - b.distance);

    const walkableCount = places.filter(p => p.walkTime <= 15).length;
    const score = Math.min(100, walkableCount * 25);

    return {
      id: 'healthcare',
      name: 'Healthcare',
      icon: '🏥',
      places: places.slice(0, 10),
      score
    };
  } catch (err) {
    console.error('Healthcare fetch failed:', err);
    return {
      id: 'healthcare',
      name: 'Healthcare',
      icon: '🏥',
      places: [],
      score: 0
    };
  }
}

/**
 * Fetch parks and recreation areas from QLD Spatial Services
 */
export async function fetchParksQLD(
  lat: number,
  lng: number,
  radiusMeters: number = 2000
): Promise<AmenityCategory> {
  const serviceUrl = `${QLD_SPATIAL_BASE}/Location/Places/MapServer`;

  // Layer 16 = Recreation area
  const features = await queryArcGISNearby(
    serviceUrl,
    [16],
    lat,
    lng,
    radiusMeters,
    'NAME,FEATTYPE,OBJECTID'
  );

  const places: NearbyPlace[] = features
    .filter((f: any) => f.geometry?.rings?.[0])
    .map((f: any) => {
      // Calculate centroid of polygon for distance
      const ring = f.geometry.rings[0];
      const centroidLng = ring.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / ring.length;
      const centroidLat = ring.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / ring.length;
      const distance = calculateDistance(lat, lng, centroidLat, centroidLng);

      return {
        id: `park-${f.attributes.OBJECTID}`,
        name: f.attributes.NAME || 'Recreation Area',
        type: 'recreation',
        subtype: f.attributes.FEATTYPE || 'Park',
        distance: Math.round(distance),
        walkTime: calculateWalkTime(distance),
        driveTime: calculateDriveTime(distance),
        coordinates: [centroidLng, centroidLat] as [number, number],
        tags: { source: 'QLD Spatial Services' }
      };
    })
    .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
    .slice(0, 10);

  const walkableCount = places.filter(p => p.walkTime <= 15).length;
  const score = Math.min(100, walkableCount * 20);

  return {
    id: 'recreation',
    name: 'Recreation',
    icon: '🌳',
    places,
    score
  };
}

/**
 * Transport stops - uses cached TransLink GTFS data
 * In production, you'd want to periodically sync this from the GTFS feed
 */
export async function fetchTransportQLD(
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<AmenityCategory> {
  // TransLink GTFS doesn't have a direct query API
  // Options:
  // 1. Download and parse stops.txt from GTFS zip
  // 2. Use a pre-processed/cached version
  // 3. Fall back to OSM for transport

  // For now, we'll use OSM Overpass for transport as it's more practical
  // In production, you'd want to sync GTFS stops to a database

  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
      node["railway"="station"](around:${radiusMeters},${lat},${lng});
      node["railway"="tram_stop"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="station"](around:${radiusMeters},${lat},${lng});
      node["amenity"="ferry_terminal"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) throw new Error('Overpass API error');

    const data = await response.json();

    const places: NearbyPlace[] = data.elements
      .filter((el: any) => el.lat && el.lon)
      .map((el: any) => {
        const distance = calculateDistance(lat, lng, el.lat, el.lon);
        const tags = el.tags || {};

        let subtype = 'Stop';
        if (tags.railway === 'station') subtype = 'Train Station';
        else if (tags.railway === 'tram_stop') subtype = 'Tram Stop';
        else if (tags.highway === 'bus_stop') subtype = 'Bus Stop';
        else if (tags.amenity === 'ferry_terminal') subtype = 'Ferry Terminal';

        return {
          id: `transport-${el.id}`,
          name: tags.name || tags.operator || `${subtype}`,
          type: 'transport',
          subtype,
          distance: Math.round(distance),
          walkTime: calculateWalkTime(distance),
          driveTime: calculateDriveTime(distance),
          coordinates: [el.lon, el.lat] as [number, number],
          tags: {
            source: 'OpenStreetMap',
            ...tags
          }
        };
      })
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 15);

    // Score based on having good transport access
    const hasTrainStation = places.some(p => p.subtype === 'Train Station' && p.walkTime <= 15);
    const busstopsNearby = places.filter(p => p.subtype === 'Bus Stop' && p.walkTime <= 10).length;

    let score = 0;
    if (hasTrainStation) score += 50;
    score += Math.min(50, busstopsNearby * 10);

    return {
      id: 'transport',
      name: 'Transport',
      icon: '🚉',
      places,
      score
    };
  } catch (err) {
    console.error('Transport fetch failed:', err);
    return {
      id: 'transport',
      name: 'Transport',
      icon: '🚉',
      places: [],
      score: 0
    };
  }
}

/**
 * Shopping - OSM (no government source)
 */
export async function fetchShoppingOSM(
  lat: number,
  lng: number,
  radiusMeters: number = 2000
): Promise<AmenityCategory> {
  const query = `
    [out:json][timeout:25];
    (
      node["shop"="supermarket"](around:${radiusMeters},${lat},${lng});
      node["shop"="convenience"](around:${radiusMeters},${lat},${lng});
      node["shop"="mall"](around:${radiusMeters},${lat},${lng});
      node["shop"="department_store"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) throw new Error('Overpass API error');

    const data = await response.json();

    const places: NearbyPlace[] = data.elements
      .filter((el: any) => el.lat && el.lon)
      .map((el: any) => {
        const distance = calculateDistance(lat, lng, el.lat, el.lon);
        const tags = el.tags || {};

        return {
          id: `shop-${el.id}`,
          name: tags.name || tags.brand || 'Shop',
          type: 'shopping',
          subtype: (tags.shop || 'shop').replace(/_/g, ' '),
          distance: Math.round(distance),
          walkTime: calculateWalkTime(distance),
          driveTime: calculateDriveTime(distance),
          coordinates: [el.lon, el.lat] as [number, number],
          tags: { source: 'OpenStreetMap' }
        };
      })
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 10);

    const walkableCount = places.filter(p => p.walkTime <= 15).length;
    const score = Math.min(100, walkableCount * 25);

    return {
      id: 'shopping',
      name: 'Shopping',
      icon: '🛒',
      places,
      score
    };
  } catch (err) {
    console.error('Shopping fetch failed:', err);
    return {
      id: 'shopping',
      name: 'Shopping',
      icon: '🛒',
      places: [],
      score: 0
    };
  }
}

/**
 * Dining - OSM (no government source)
 */
export async function fetchDiningOSM(
  lat: number,
  lng: number,
  radiusMeters: number = 1500
): Promise<AmenityCategory> {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
      node["amenity"="cafe"](around:${radiusMeters},${lat},${lng});
      node["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) throw new Error('Overpass API error');

    const data = await response.json();

    const places: NearbyPlace[] = data.elements
      .filter((el: any) => el.lat && el.lon)
      .map((el: any) => {
        const distance = calculateDistance(lat, lng, el.lat, el.lon);
        const tags = el.tags || {};

        return {
          id: `dining-${el.id}`,
          name: tags.name || tags.brand || 'Restaurant',
          type: 'dining',
          subtype: (tags.amenity || tags.cuisine || 'restaurant').replace(/_/g, ' '),
          distance: Math.round(distance),
          walkTime: calculateWalkTime(distance),
          driveTime: calculateDriveTime(distance),
          coordinates: [el.lon, el.lat] as [number, number],
          tags: {
            source: 'OpenStreetMap',
            cuisine: tags.cuisine
          }
        };
      })
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 10);

    const walkableCount = places.filter(p => p.walkTime <= 15).length;
    const score = Math.min(100, walkableCount * 15);

    return {
      id: 'dining',
      name: 'Dining',
      icon: '🍽️',
      places,
      score
    };
  } catch (err) {
    console.error('Dining fetch failed:', err);
    return {
      id: 'dining',
      name: 'Dining',
      icon: '🍽️',
      places: [],
      score: 0
    };
  }
}
