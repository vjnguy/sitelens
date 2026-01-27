/**
 * Australian Spatial Data Sources Registry
 *
 * Comprehensive list of data sources at National, State, and Council levels
 * Last updated: January 2026
 */

import { DataSource, Council, AustralianState } from './types';

// ============================================================================
// NATIONAL DATA SOURCES
// ============================================================================

export const NATIONAL_DATA_SOURCES: DataSource[] = [
  {
    id: 'geoscience-australia',
    name: 'Geoscience Australia',
    provider: 'Australian Government',
    level: 'national',
    states: 'all',
    baseUrl: 'https://services.ga.gov.au',
    docsUrl: 'https://www.geoscience.gov.au/web-services',
    portalUrl: 'https://www.ga.gov.au/data-pubs',
    updateFrequency: 'Varies by dataset',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'geoscape',
    name: 'Geoscape Australia (PSMA)',
    provider: 'Geoscape Australia',
    level: 'national',
    states: 'all',
    baseUrl: 'https://geoscape.com.au/geoscape-hub/',
    docsUrl: 'https://geoscape.com.au/documentation/',
    portalUrl: 'https://geoscape.com.au/geoscape-hub/',
    updateFrequency: 'Quarterly (boundaries), Ongoing (G-NAF)',
    license: 'CC BY 4.0 (Admin Boundaries), Commercial (Cadastre)',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'data-gov-au',
    name: 'data.gov.au',
    provider: 'Australian Government',
    level: 'national',
    states: 'all',
    baseUrl: 'https://data.gov.au',
    docsUrl: 'https://data.gov.au/api/v0/apidocs/index.html',
    portalUrl: 'https://data.gov.au',
    updateFrequency: 'Varies by dataset',
    license: 'Varies - mostly CC BY',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'bom',
    name: 'Bureau of Meteorology',
    provider: 'Australian Government',
    level: 'national',
    states: 'all',
    baseUrl: 'http://www.bom.gov.au/geoserver',
    docsUrl: 'http://www.bom.gov.au/metadata/catalogue/',
    portalUrl: 'http://www.bom.gov.au/water/geofabric/',
    updateFrequency: 'Real-time (weather), Annual (water data)',
    license: 'CC BY',
    lastVerified: '2026-01',
    status: 'active',
  },
];

// ============================================================================
// STATE DATA SOURCES
// ============================================================================

