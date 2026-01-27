/**
 * Map Marker Utilities
 * Manages markers and popups for DAs and Sales on the map.
 */

import mapboxgl from 'mapbox-gl';

// Marker source and layer IDs
export const DA_SOURCE_ID = 'da-markers-source';
export const DA_LAYER_ID = 'da-markers-layer';
export const DA_CLUSTER_LAYER_ID = 'da-clusters-layer';
export const DA_CLUSTER_COUNT_LAYER_ID = 'da-cluster-count-layer';

export const SALES_SOURCE_ID = 'sales-markers-source';
export const SALES_LAYER_ID = 'sales-markers-layer';
export const SALES_CLUSTER_LAYER_ID = 'sales-clusters-layer';
export const SALES_CLUSTER_COUNT_LAYER_ID = 'sales-cluster-count-layer';

interface MarkerData {
  id: string;
  lat: number;
  lon: number;
  properties: Record<string, unknown>;
}

// Store popup instances for cleanup
let daHoverPopup: mapboxgl.Popup | null = null;
let salesHoverPopup: mapboxgl.Popup | null = null;

/**
 * Add DA markers to the map
 */
export function addDAMarkers(
  map: mapboxgl.Map,
  das: MarkerData[],
  onClick?: (id: string) => void
): void {
  // Remove existing layers and source
  removeDAMarkers(map);

  // Create GeoJSON from DAs
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: das.map((da) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [da.lon, da.lat],
      },
      properties: {
        id: da.id,
        ...da.properties,
      },
    })),
  };

  // Add source with clustering
  map.addSource(DA_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  // Add cluster circles
  map.addLayer({
    id: DA_CLUSTER_LAYER_ID,
    type: 'circle',
    source: DA_SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#8b5cf6',
      'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // Add cluster count labels
  map.addLayer({
    id: DA_CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: DA_SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });

  // Add individual markers
  map.addLayer({
    id: DA_LAYER_ID,
    type: 'circle',
    source: DA_SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'status'],
        'approved', '#22c55e',
        'refused', '#ef4444',
        'under_assessment', '#f59e0b',
        'on_exhibition', '#8b5cf6',
        'lodged', '#3b82f6',
        '#6b7280', // default
      ],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // Add click handler
  if (onClick) {
    map.on('click', DA_LAYER_ID, (e) => {
      if (e.features?.[0]?.properties?.id) {
        onClick(e.features[0].properties.id as string);
      }
    });
  }

  // Hover tooltip
  daHoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
    className: 'da-hover-popup',
  });

  map.on('mouseenter', DA_LAYER_ID, (e) => {
    map.getCanvas().style.cursor = 'pointer';

    if (!e.features?.[0]) return;

    const feature = e.features[0];
    const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
    const props = feature.properties || {};

    const html = createDAPopup({
      application_number: props.application_number as string || 'N/A',
      description: props.description as string || 'Development Application',
      status: props.status as string || 'lodged',
      estimated_cost: props.estimated_cost as number | undefined,
    });

    daHoverPopup?.setLngLat(coords).setHTML(html).addTo(map);
  });

  map.on('mouseleave', DA_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
    daHoverPopup?.remove();
  });

  // Handle cluster clicks to zoom in
  map.on('click', DA_CLUSTER_LAYER_ID, (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [DA_CLUSTER_LAYER_ID],
    });
    const clusterId = features[0]?.properties?.cluster_id;
    if (clusterId) {
      const source = map.getSource(DA_SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: zoom || 14,
        });
      });
    }
  });
}

/**
 * Remove DA markers from the map
 */
export function removeDAMarkers(map: mapboxgl.Map): void {
  // Remove popup
  daHoverPopup?.remove();
  daHoverPopup = null;

  if (map.getLayer(DA_LAYER_ID)) map.removeLayer(DA_LAYER_ID);
  if (map.getLayer(DA_CLUSTER_LAYER_ID)) map.removeLayer(DA_CLUSTER_LAYER_ID);
  if (map.getLayer(DA_CLUSTER_COUNT_LAYER_ID)) map.removeLayer(DA_CLUSTER_COUNT_LAYER_ID);
  if (map.getSource(DA_SOURCE_ID)) map.removeSource(DA_SOURCE_ID);
}

/**
 * Add Sales markers to the map
 */
