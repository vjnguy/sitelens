/**
 * Planning Implications for Overlay Layers
 *
 * Maps overlay layer IDs to planning scheme consequences, required assessments,
 * and relevant legislation. This enables Property Intelligence to provide
 * detailed planning advice when a property intersects with constraint layers.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface PlanningImplication {
  /** Overlay layer ID (matches overlay system) */
  layerId: string;
  /** Display name */
  name: string;
  /** Severity/impact level */
  severity: Severity;
  /** Brief summary of the constraint */
  summary: string;
  /** Detailed planning consequences */
  implications: string[];
  /** Required assessments or reports */
  requiredAssessments?: string[];
  /** Relevant legislation/codes */
  legislation?: string[];
  /** Development types most affected */
  affectedDevelopment?: string[];
  /** Approval pathway changes */
  approvalImpact?: string;
  /** Estimated additional cost range (AUD) */
  costRange?: { min: number; max: number };
  /** Typical delay in weeks */
  typicalDelay?: number;
  /** External referral agencies */
  referralAgencies?: string[];
  /** Links to more information */
  resourceLinks?: { label: string; url: string }[];
}

/**
 * Planning implications for QLD overlay layers
 */
export const QLD_PLANNING_IMPLICATIONS: PlanningImplication[] = [
  // ============================================================================
  // BUSHFIRE HAZARDS
  // ============================================================================
  {
    layerId: 'qld-bushfire-prone',
    name: 'Bushfire Prone Area',
    severity: 'high',
    summary: 'Property is within a designated bushfire prone area requiring specific construction standards and assessment.',
    implications: [
      'Development must comply with State Planning Policy (SPP) - Natural Hazards, Risk and Resilience',
      'Buildings must meet AS3959 Construction of Buildings in Bushfire-prone Areas',
      'Bushfire Attack Level (BAL) assessment required to determine construction requirements',
      'May require Bushfire Management Plan for subdivisions',
      'Landscaping and vegetation management conditions likely',
    ],
    requiredAssessments: [
      'Bushfire Attack Level (BAL) Assessment',
      'Bushfire Hazard Assessment (for subdivisions)',
      'Bushfire Management Plan (large developments)',
    ],
    legislation: [
      'Building Act 1975',
      'Building Code of Australia (NCC)',
      'AS3959-2018 Construction of Buildings in Bushfire-prone Areas',
      'State Planning Policy - Natural Hazards',
    ],
    affectedDevelopment: ['Residential', 'Accommodation', 'Community Facilities', 'Childcare'],
    approvalImpact: 'Code assessable if compliant with acceptable outcomes, otherwise impact assessable',
    costRange: { min: 2000, max: 15000 },
    typicalDelay: 2,
    referralAgencies: ['Queensland Fire and Emergency Services (QFES)'],
    resourceLinks: [
      { label: 'SPP Bushfire Guideline', url: 'https://planning.statedevelopment.qld.gov.au/planning-framework/plan-making/state-planning/state-planning-policy' },
    ],
  },
  {
    layerId: 'qld-fuel-hazard',
    name: 'High Fuel Hazard Area',
    severity: 'medium',
    summary: 'Property has elevated bushfire fuel load requiring consideration in development design.',
    implications: [
      'Consider fuel management zones in site layout',
      'May require ongoing vegetation management conditions',
      'Asset Protection Zones may be required around buildings',
    ],
    requiredAssessments: ['Site-specific bushfire assessment if in conjunction with other hazards'],
    legislation: ['State Planning Policy - Natural Hazards'],
    approvalImpact: 'Generally code assessable with conditions',
    costRange: { min: 500, max: 3000 },
  },

  // ============================================================================
  // FLOOD HAZARDS
  // ============================================================================
  {
    layerId: 'qld-flood-overlay',
    name: 'Flood Overlay',
    severity: 'high',
    summary: 'Property is within a flood overlay area with defined flood levels and hazard categories.',
    implications: [
      'Minimum habitable floor levels apply (typically DFE + freeboard)',
      'Flood hazard category determines development restrictions',
      'May require flood immunity for essential services',
      'Flood evacuation route and timing assessment required',
      'Some uses prohibited in high hazard areas',
    ],
    requiredAssessments: [
      'Flood Impact Assessment',
      'Hydraulic Assessment (if filling or excavating)',
      'Flood Evacuation Plan (vulnerable uses)',
    ],
    legislation: [
      'State Planning Policy - Natural Hazards',
      'Queensland Development Code MP3.5 - Construction of buildings in flood hazard areas',
      'Local Planning Scheme Flood Overlay Code',
    ],
    affectedDevelopment: ['All development types', 'Particularly residential and vulnerable uses'],
    approvalImpact: 'Code or impact assessable depending on hazard level and use',
    costRange: { min: 3000, max: 25000 },
    typicalDelay: 4,
    referralAgencies: ['Department of Resources (major watercourses)'],
  },
  {
    layerId: 'qld-rapid-flood-hazard',
    name: 'Rapid Flood Hazard',
    severity: 'high',
    summary: 'Property is subject to rapid onset flooding with limited warning time.',
    implications: [
      'Higher construction standards due to rapid inundation risk',
      'Evacuation planning critical - may limit vulnerable uses',
      'Underground parking restrictions likely',
      'Essential services must be elevated',
    ],
    requiredAssessments: [
      'Flood Impact Assessment',
      'Evacuation Capability Assessment',
    ],
    legislation: ['State Planning Policy - Natural Hazards'],
    approvalImpact: 'Typically impact assessable for habitable development',
    costRange: { min: 5000, max: 30000 },
    typicalDelay: 6,
  },

  // ============================================================================
  // COASTAL HAZARDS
  // ============================================================================
  {
    layerId: 'qld-coastal-erosion',
    name: 'Coastal Erosion Prone Area',
    severity: 'high',
    summary: 'Property is within a coastal erosion prone area with development setback requirements.',
    implications: [
      'Coastal Building Line setbacks apply',
      'Development may be prohibited seaward of erosion prone area',
      'Temporary/relocatable structures may be required',
      'Shoreline erosion management conditions likely',
    ],
    requiredAssessments: [
      'Coastal Hazard Assessment',
      'Shoreline Erosion Management Plan',
    ],
    legislation: [
      'Coastal Protection and Management Act 1995',
      'State Planning Policy - Coastal Environment',
    ],
    affectedDevelopment: ['All permanent structures'],
    approvalImpact: 'Impact assessable within erosion prone area',
    costRange: { min: 5000, max: 40000 },
    typicalDelay: 8,
    referralAgencies: ['Department of Environment and Science'],
  },
  {
    layerId: 'qld-storm-tide',
    name: 'Storm Tide Hazard Area',
    severity: 'high',
    summary: 'Property is subject to storm tide inundation during cyclonic events.',
    implications: [
      'Minimum floor levels based on storm tide levels + wave action',
      'Structural design must resist storm tide forces',
      'Evacuation planning for vulnerable uses',
      'Underground areas may be prohibited',
    ],
    requiredAssessments: [
      'Storm Tide Hazard Assessment',
      'Structural Engineering Assessment',
    ],
    legislation: ['State Planning Policy - Coastal Environment'],
    approvalImpact: 'Code or impact assessable depending on use',
    costRange: { min: 3000, max: 20000 },
    typicalDelay: 4,
  },

  // ============================================================================
  // ENVIRONMENT
  // ============================================================================
  {
    layerId: 'qld-koala-habitat',
    name: 'Koala Habitat Area',
    severity: 'high',
    summary: 'Property contains mapped koala habitat requiring protection measures.',
    implications: [
      'Koala habitat clearing restrictions apply',
      'Fauna-sensitive road design required',
      'Koala-safe fencing and pool requirements',
      'Habitat connectivity must be maintained',
      'Dog restrictions in new residential areas',
    ],
    requiredAssessments: [
      'Koala Habitat Assessment',
      'Ecological Assessment',
      'Koala Management Plan (major development)',
    ],
    legislation: [
      'Nature Conservation Act 1992',
      'SEQ Koala Conservation Strategy',
      'Planning Regulation 2017 - Koala provisions',
    ],
    affectedDevelopment: ['Residential subdivision', 'Multi-unit residential', 'Commercial with clearing'],
    approvalImpact: 'State referral required for koala habitat clearing',
    costRange: { min: 5000, max: 50000 },
    typicalDelay: 8,
    referralAgencies: ['Department of Environment and Science'],
    resourceLinks: [
      { label: 'Koala Conservation', url: 'https://environment.des.qld.gov.au/wildlife/animals/living-with/koalas' },
    ],
  },
  {
    layerId: 'qld-mses',
    name: 'Matter of State Environmental Significance',
    severity: 'high',
    summary: 'Property contains MSES values requiring state-level environmental assessment.',
    implications: [
      'State referral required for assessable development',
      'Environmental offsets likely required for unavoidable impacts',
      'Avoid, minimise, mitigate hierarchy applies',
      'Significant clearing restrictions',
    ],
    requiredAssessments: [
      'Environmental Impact Assessment',
      'MSES Assessment',
      'Offset Delivery Plan (if offsets required)',
    ],
    legislation: [
      'Environmental Offsets Act 2014',
      'State Planning Policy - Biodiversity',
      'Vegetation Management Act 1999',
    ],
    approvalImpact: 'State referral required',
    costRange: { min: 10000, max: 100000 },
    typicalDelay: 12,
    referralAgencies: ['Department of Environment and Science', 'Department of Resources'],
  },
  {
    layerId: 'qld-protected-areas',
    name: 'Protected Area / National Park',
    severity: 'critical',
    summary: 'Property is adjacent to or within a protected area with strict development controls.',
    implications: [
      'Development may be prohibited within protected area',
      'Buffer zones and setbacks apply adjacent to parks',
      'Visual amenity and lighting controls',
      'Stormwater quality requirements',
    ],
    requiredAssessments: ['Environmental Impact Assessment'],
    legislation: ['Nature Conservation Act 1992'],
    approvalImpact: 'Development generally prohibited in protected areas',
    referralAgencies: ['Department of Environment and Science'],
  },
  {
    layerId: 'qld-acid-sulfate-soils',
    name: 'Acid Sulfate Soils',
    severity: 'medium',
    summary: 'Property contains potential or actual acid sulfate soils requiring management during construction.',
    implications: [
      'Soil testing required before excavation',
      'Acid Sulfate Soil Management Plan required for significant disturbance',
      'Treatment and neutralisation costs for disturbed soils',
      'Monitoring and reporting conditions',
    ],
    requiredAssessments: [
      'Preliminary Acid Sulfate Soil Investigation',
      'Detailed ASS Investigation (if triggered)',
      'Acid Sulfate Soil Management Plan',
    ],
    legislation: [
      'State Planning Policy - Water Quality',
      'Environmental Protection Act 1994',
    ],
    approvalImpact: 'Code assessable with management plan',
    costRange: { min: 3000, max: 50000 },
    typicalDelay: 2,
  },

  // ============================================================================
  // HERITAGE
  // ============================================================================
  {
    layerId: 'qld-cultural-heritage',
    name: 'Cultural Heritage Area',
    severity: 'high',
    summary: 'Property is within a Cultural Heritage Management Plan area or has known cultural heritage values.',
    implications: [
      'Cultural Heritage Management Plan (CHMP) may be required',
      'Aboriginal Party notification and consultation required',
      'Stop-work provisions if cultural heritage discovered',
      'Development design may need modification',
    ],
    requiredAssessments: [
      'Cultural Heritage Due Diligence Assessment',
      'Cultural Heritage Management Plan (if triggered)',
    ],
    legislation: [
      'Aboriginal Cultural Heritage Act 2003',
      'Torres Strait Islander Cultural Heritage Act 2003',
    ],
    approvalImpact: 'CHMP required before development approval for certain activities',
    costRange: { min: 5000, max: 80000 },
    typicalDelay: 12,
    referralAgencies: ['Aboriginal Party', 'Department of Seniors, Disability Services and Aboriginal and Torres Strait Islander Partnerships'],
    resourceLinks: [
      { label: 'Cultural Heritage Duty of Care', url: 'https://www.dsdsatsip.qld.gov.au/our-work/aboriginal-torres-strait-islander-partnerships/culture-heritage' },
    ],
  },

  // ============================================================================
  // PLANNING / BOUNDARIES
  // ============================================================================
  {
    layerId: 'qld-pda',
    name: 'Priority Development Area',
    severity: 'info',
    summary: 'Property is within a Priority Development Area with streamlined approval processes.',
    implications: [
      'Development assessed under PDA Development Scheme',
      'May bypass local government assessment',
      'Infrastructure charges may differ from standard charges',
      'Faster approval timeframes possible',
    ],
    legislation: ['Economic Development Act 2012'],
    approvalImpact: 'Assessed by Economic Development Queensland',
    referralAgencies: ['Economic Development Queensland'],
    resourceLinks: [
      { label: 'EDQ Priority Development Areas', url: 'https://economic.development.qld.gov.au' },
    ],
  },
  {
    layerId: 'qld-sda',
    name: 'State Development Area',
    severity: 'info',
    summary: 'Property is within a State Development Area with coordinated state planning.',
    implications: [
      'Development assessed under SDA Development Scheme',
      'Coordinator-General involvement for major projects',
      'Strategic land use planning applies',
    ],
    legislation: ['State Development and Public Works Organisation Act 1971'],
    approvalImpact: 'Coordinator-General involvement',
    referralAgencies: ['Coordinator-General'],
  },
];

