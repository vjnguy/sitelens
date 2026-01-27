/**
 * Nearby Amenities Service
 *
 * Fetches nearby points of interest using official Australian government data sources:
 * - Schools: QLD Education (data.qld.gov.au CKAN API)
 * - Transport: OpenStreetMap (TransLink GTFS planned)
 * - Healthcare: QLD Health + Mapbox Geocoding
 * - Parks/Recreation: QLD Spatial Services (ArcGIS)
 * - Shopping/Dining: OpenStreetMap (no government source)
 */

import {
  fetchSchoolsQLD,
  fetchSchoolsFromCKAN,
  fetchTransportQLD,
  fetchHealthcareQLD,
  fetchParksQLD,
  fetchShoppingOSM,
  fetchDiningOSM,
} from './gov-amenities';

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  distance: number; // meters
  walkTime: number; // minutes (assuming 5km/h walking speed)
  driveTime: number; // minutes (assuming 40km/h average)
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  rating?: number;
  tags?: Record<string, string>;
}

export interface AmenityCategory {
  id: string;
  name: string;
  icon: string;
  places: NearbyPlace[];
  score?: number; // 0-100 score for this category
}

export interface NearbyAmenitiesResult {
  coordinates: [number, number];
  searchRadius: number;
  categories: AmenityCategory[];
  overallScore: number;
  fetchedAt: string;
}

// OSM tag mappings for each category
const CATEGORY_QUERIES: Record<string, { tags: string[][]; label: string; icon: string }> = {
  schools: {
    label: 'Schools',
    icon: '🏫',
    tags: [
      ['amenity', 'school'],
      ['amenity', 'kindergarten'],
      ['amenity', 'college'],
      ['amenity', 'university'],
    ],
  },
  transport: {
    label: 'Transport',
    icon: '🚉',
    tags: [
      ['highway', 'bus_stop'],
      ['railway', 'station'],
      ['railway', 'tram_stop'],
      ['amenity', 'ferry_terminal'],
      ['public_transport', 'station'],
      ['public_transport', 'stop_position'],
    ],
  },
  shopping: {
    label: 'Shopping',
    icon: '🛒',
    tags: [
      ['shop', 'supermarket'],
      ['shop', 'convenience'],
      ['shop', 'mall'],
      ['shop', 'department_store'],
      ['amenity', 'marketplace'],
    ],
  },
  healthcare: {
    label: 'Healthcare',
    icon: '🏥',
    tags: [
      ['amenity', 'hospital'],
      ['amenity', 'clinic'],
      ['amenity', 'doctors'],
      ['amenity', 'pharmacy'],
      ['amenity', 'dentist'],
    ],
  },
  recreation: {
    label: 'Recreation',
    icon: '🌳',
    tags: [
      ['leisure', 'park'],
      ['leisure', 'playground'],
      ['leisure', 'sports_centre'],
      ['leisure', 'swimming_pool'],
      ['leisure', 'fitness_centre'],
    ],
  },
  dining: {
    label: 'Dining',
    icon: '🍽️',
    tags: [
      ['amenity', 'restaurant'],
      ['amenity', 'cafe'],
      ['amenity', 'fast_food'],
      ['amenity', 'pub'],
    ],
  },
};

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
  return Math.round(distanceMeters / (5000 / 60)); // minutes
}

// Calculate drive time (40 km/h average in suburbs)
function calculateDriveTime(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / (40000 / 60))); // minutes, minimum 1
}

// Build Overpass API query for a category
function buildOverpassQuery(
  lat: number,
  lng: number,
  radius: number,
  tags: string[][]
): string {
  const tagQueries = tags
    .map(([key, value]) => `node["${key}"="${value}"](around:${radius},${lat},${lng});`)
    .join('\n');

  return `
    [out:json][timeout:25];
    (
      ${tagQueries}
    );
    out body;
  `;
}