export function addSalesMarkers(
  map: mapboxgl.Map,
  sales: MarkerData[],
  onClick?: (id: string) => void
): void {
  // Remove existing layers and source
  removeSalesMarkers(map);

  // Create GeoJSON from sales
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: sales.map((sale) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [sale.lon, sale.lat],
      },
      properties: {
        id: sale.id,
        ...sale.properties,
      },
    })),
  };

  // Add source with clustering
  map.addSource(SALES_SOURCE_ID, {
    type: 'geojson',
    data: geojson,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
  });

  // Add cluster circles
  map.addLayer({
    id: SALES_CLUSTER_LAYER_ID,
    type: 'circle',
    source: SALES_SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#10b981',
      'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // Add cluster count labels
  map.addLayer({
    id: SALES_CLUSTER_COUNT_LAYER_ID,
    type: 'symbol',
    source: SALES_SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });

  // Add individual markers
  map.addLayer({
    id: SALES_LAYER_ID,
    type: 'circle',
    source: SALES_SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': '#10b981',
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // Add click handler
  if (onClick) {
    map.on('click', SALES_LAYER_ID, (e) => {
      if (e.features?.[0]?.properties?.id) {
        onClick(e.features[0].properties.id as string);
      }
    });
  }

  // Hover tooltip
  salesHoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 12,
    className: 'sales-hover-popup',
  });

  map.on('mouseenter', SALES_LAYER_ID, (e) => {
    map.getCanvas().style.cursor = 'pointer';

    if (!e.features?.[0]) return;

    const feature = e.features[0];
    const coords = (feature.geometry as GeoJSON.Point).coordinates.slice() as [number, number];
    const props = feature.properties || {};

    const html = createSalePopup({
      address: props.address as string || 'Property',
      sale_price: props.sale_price as number || 0,
      contract_date: props.contract_date as string || new Date().toISOString(),
      property_type: props.property_type as string || 'house',
      land_area_sqm: props.land_area_sqm as number | undefined,
    });

    salesHoverPopup?.setLngLat(coords).setHTML(html).addTo(map);
  });

  map.on('mouseleave', SALES_LAYER_ID, () => {
    map.getCanvas().style.cursor = '';
    salesHoverPopup?.remove();
  });

  // Handle cluster clicks to zoom in
  map.on('click', SALES_CLUSTER_LAYER_ID, (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: [SALES_CLUSTER_LAYER_ID],
    });
    const clusterId = features[0]?.properties?.cluster_id;
    if (clusterId) {
      const source = map.getSource(SALES_SOURCE_ID) as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        map.easeTo({
          center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: zoom || 14,
        });
      });
    }
  });
}

/**
 * Remove Sales markers from the map
 */
export function removeSalesMarkers(map: mapboxgl.Map): void {
  // Remove popup
  salesHoverPopup?.remove();
  salesHoverPopup = null;

  if (map.getLayer(SALES_LAYER_ID)) map.removeLayer(SALES_LAYER_ID);
  if (map.getLayer(SALES_CLUSTER_LAYER_ID)) map.removeLayer(SALES_CLUSTER_LAYER_ID);
  if (map.getLayer(SALES_CLUSTER_COUNT_LAYER_ID)) map.removeLayer(SALES_CLUSTER_COUNT_LAYER_ID);
  if (map.getSource(SALES_SOURCE_ID)) map.removeSource(SALES_SOURCE_ID);
}

/**
 * Create a popup for DA
 */
export function createDAPopup(da: {
  application_number: string;
  description: string;
  status: string;
  estimated_cost?: number;
}): string {
  const statusColors: Record<string, string> = {
    approved: '#22c55e',
    refused: '#ef4444',
    under_assessment: '#f59e0b',
    on_exhibition: '#8b5cf6',
    lodged: '#3b82f6',
  };

  const statusColor = statusColors[da.status] || '#6b7280';
  const cost = da.estimated_cost
    ? `<div style="font-size: 12px; color: #666;">Est. $${(da.estimated_cost / 1000).toFixed(0)}K</div>`
    : '';

  return `
    <div style="max-width: 250px; font-family: system-ui, sans-serif;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${da.application_number}</div>
      <div style="font-size: 12px; color: #333; margin-bottom: 6px; line-height: 1.4;">${da.description.slice(0, 100)}${da.description.length > 100 ? '...' : ''}</div>
      <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${statusColor}; color: white; font-size: 11px; font-weight: 500;">${da.status.replace('_', ' ')}</div>
      ${cost}
    </div>
  `;
}

/**
 * Create a popup for Sale
 */
export function createSalePopup(sale: {
  address: string;
  sale_price: number;
  contract_date: string;
  property_type: string;
  land_area_sqm?: number;
}): string {
  const price = `$${(sale.sale_price / 1000000).toFixed(2)}M`;
  const date = new Date(sale.contract_date).toLocaleDateString('en-AU', {
    month: 'short',
    year: 'numeric',
  });
  const area = sale.land_area_sqm ? `${sale.land_area_sqm.toLocaleString()} m²` : '';

  return `
    <div style="max-width: 220px; font-family: system-ui, sans-serif;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${sale.address}</div>
      <div style="font-size: 16px; font-weight: 700; color: #10b981; margin-bottom: 4px;">${price}</div>
      <div style="font-size: 12px; color: #666;">
        <span>${sale.property_type}</span>
        ${area ? ` · ${area}` : ''}
        <br/>${date}
      </div>
    </div>
  `;
}