/**
 * Planning implications for Brisbane Council overlay layers
 */
export const BRISBANE_PLANNING_IMPLICATIONS: PlanningImplication[] = [
  // ============================================================================
  // FLOOD HAZARDS
  // ============================================================================
  {
    layerId: 'brisbane-flood-river',
    name: 'Brisbane River Flood Overlay',
    severity: 'high',
    summary: 'Property is within the Brisbane River flood planning area with defined flood levels.',
    implications: [
      'Minimum habitable floor levels apply based on Defined Flood Event (DFE)',
      'Development must comply with Brisbane City Plan 2014 Flood Overlay Code',
      'Building design must accommodate flood levels and velocities',
      'Flood resilient materials required below DFE',
      'Electrical and mechanical services must be elevated',
    ],
    requiredAssessments: [
      'Flood Search Certificate',
      'Hydraulic Assessment (if filling or excavation proposed)',
      'Site-specific Flood Assessment (complex sites)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Flood Overlay Code',
      'Queensland Development Code MP3.5',
      'State Planning Policy - Natural Hazards',
    ],
    affectedDevelopment: ['All development types', 'Particularly vulnerable uses'],
    approvalImpact: 'Code assessable if compliant, otherwise impact assessable',
    costRange: { min: 1500, max: 20000 },
    typicalDelay: 3,
    resourceLinks: [
      { label: 'BCC Flood Awareness Maps', url: 'https://www.brisbane.qld.gov.au/planning-and-building/planning-guidelines-and-tools/flood-information' },
    ],
  },
  {
    layerId: 'brisbane-flood-creek',
    name: 'Creek/Waterway Flood Overlay',
    severity: 'high',
    summary: 'Property is within a creek or waterway flood planning area.',
    implications: [
      'Minimum floor levels based on local creek flooding',
      'Stormwater management requirements',
      'May require detention/retention on site',
      'Building setbacks from waterways',
    ],
    requiredAssessments: [
      'Flood Search Certificate',
      'Stormwater Management Plan',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Flood Overlay Code',
      'Waterway Corridors Overlay Code',
    ],
    approvalImpact: 'Code assessable with conditions',
    costRange: { min: 1500, max: 15000 },
    typicalDelay: 3,
  },
  {
    layerId: 'brisbane-flood-overland',
    name: 'Overland Flow Path',
    severity: 'medium',
    summary: 'Property is affected by overland flow during major storm events.',
    implications: [
      'Building siting to avoid overland flow paths',
      'Floor levels elevated above overland flow depths',
      'Fencing design to not impede flow',
      'Drainage easements may be required',
    ],
    requiredAssessments: [
      'Stormwater Management Plan',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Flood Overlay Code',
    ],
    approvalImpact: 'Generally code assessable',
    costRange: { min: 1000, max: 8000 },
    typicalDelay: 2,
  },

  // ============================================================================
  // BUSHFIRE & LANDSLIDE
  // ============================================================================
  {
    layerId: 'brisbane-bushfire',
    name: 'Bushfire Overlay',
    severity: 'high',
    summary: 'Property is within a designated bushfire hazard area requiring BAL assessment.',
    implications: [
      'Bushfire Attack Level (BAL) assessment required',
      'Construction must comply with AS3959 for determined BAL rating',
      'Asset Protection Zones required around buildings',
      'Vegetation management conditions',
      'Access and egress requirements for emergency vehicles',
    ],
    requiredAssessments: [
      'Bushfire Attack Level (BAL) Assessment',
      'Bushfire Management Plan (subdivisions)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Bushfire Overlay Code',
      'AS3959-2018',
      'State Planning Policy - Natural Hazards',
    ],
    approvalImpact: 'Code assessable if compliant with acceptable outcomes',
    costRange: { min: 2000, max: 15000 },
    typicalDelay: 2,
    referralAgencies: ['Queensland Fire and Emergency Services'],
  },
  {
    layerId: 'brisbane-landslide',
    name: 'Landslide Overlay',
    severity: 'high',
    summary: 'Property has identified landslide susceptibility requiring geotechnical assessment.',
    implications: [
      'Geotechnical assessment required before development',
      'Building design must address slope stability',
      'Retaining wall certification required',
      'Surface and subsurface drainage critical',
      'May limit building footprint location',
    ],
    requiredAssessments: [
      'Geotechnical Assessment',
      'Slope Stability Assessment',
      'Retaining Wall Design (if required)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Landslide Overlay Code',
      'Building Act 1975',
    ],
    approvalImpact: 'Code assessable with geotechnical compliance',
    costRange: { min: 3000, max: 25000 },
    typicalDelay: 4,
  },
  {
    layerId: 'brisbane-storm-tide',
    name: 'Storm Tide Inundation Area',
    severity: 'high',
    summary: 'Property is subject to coastal storm tide inundation.',
    implications: [
      'Minimum floor levels based on storm tide + sea level rise',
      'Structural design for water and wave action',
      'Salt-resistant materials required',
      'Evacuation planning for vulnerable uses',
    ],
    requiredAssessments: [
      'Coastal Hazard Assessment',
      'Structural Engineering Assessment',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Coastal Hazard Overlay Code',
      'State Planning Policy - Coastal Environment',
    ],
    approvalImpact: 'Code or impact assessable depending on hazard level',
    costRange: { min: 3000, max: 20000 },
    typicalDelay: 4,
  },

  // ============================================================================
  // PLANNING CONTROLS
  // ============================================================================
  {
    layerId: 'brisbane-building-height',
    name: 'Building Height Overlay',
    severity: 'medium',
    summary: 'Property has specific building height limits under the City Plan.',
    implications: [
      'Maximum building height is prescribed (storeys and metres)',
      'Height may vary across the site based on mapping',
      'Performance outcomes available for height variations',
      'Must consider relationship to adjoining properties',
    ],
    requiredAssessments: [
      'Shadow Impact Assessment (if seeking height variation)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Building Height Overlay Code',
    ],
    approvalImpact: 'Code assessable if within limits, impact assessable for variations',
    costRange: { min: 0, max: 5000 },
    typicalDelay: 0,
  },
  {
    layerId: 'brisbane-character-residential',
    name: 'Traditional Building Character Overlay',
    severity: 'medium',
    summary: 'Property is within a traditional building character (pre-1946) area with demolition controls.',
    implications: [
      'Demolition of pre-1946 buildings requires approval',
      'New buildings must be sympathetic to traditional character',
      'Design guidelines apply for setbacks, roof forms, materials',
      'Character assessment required for development',
      'Removal of character features restricted',
    ],
    requiredAssessments: [
      'Traditional Building Character Assessment',
      'Heritage Impact Statement (if demolition proposed)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Traditional Building Character Overlay Code',
    ],
    affectedDevelopment: ['Demolition', 'New dwellings', 'Major alterations'],
    approvalImpact: 'Impact assessable for demolition of pre-1946 buildings',
    costRange: { min: 2000, max: 10000 },
    typicalDelay: 4,
    resourceLinks: [
      { label: 'BCC Character Residential', url: 'https://www.brisbane.qld.gov.au/planning-and-building/planning-guidelines-and-tools/character-residential' },
    ],
  },
  {
    layerId: 'brisbane-airport-environs',
    name: 'Airport Environs Overlay',
    severity: 'medium',
    summary: 'Property is affected by airport operations including noise, height, and lighting controls.',
    implications: [
      'Building height restrictions apply (Obstacle Limitation Surface)',
      'Aircraft noise attenuation required for habitable rooms',
      'Outdoor lighting restrictions near flight paths',
      'Bird and wildlife attractant controls',
      'May affect use types permitted',
    ],
    requiredAssessments: [
      'Acoustic Assessment (ANEF 20+)',
      'Building Height Assessment against OLS',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Airport Environs Overlay Code',
      'Airports Act 1996 (Cth)',
      'AS2021-2015 Acoustics - Aircraft Noise Intrusion',
    ],
    affectedDevelopment: ['Residential', 'Accommodation', 'Childcare', 'Schools', 'Hospitals'],
    approvalImpact: 'Code assessable with acoustic compliance',
    costRange: { min: 2000, max: 15000 },
    typicalDelay: 2,
    referralAgencies: ['Brisbane Airport Corporation', 'Airservices Australia (height referral)'],
  },
  {
    layerId: 'brisbane-transport-noise',
    name: 'Transport Noise Corridor',
    severity: 'low',
    summary: 'Property is affected by road or rail transport noise requiring acoustic treatment.',
    implications: [
      'Acoustic assessment required for sensitive uses',
      'Building design must achieve internal noise criteria',
      'Mechanical ventilation may be required',
      'Outdoor living areas siting considerations',
    ],
    requiredAssessments: [
      'Acoustic Assessment',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Transport Noise Corridor Overlay Code',
      'Queensland Development Code MP4.4',
    ],
    affectedDevelopment: ['Residential', 'Accommodation', 'Childcare', 'Educational'],
    approvalImpact: 'Code assessable with acoustic compliance',
    costRange: { min: 1500, max: 8000 },
    typicalDelay: 2,
  },
  {
    layerId: 'brisbane-extractive-resources',
    name: 'Extractive Resources Overlay',
    severity: 'medium',
    summary: 'Property is within or adjacent to a key extractive resource area (quarry).',
    implications: [
      'Sensitive uses may be restricted near quarry operations',
      'Separation distances apply',
      'Acoustic and dust considerations',
      'Must not compromise future resource extraction',
    ],
    requiredAssessments: [
      'Acoustic Assessment (if sensitive use)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Extractive Resources Overlay Code',
    ],
    approvalImpact: 'Impact assessable for sensitive uses within separation area',
    costRange: { min: 0, max: 5000 },
    typicalDelay: 2,
  },
  {
    layerId: 'brisbane-special-entertainment',
    name: 'Special Entertainment Precinct',
    severity: 'info',
    summary: 'Property is within Fortitude Valley Special Entertainment Precinct with relaxed noise controls.',
    implications: [
      'Entertainment venues have relaxed noise emission limits',
      'Residential development must provide high acoustic attenuation',
      'New residential must accept existing noise environment',
      'Reverse sensitivity provisions apply',
    ],
    requiredAssessments: [
      'Acoustic Assessment (residential development)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Special Entertainment Precinct Overlay Code',
    ],
    approvalImpact: 'Code assessable with acoustic compliance',
    costRange: { min: 2000, max: 10000 },
    typicalDelay: 2,
  },

  // ============================================================================
  // ENVIRONMENT
  // ============================================================================
  {
    layerId: 'brisbane-biodiversity',
    name: 'Biodiversity Areas Overlay',
    severity: 'high',
    summary: 'Property contains areas of ecological significance requiring protection.',
    implications: [
      'Vegetation clearing restrictions apply',
      'Development setbacks from significant vegetation',
      'Ecological assessment required',
      'Rehabilitation or offset conditions likely',
      'Stormwater quality requirements',
    ],
    requiredAssessments: [
      'Ecological Assessment',
      'Vegetation Management Plan',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Biodiversity Areas Overlay Code',
      'Vegetation Management Act 1999',
    ],
    approvalImpact: 'Code assessable if avoiding impacts, impact assessable for clearing',
    costRange: { min: 3000, max: 30000 },
    typicalDelay: 6,
    referralAgencies: ['Department of Environment and Science (if MSES triggered)'],
  },
  {
    layerId: 'brisbane-koala-habitat',
    name: 'Koala Habitat Areas',
    severity: 'high',
    summary: 'Property contains mapped koala habitat requiring protection measures.',
    implications: [
      'Koala habitat tree clearing restrictions',
      'Fauna-sensitive road and fence design',
      'Koala-safe pool fencing required',
      'Dog restrictions in new residential',
      'Habitat connectivity requirements',
    ],
    requiredAssessments: [
      'Koala Habitat Assessment',
      'Ecological Assessment',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Biodiversity Areas Overlay Code',
      'Nature Conservation Act 1992',
      'SEQ Koala Conservation Strategy',
    ],
    approvalImpact: 'May require state referral for koala habitat clearing',
    costRange: { min: 5000, max: 40000 },
    typicalDelay: 8,
    referralAgencies: ['Department of Environment and Science'],
  },
  {
    layerId: 'brisbane-waterway-corridor',
    name: 'Waterway Corridors Overlay',
    severity: 'medium',
    summary: 'Property contains or adjoins a natural waterway corridor requiring setbacks.',
    implications: [
      'Building setbacks from waterway required',
      'Riparian vegetation protection',
      'Stormwater treatment before discharge',
      'May require waterway rehabilitation',
      'Limited filling and excavation within corridor',
    ],
    requiredAssessments: [
      'Waterway Assessment',
      'Stormwater Management Plan',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Waterway Corridors Overlay Code',
      'Environmental Protection Act 1994',
    ],
    approvalImpact: 'Code assessable with setback compliance',
    costRange: { min: 2000, max: 15000 },
    typicalDelay: 3,
  },
  {
    layerId: 'brisbane-scenic-amenity',
    name: 'Scenic Amenity Overlay',
    severity: 'low',
    summary: 'Property is within an area of scenic or visual amenity value.',
    implications: [
      'Building design to minimise visual impact',
      'Colours and materials to blend with landscape',
      'Ridge line development restrictions',
      'Vegetation retention for screening',
    ],
    requiredAssessments: [
      'Visual Impact Assessment (significant development)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Scenic Amenity Overlay Code',
    ],
    approvalImpact: 'Generally code assessable with design compliance',
    costRange: { min: 0, max: 5000 },
    typicalDelay: 1,
  },

  // ============================================================================
  // HERITAGE
  // ============================================================================
  {
    layerId: 'brisbane-heritage',
    name: 'Heritage Overlay',
    severity: 'high',
    summary: 'Property is a local heritage place or adjoins one, requiring heritage consideration.',
    implications: [
      'Works to heritage buildings require approval',
      'Demolition of heritage buildings generally prohibited',
      'New development must be sympathetic to heritage values',
      'Internal alterations may also require approval',
      'Archaeological potential may exist',
    ],
    requiredAssessments: [
      'Heritage Impact Assessment',
      'Conservation Management Plan (significant items)',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Heritage Overlay Code',
      'Queensland Heritage Act 1992',
    ],
    approvalImpact: 'Impact assessable for works to heritage items',
    costRange: { min: 3000, max: 20000 },
    typicalDelay: 6,
    referralAgencies: ['Heritage Queensland (State heritage items)'],
    resourceLinks: [
      { label: 'BCC Heritage Register', url: 'https://www.brisbane.qld.gov.au/planning-and-building/heritage-character-and-design/heritage' },
    ],
  },

  // ============================================================================
  // ADDITIONAL OVERLAYS
  // ============================================================================
  {
    layerId: 'brisbane-acid-sulfate-soils',
    name: 'Acid Sulfate Soils Overlay',
    severity: 'medium',
    summary: 'Property contains potential or actual acid sulfate soils requiring management.',
    implications: [
      'Soil testing required before excavation below specified depths',
      'Acid Sulfate Soil Management Plan required for significant disturbance',
      'Treatment and neutralisation costs for disturbed soils',
      'Ongoing monitoring and reporting conditions',
      'Groundwater impact assessment may be required',
    ],
    requiredAssessments: [
      'Preliminary Acid Sulfate Soil Investigation',
      'Detailed ASS Investigation (if triggered)',
      'Acid Sulfate Soil Management Plan',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Acid Sulfate Soils Overlay Code',
      'State Planning Policy - Water Quality',
      'Environmental Protection Act 1994',
    ],
    approvalImpact: 'Code assessable with management plan',
    costRange: { min: 3000, max: 40000 },
    typicalDelay: 2,
  },
  {
    layerId: 'brisbane-dwelling-house',
    name: 'Dwelling House Overlay',
    severity: 'low',
    summary: 'Property is in an area where dwelling house character is protected.',
    implications: [
      'New dwelling houses have specific design requirements',
      'Secondary dwellings may have restrictions',
      'Building setbacks and site cover requirements',
      'Front boundary landscaping requirements',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Dwelling House Overlay Code',
    ],
    approvalImpact: 'Generally accepted development or code assessable',
    costRange: { min: 0, max: 2000 },
    typicalDelay: 0,
  },
  {
    layerId: 'brisbane-short-term-accommodation',
    name: 'Short Term Accommodation Overlay',
    severity: 'medium',
    summary: 'Property is in an area where short term accommodation (Airbnb) is restricted.',
    implications: [
      'Short term accommodation requires development approval',
      'May be prohibited in certain residential areas',
      'Conditions on maximum guests and operating hours',
      'Parking requirements may apply',
      'Neighbour amenity considerations',
    ],
    legislation: [
      'Brisbane City Plan 2014 - Short Term Accommodation Overlay Code',
    ],
    affectedDevelopment: ['Short term accommodation', 'Airbnb', 'Holiday letting'],
    approvalImpact: 'Code assessable - requires approval where overlay applies',
    costRange: { min: 1000, max: 5000 },
    typicalDelay: 6,
  },
];