// Fetch places from Overpass API for a single category
async function fetchCategoryPlaces(
  lat: number,
  lng: number,
  radius: number,
  categoryId: string,
  config: { tags: string[][]; label: string; icon: string }
): Promise<AmenityCategory> {
  const query = buildOverpassQuery(lat, lng, radius, config.tags);

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.warn(`Overpass API error for ${categoryId}:`, response.status);
      return {
        id: categoryId,
        name: config.label,
        icon: config.icon,
        places: [],
      };
    }

    const data = await response.json();

    const places: NearbyPlace[] = data.elements
      .filter((el: any) => el.lat && el.lon)
      .map((el: any) => {
        const distance = calculateDistance(lat, lng, el.lat, el.lon);
        const tags = el.tags || {};

        // Determine subtype from tags
        let subtype = '';
        for (const [key, value] of Object.entries(tags)) {
          if (['amenity', 'shop', 'leisure', 'railway', 'highway', 'public_transport'].includes(key)) {
            subtype = String(value).replace(/_/g, ' ');
            break;
          }
        }

        return {
          id: String(el.id),
          name: tags.name || tags.operator || `${subtype} (unnamed)`,
          type: categoryId,
          subtype,
          distance: Math.round(distance),
          walkTime: calculateWalkTime(distance),
          driveTime: calculateDriveTime(distance),
          coordinates: [el.lon, el.lat] as [number, number],
          address: tags['addr:street']
            ? `${tags['addr:housenumber'] || ''} ${tags['addr:street']}`.trim()
            : undefined,
          tags,
        };
      })
      .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance)
      .slice(0, 10); // Top 10 closest

    // Calculate category score (based on availability within walking distance)
    const walkableCount = places.filter(p => p.walkTime <= 15).length;
    const score = Math.min(100, walkableCount * 20); // 5 walkable places = 100

    return {
      id: categoryId,
      name: config.label,
      icon: config.icon,
      places,
      score,
    };
  } catch (error) {
    console.warn(`Failed to fetch ${categoryId}:`, error);
    return {
      id: categoryId,
      name: config.label,
      icon: config.icon,
      places: [],
      score: 0,
    };
  }
}

/**
 * Fetch all nearby amenities for a location
 * Uses official Australian government data sources where available
 */
export async function fetchNearbyAmenities(
  coordinates: [number, number],
  radiusMeters: number = 2000,
  categories?: string[]
): Promise<NearbyAmenitiesResult> {
  const [lng, lat] = coordinates;
  const categoriesToFetch = categories || ['schools', 'transport', 'shopping', 'healthcare', 'recreation', 'dining'];

  // Map of category fetchers using government data sources
  // Each category has an appropriate search radius
  const categoryFetchers: Record<string, () => Promise<AmenityCategory>> = {
    schools: () => fetchSchoolsQLD(lat, lng, 10000), // 10km for schools - important amenity
    transport: () => fetchTransportQLD(lat, lng, 2000), // 2km for transport - needs to be walkable
    shopping: () => fetchShoppingOSM(lat, lng, 3000), // 3km for shopping
    healthcare: () => fetchHealthcareQLD(lat, lng, 10000), // 10km for hospitals - critical amenity
    recreation: () => fetchParksQLD(lat, lng, 3000), // 3km for parks
    dining: () => fetchDiningOSM(lat, lng, 2000), // 2km for dining - local amenity
  };

  // Fetch all categories in parallel
  const categoryResults = await Promise.all(
    categoriesToFetch.map(async (catId) => {
      const fetcher = categoryFetchers[catId];
      if (!fetcher) {
        // Fallback to OSM for unknown categories
        const config = CATEGORY_QUERIES[catId];
        if (!config) return null;
        return fetchCategoryPlaces(lat, lng, radiusMeters, catId, config);
      }
      try {
        return await fetcher();
      } catch (err) {
        console.warn(`Failed to fetch ${catId}:`, err);
        // Fallback to OSM
        const config = CATEGORY_QUERIES[catId];
        if (config) {
          return fetchCategoryPlaces(lat, lng, radiusMeters, catId, config);
        }
        return null;
      }
    })
  );

  const validCategories = categoryResults.filter((c): c is AmenityCategory => c !== null);

  // Calculate overall score (weighted average)
  const weights: Record<string, number> = {
    schools: 0.2,
    transport: 0.25,
    shopping: 0.2,
    healthcare: 0.15,
    recreation: 0.1,
    dining: 0.1,
  };

  let totalWeight = 0;
  let weightedSum = 0;
  for (const cat of validCategories) {
    const weight = weights[cat.id] || 0.1;
    weightedSum += (cat.score || 0) * weight;
    totalWeight += weight;
  }
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    coordinates,
    searchRadius: radiusMeters,
    categories: validCategories,
    overallScore,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Get a human-readable description of the location score
 */
export function getScoreDescription(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-600' };
  if (score >= 70) return { label: 'Very Good', color: 'text-green-500' };
  if (score >= 50) return { label: 'Good', color: 'text-blue-500' };
  if (score >= 30) return { label: 'Fair', color: 'text-amber-500' };
  return { label: 'Limited', color: 'text-red-500' };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format time for display
 */
export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