export const STATE_DATA_SOURCES: DataSource[] = [
  // === QUEENSLAND ===
  {
    id: 'qld-spatial',
    name: 'QLD Spatial Information',
    provider: 'Queensland Government',
    level: 'state',
    states: ['QLD'],
    baseUrl: 'https://spatial-gis.information.qld.gov.au/arcgis/rest/services',
    docsUrl: 'https://www.resources.qld.gov.au/qld-globe',
    portalUrl: 'https://www.data.qld.gov.au/',
    updateFrequency: 'Weekly to Monthly',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'qld-arcgis-online',
    name: 'QLD ArcGIS Online (SPP)',
    provider: 'Queensland Government',
    level: 'state',
    states: ['QLD'],
    baseUrl: 'https://tiles.arcgis.com/tiles/vkTwD8kHw2woKBqV/arcgis/rest/services',
    docsUrl: 'https://spp.dsdip.esriaustraliaonline.com.au/home/',
    portalUrl: 'https://planning.dsdmip.qld.gov.au/planning/spp-mapping',
    updateFrequency: 'As updated by SPP',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === NEW SOUTH WALES ===
  {
    id: 'nsw-spatial',
    name: 'NSW Spatial Services (SIX Maps)',
    provider: 'NSW Government',
    level: 'state',
    states: ['NSW'],
    baseUrl: 'https://maps.six.nsw.gov.au/arcgis/rest/services',
    docsUrl: 'https://www.spatial.nsw.gov.au/products_and_services/web_services',
    portalUrl: 'https://portal.spatial.nsw.gov.au/',
    updateFrequency: 'Weekly',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'nsw-planning',
    name: 'NSW Planning Portal',
    provider: 'NSW Government',
    level: 'state',
    states: ['NSW'],
    baseUrl: 'https://mapprod3.environment.nsw.gov.au/arcgis/rest/services',
    docsUrl: 'https://www.planningportal.nsw.gov.au/opendata',
    portalUrl: 'https://www.planningportal.nsw.gov.au/spatialviewer/',
    updateFrequency: 'As planning instruments updated',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === VICTORIA ===
  {
    id: 'vic-spatial',
    name: 'Vicmap (Land Victoria)',
    provider: 'Victorian Government',
    level: 'state',
    states: ['VIC'],
    baseUrl: 'https://services.land.vic.gov.au/catalogue/publicproxy/guest/dv_geoserver/wms',
    docsUrl: 'https://www.land.vic.gov.au/maps-and-spatial/data-services/vicmap-as-a-service',
    portalUrl: 'https://discover.data.vic.gov.au/',
    updateFrequency: 'Weekly (planning zones)',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'vic-planning',
    name: 'VicPlan',
    provider: 'Victorian Government',
    level: 'state',
    states: ['VIC'],
    baseUrl: 'https://plan.api.delwp.vic.gov.au',
    docsUrl: 'https://www.planning.vic.gov.au/planning-schemes/using-vicplan',
    portalUrl: 'https://www.planning.vic.gov.au/planning-schemes/using-vicplan',
    updateFrequency: 'Weekly',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === SOUTH AUSTRALIA ===
  {
    id: 'sa-spatial',
    name: 'Location SA',
    provider: 'South Australian Government',
    level: 'state',
    states: ['SA'],
    baseUrl: 'https://location.sa.gov.au/server/rest/services',
    docsUrl: 'https://location.sa.gov.au/',
    portalUrl: 'https://data.sa.gov.au/',
    updateFrequency: 'Monthly',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === WESTERN AUSTRALIA ===
  {
    id: 'wa-spatial',
    name: 'WA Spatial (Landgate)',
    provider: 'Western Australian Government',
    level: 'state',
    states: ['WA'],
    baseUrl: 'https://services.slip.wa.gov.au/public/services',
    docsUrl: 'https://www.landgate.wa.gov.au/',
    portalUrl: 'https://catalogue.data.wa.gov.au/',
    updateFrequency: 'Varies',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === TASMANIA ===
  {
    id: 'tas-spatial',
    name: 'TheLIST (Tasmania)',
    provider: 'Tasmanian Government',
    level: 'state',
    states: ['TAS'],
    baseUrl: 'https://services.thelist.tas.gov.au/arcgis/rest/services',
    docsUrl: 'https://www.thelist.tas.gov.au/',
    portalUrl: 'https://listmap.thelist.tas.gov.au/',
    updateFrequency: 'Varies',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === NORTHERN TERRITORY ===
  {
    id: 'nt-spatial',
    name: 'NT Spatial (NTLIS)',
    provider: 'Northern Territory Government',
    level: 'state',
    states: ['NT'],
    baseUrl: 'https://ntlis.nt.gov.au/arcgis/rest/services',
    docsUrl: 'https://nt.gov.au/property/maps-land-records/surveys-mapping-spatial-data',
    portalUrl: 'https://data.nt.gov.au/',
    updateFrequency: 'Varies',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },

  // === ACT ===
  {
    id: 'act-spatial',
    name: 'ACTmapi',
    provider: 'ACT Government',
    level: 'state',
    states: ['ACT'],
    baseUrl: 'https://actmapi-actgov.opendata.arcgis.com',
    docsUrl: 'https://actmapi-actgov.opendata.arcgis.com/',
    portalUrl: 'https://www.data.act.gov.au/',
    updateFrequency: 'Varies',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
];

// ============================================================================
// COUNCIL DATA SOURCES
// ============================================================================

export const COUNCIL_DATA_SOURCES: DataSource[] = [
  {
    id: 'brisbane-council',
    name: 'Brisbane City Council Open Spatial Data',
    provider: 'Brisbane City Council',
    level: 'council',
    states: ['QLD'],
    baseUrl: 'https://services2.arcgis.com/dEKgZETqwmDAh1rP/arcgis/rest/services',
    docsUrl: 'https://spatial-brisbane.opendata.arcgis.com/',
    portalUrl: 'https://spatial-brisbane.opendata.arcgis.com/',
    updateFrequency: 'Weekly to Monthly',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
  {
    id: 'logan-council',
    name: 'Logan City Council Open Data',
    provider: 'Logan City Council',
    level: 'council',
    states: ['QLD'],
    baseUrl: 'https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services',
    docsUrl: 'https://data-logancity.opendata.arcgis.com/',
    portalUrl: 'https://data-logancity.opendata.arcgis.com/',
    updateFrequency: 'Varies by dataset',
    license: 'CC BY 4.0',
    lastVerified: '2026-01',
    status: 'active',
  },
];

// ============================================================================
// UTILITY DATA SOURCES
// ============================================================================

export const UTILITY_DATA_SOURCES: DataSource[] = [
  {
    id: 'urban-utilities',
    name: 'Queensland Urban Utilities',
    provider: 'Urban Utilities (SEQ Water)',
    level: 'council',
    states: ['QLD'],
    baseUrl: 'https://services3.arcgis.com/ocUCNI2h4moKOpKX/arcgis/rest/services',
    docsUrl: 'https://urbanutilities.com.au/about-us/who-we-are/asset-gis-information',
    portalUrl: 'https://urbanutilities.com.au/about-us/who-we-are/asset-gis-information',
    updateFrequency: 'Monthly',
    license: 'Open Data',
    lastVerified: '2026-01',
    status: 'active',
  },
];

// ============================================================================
// TOP 10 COUNCILS - QUEENSLAND
// ============================================================================

export const QLD_TOP_COUNCILS: Council[] = [
  {
    id: 'qld-brisbane',
    name: 'Brisbane City Council',
    state: 'QLD',
    population: 1355640,
    bounds: [152.668, -27.767, 153.318, -27.022],
    dataPortalUrl: 'https://www.data.brisbane.qld.gov.au/',
    gisServicesUrl: 'https://spatial-data.brisbane.qld.gov.au/',
    planningSchemeUrl: 'https://www.brisbane.qld.gov.au/planning-and-building/planning-guidelines-and-tools/brisbane-city-plan-2014',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Best council data in Australia - 300+ spatial datasets, full API access',
  },
  {
    id: 'qld-goldcoast',
    name: 'City of Gold Coast',
    state: 'QLD',
    population: 681389,
    bounds: [153.193, -28.265, 153.552, -27.715],
    dataPortalUrl: 'https://data-goldcoast.opendata.arcgis.com/',
    gisServicesUrl: 'https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services',
    planningSchemeUrl: 'https://www.goldcoast.qld.gov.au/Planning-building/City-Plan-planning-scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Good ArcGIS Online presence with open data',
  },
  {
    id: 'qld-moretonbay',
    name: 'Moreton Bay Regional Council',
    state: 'QLD',
    population: 522494,
    bounds: [152.591, -27.505, 153.216, -26.774],
    dataPortalUrl: 'https://datahub.moretonbay.qld.gov.au/',
    planningSchemeUrl: 'https://www.moretonbay.qld.gov.au/Planning-Development/Planning/City-Plan',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Growing data portal, planning scheme via QLD Globe',
  },
  {
    id: 'qld-logan',
    name: 'Logan City Council',
    state: 'QLD',
    population: 366431,
    bounds: [152.786, -28.006, 153.285, -27.542],
    dataPortalUrl: 'https://data-logancity.opendata.arcgis.com/',
    gisServicesUrl: 'https://services5.arcgis.com/ZUCWDRj8F77Xo351/arcgis/rest/services',
    planningSchemeUrl: 'https://www.logan.qld.gov.au/logan-planning-scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Good ArcGIS Online presence with flood mapping, stormwater, and planning data',
  },
  {
    id: 'qld-sunshinecoast',
    name: 'Sunshine Coast Council',
    state: 'QLD',
    population: 355244,
    bounds: [152.653, -26.843, 153.148, -26.256],
    dataPortalUrl: 'https://data.sunshinecoast.qld.gov.au/',
    planningSchemeUrl: 'https://www.sunshinecoast.qld.gov.au/Development/Planning-Documents/Sunshine-Coast-Planning-Scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Good open data portal with spatial services',
  },
  {
    id: 'qld-ipswich',
    name: 'Ipswich City Council',
    state: 'QLD',
    population: 247543,
    bounds: [152.452, -27.778, 152.932, -27.465],
    dataPortalUrl: 'https://data.ipswich.qld.gov.au/',
    planningSchemeUrl: 'https://www.ipswich.qld.gov.au/about_council/media/corporate_publications/iplan',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Open data portal available',
  },
  {
    id: 'qld-townsville',
    name: 'Townsville City Council',
    state: 'QLD',
    population: 197971,
    bounds: [146.454, -19.535, 147.158, -19.098],
    dataPortalUrl: 'https://data.townsville.qld.gov.au/',
    planningSchemeUrl: 'https://www.townsville.qld.gov.au/building-planning-and-projects/planning-scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Regional city with flood hazard data',
  },
  {
    id: 'qld-cairns',
    name: 'Cairns Regional Council',
    state: 'QLD',
    population: 169628,
    bounds: [145.462, -17.303, 146.247, -16.666],
    dataPortalUrl: 'https://data.cairns.qld.gov.au/',
    planningSchemeUrl: 'https://www.cairns.qld.gov.au/planning-building/planning-scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Regional city with cyclone/flood data important',
  },
  {
    id: 'qld-toowoomba',
    name: 'Toowoomba Regional Council',
    state: 'QLD',
    population: 178863,
    bounds: [151.367, -27.993, 152.438, -27.049],
    planningSchemeUrl: 'https://www.tr.qld.gov.au/planning-building/planning-scheme/toowoomba-region-planning-scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: false,
      openData: false,
    },
    notes: 'Limited open data - use QLD state services',
  },
  {
    id: 'qld-redland',
    name: 'Redland City Council',
    state: 'QLD',
    population: 163605,
    bounds: [153.051, -27.717, 153.546, -27.427],
    dataPortalUrl: 'https://data.redland.qld.gov.au/',
    planningSchemeUrl: 'https://www.redland.qld.gov.au/info/20104/our_planning_scheme',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Coastal council with good open data',
  },
];

// ============================================================================
// TOP 10 COUNCILS - NEW SOUTH WALES
// ============================================================================

export const NSW_TOP_COUNCILS: Council[] = [
  {
    id: 'nsw-canterbury-bankstown',
    name: 'Canterbury-Bankstown Council',
    state: 'NSW',
    population: 381000,
    bounds: [150.893, -33.984, 151.107, -33.809],
    dataPortalUrl: 'https://data.cbcity.nsw.gov.au/',
    planningSchemeUrl: 'https://www.cbcity.nsw.gov.au/development/planning-controls',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Largest NSW LGA by population',
  },
  {
    id: 'nsw-blacktown',
    name: 'Blacktown City Council',
    state: 'NSW',
    population: 403000,
    bounds: [150.783, -33.834, 150.998, -33.668],
    dataPortalUrl: 'https://data.blacktown.nsw.gov.au/',
    planningSchemeUrl: 'https://www.blacktown.nsw.gov.au/Plan-Build/Planning-controls/Local-Environmental-Plans',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Fast-growing Western Sydney council',
  },
  {
    id: 'nsw-northern-beaches',
    name: 'Northern Beaches Council',
    state: 'NSW',
    population: 270000,
    bounds: [151.195, -33.760, 151.332, -33.491],
    dataPortalUrl: 'https://data.northernbeaches.nsw.gov.au/',
    gisServicesUrl: 'https://gis.northernbeaches.nsw.gov.au/arcgis/rest/services',
    planningSchemeUrl: 'https://www.northernbeaches.nsw.gov.au/planning-and-development/planning-controls',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Excellent GIS services available',
  },
  {
    id: 'nsw-sydney',
    name: 'City of Sydney',
    state: 'NSW',
    population: 248000,
    bounds: [151.172, -33.912, 151.260, -33.847],
    dataPortalUrl: 'https://data.cityofsydney.nsw.gov.au/',
    gisServicesUrl: 'https://cityofsydney.maps.arcgis.com/',
    planningSchemeUrl: 'https://www.cityofsydney.nsw.gov.au/development/planning-controls',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Sydney CBD - excellent data portal, ArcGIS Online presence',
  },
  {
    id: 'nsw-parramatta',
    name: 'City of Parramatta',
    state: 'NSW',
    population: 260000,
    bounds: [150.938, -33.867, 151.102, -33.745],
    dataPortalUrl: 'https://data.cityofparramatta.nsw.gov.au/',
    planningSchemeUrl: 'https://www.cityofparramatta.nsw.gov.au/planning-and-development/planning-controls',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Western Sydney CBD - growing data presence',
  },
  {
    id: 'nsw-central-coast',
    name: 'Central Coast Council',
    state: 'NSW',
    population: 344000,
    bounds: [151.127, -33.579, 151.605, -33.159],
    dataPortalUrl: 'https://data.centralcoast.nsw.gov.au/',
    planningSchemeUrl: 'https://www.centralcoast.nsw.gov.au/council/forms-and-publications/local-environment-plans',
    availableData: {
      planning: true,
      hazards: true,
      heritage: false,
      infrastructure: true,
      openData: true,
    },
    notes: 'Large regional council north of Sydney',
  },
  {
    id: 'nsw-liverpool',
    name: 'Liverpool City Council',
    state: 'NSW',
    population: 240000,
    bounds: [150.751, -34.051, 151.022, -33.850],
    dataPortalUrl: 'https://data.liverpool.nsw.gov.au/',
    planningSchemeUrl: 'https://www.liverpool.nsw.gov.au/development/planning-and-zoning',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'South Western Sydney growth area',
  },
  {
    id: 'nsw-penrith',
    name: 'Penrith City Council',
    state: 'NSW',
    population: 220000,
    bounds: [150.589, -33.888, 150.849, -33.622],
    dataPortalUrl: 'https://data.penrith.city/',
    planningSchemeUrl: 'https://www.penrithcity.nsw.gov.au/building-development/planning/planning-controls',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Western Sydney - airport proximity important',
  },
  {
    id: 'nsw-newcastle',
    name: 'City of Newcastle',
    state: 'NSW',
    population: 167000,
    bounds: [151.660, -33.008, 151.841, -32.857],
    dataPortalUrl: 'https://data.newcastle.nsw.gov.au/',
    planningSchemeUrl: 'https://www.newcastle.nsw.gov.au/Development/Planning/Newcastle-Local-Environmental-Plan-2012',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Major regional city with port',
  },
  {
    id: 'nsw-wollongong',
    name: 'Wollongong City Council',
    state: 'NSW',
    population: 218000,
    bounds: [150.653, -34.577, 151.036, -34.287],
    dataPortalUrl: 'https://data.wollongong.nsw.gov.au/',
    planningSchemeUrl: 'https://www.wollongong.nsw.gov.au/your-council/about-council/plans-policies-strategies/local-planning',
    availableData: {
      planning: true,
      hazards: true,
      heritage: true,
      infrastructure: true,
      openData: true,
    },
    notes: 'Major regional city south of Sydney',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDataSourceById(id: string): DataSource | undefined {
  return [...NATIONAL_DATA_SOURCES, ...STATE_DATA_SOURCES, ...COUNCIL_DATA_SOURCES, ...UTILITY_DATA_SOURCES].find(s => s.id === id);
}

export function getDataSourcesByState(state: AustralianState): DataSource[] {
  return STATE_DATA_SOURCES.filter(
    s => s.states === 'all' || (Array.isArray(s.states) && s.states.includes(state))
  );
}

export function getCouncilsByState(state: AustralianState): Council[] {
  if (state === 'QLD') return QLD_TOP_COUNCILS;
  if (state === 'NSW') return NSW_TOP_COUNCILS;
  return [];
}

export function getCouncilById(id: string): Council | undefined {
  return [...QLD_TOP_COUNCILS, ...NSW_TOP_COUNCILS].find(c => c.id === id);
}

export function getAllDataSources(): DataSource[] {
  return [...NATIONAL_DATA_SOURCES, ...STATE_DATA_SOURCES, ...COUNCIL_DATA_SOURCES, ...UTILITY_DATA_SOURCES];
}

export function getAllCouncils(): Council[] {
  return [...QLD_TOP_COUNCILS, ...NSW_TOP_COUNCILS];
}