/**
 * Planning implications for NSW overlay layers
 */
export const NSW_PLANNING_IMPLICATIONS: PlanningImplication[] = [
  {
    layerId: 'nsw-bushfire-prone',
    name: 'Bush Fire Prone Land',
    severity: 'high',
    summary: 'Property is classified as Bush Fire Prone Land requiring integrated development assessment.',
    implications: [
      'Bush Fire Safety Authority (BFSA) required from NSW RFS',
      'Development must comply with Planning for Bush Fire Protection 2019',
      'Asset Protection Zones (APZ) required around buildings',
      'Construction standards per AS3959',
    ],
    requiredAssessments: [
      'Bush Fire Assessment Report',
      'Bush Fire Safety Authority application',
    ],
    legislation: [
      'Environmental Planning and Assessment Act 1979',
      'Rural Fires Act 1997',
      'Planning for Bush Fire Protection 2019',
    ],
    approvalImpact: 'Integrated development requiring RFS concurrence',
    costRange: { min: 3000, max: 20000 },
    typicalDelay: 6,
    referralAgencies: ['NSW Rural Fire Service'],
  },
  {
    layerId: 'nsw-flood-planning',
    name: 'Flood Planning Area',
    severity: 'high',
    summary: 'Property is within the Flood Planning Area defined in the LEP.',
    implications: [
      'Minimum floor levels apply (FPL = 1% AEP + freeboard)',
      'Flood compatible building materials below FPL',
      'Merit assessment required for flood impact',
      'Some land uses restricted based on flood risk',
    ],
    requiredAssessments: [
      'Flood Study/Assessment',
      'Survey confirming finished floor levels',
    ],
    legislation: [
      'NSW Floodplain Development Manual',
      'Local Environmental Plan - Flood Planning clause',
    ],
    approvalImpact: 'Development subject to flood planning provisions in LEP',
    costRange: { min: 2000, max: 15000 },
    typicalDelay: 4,
  },
  {
    layerId: 'nsw-heritage-conservation',
    name: 'Heritage Conservation Area',
    severity: 'medium',
    summary: 'Property is within a Heritage Conservation Area requiring sympathetic development.',
    implications: [
      'Development must be compatible with heritage character',
      'Heritage Impact Statement may be required',
      'External alterations require consent',
      'Demolition restricted',
    ],
    requiredAssessments: ['Heritage Impact Statement'],
    legislation: [
      'Heritage Act 1977',
      'Local Environmental Plan - Heritage provisions',
    ],
    approvalImpact: 'Development subject to heritage provisions, may require Heritage Council input',
    costRange: { min: 2000, max: 10000 },
    typicalDelay: 4,
    referralAgencies: ['Heritage NSW (for State significant items)'],
  },
  {
    layerId: 'nsw-biodiversity',
    name: 'Biodiversity Values Map',
    severity: 'high',
    summary: 'Property triggers the Biodiversity Offsets Scheme due to mapped biodiversity values.',
    implications: [
      'Biodiversity Development Assessment Report (BDAR) required',
      'Avoid and minimise impacts on native vegetation',
      'Offset obligation for unavoidable impacts',
      'Retirement of biodiversity credits required',
    ],
    requiredAssessments: [
      'Biodiversity Development Assessment Report (BDAR)',
    ],
    legislation: [
      'Biodiversity Conservation Act 2016',
      'Biodiversity Offsets Scheme',
    ],
    approvalImpact: 'Subject to Biodiversity Offsets Scheme',
    costRange: { min: 10000, max: 200000 },
    typicalDelay: 8,
    referralAgencies: ['Biodiversity and Conservation Division'],
  },
  {
    layerId: 'nsw-koala-sepp',
    name: 'Koala SEPP Area',
    severity: 'high',
    summary: 'Property is subject to Koala SEPP provisions for habitat protection.',
    implications: [
      'Koala Assessment of Significance required',
      'Koala habitat trees protected',
      'Development design must accommodate koala movement',
      'Koala Plan of Management may be required',
    ],
    requiredAssessments: [
      'Koala Assessment of Significance',
      'Koala Plan of Management (if triggered)',
    ],
    legislation: [
      'State Environmental Planning Policy (Biodiversity and Conservation) 2021 - Koala Habitat Protection',
    ],
    approvalImpact: 'Must address Koala SEPP provisions',
    costRange: { min: 5000, max: 30000 },
    typicalDelay: 6,
  },
];

/**
 * All planning implications combined
 */
export const ALL_PLANNING_IMPLICATIONS: PlanningImplication[] = [
  ...QLD_PLANNING_IMPLICATIONS,
  ...BRISBANE_PLANNING_IMPLICATIONS,
  ...NSW_PLANNING_IMPLICATIONS,
];

/**
 * Get planning implications for a layer
 */
export function getPlanningImplication(layerId: string): PlanningImplication | undefined {
  return ALL_PLANNING_IMPLICATIONS.find((impl) => impl.layerId === layerId);
}

/**
 * Get all planning implications for multiple layers
 */
export function getPlanningImplications(layerIds: string[]): PlanningImplication[] {
  return layerIds
    .map((id) => ALL_PLANNING_IMPLICATIONS.find((impl) => impl.layerId === id))
    .filter((impl): impl is PlanningImplication => impl !== undefined);
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#d97706',
    low: '#2563eb',
    info: '#6b7280',
  };
  return colors[severity];
}

/**
 * Calculate total cost estimate from multiple implications
 */
export function estimateTotalCost(implications: PlanningImplication[]): { min: number; max: number } {
  return implications.reduce(
    (acc, impl) => ({
      min: acc.min + (impl.costRange?.min || 0),
      max: acc.max + (impl.costRange?.max || 0),
    }),
    { min: 0, max: 0 }
  );
}

/**
 * Calculate total delay estimate
 */
export function estimateTotalDelay(implications: PlanningImplication[]): number {
  // Take the maximum delay as they often run in parallel
  return Math.max(...implications.map((impl) => impl.typicalDelay || 0), 0);
}

/**
 * Get unique referral agencies across all implications
 */
export function getRequiredReferrals(implications: PlanningImplication[]): string[] {
  const agencies = new Set<string>();
  implications.forEach((impl) => {
    impl.referralAgencies?.forEach((agency) => agencies.add(agency));
  });
  return Array.from(agencies);
}

/**
 * Get unique required assessments across all implications
 */
export function getRequiredAssessments(implications: PlanningImplication[]): string[] {
  const assessments = new Set<string>();
  implications.forEach((impl) => {
    impl.requiredAssessments?.forEach((assessment) => assessments.add(assessment));
  });
  return Array.from(assessments);
}
