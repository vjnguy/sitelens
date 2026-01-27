/**
 * Leads Service
 * Captures and manages development feasibility leads
 */

import { createClient } from './client';
import type { Lead, LeadInsert, SavedProperty, SavedPropertyInsert } from './types';
import type { DevelopmentPotential } from '@/lib/api/development-potential';
import type { SiteAnalysis } from '@/lib/api/qld-identify';

/**
 * Capture a lead from development analysis
 * This is the core monetization function - every subdivision analysis is a potential lead
 */
export async function captureLead(params: {
  lotPlan: string;
  address?: string;
  coordinates: [number, number];
  developmentPotential: DevelopmentPotential;
  siteAnalysis?: SiteAnalysis | null;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  reportRequested?: boolean;
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const supabase = createClient();

  const {
    lotPlan,
    address,
    coordinates,
    developmentPotential,
    siteAnalysis,
    contactEmail,
    contactPhone,
    contactName,
    reportRequested = false,
  } = params;

  // Get current user if logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Build the lead data
  const leadData: LeadInsert = {
    lot_plan: lotPlan,
    address: address || null,
    locality: developmentPotential.property.lotPlan ? extractLocality(address) : null,
    lga: siteAnalysis?.property?.lga || null,
    state: 'QLD', // TODO: detect from coordinates

    latitude: coordinates[1],
    longitude: coordinates[0],

    area_sqm: developmentPotential.property.area || null,
    zoning_code: developmentPotential.zoning?.code || null,
    zoning_description: developmentPotential.zoning?.description || null,

    // The valuable stuff
    subdivision_potential: developmentPotential.subdivision?.maxPotentialLots || null,
    min_lot_size: developmentPotential.subdivision?.minLotSize || null,
    practical_lots: developmentPotential.subdivision?.practicalLots || null,
    access_required: developmentPotential.subdivision?.accessRequired || null,

    // Services assessment
    water_available: developmentPotential.servicesAssessment?.water.available || null,
    water_distance_m: developmentPotential.servicesAssessment?.water.nearestDistance || null,
    sewer_available: developmentPotential.servicesAssessment?.sewer.available || null,
    sewer_distance_m: developmentPotential.servicesAssessment?.sewer.nearestDistance || null,
    sewer_location: developmentPotential.servicesAssessment?.sewer.location || null,
    services_feasibility: developmentPotential.servicesAssessment?.overallFeasibility || null,

    // Constraints
    constraints: siteAnalysis?.constraints?.map(c => ({
      layerId: c.layerId,
      layerName: c.layerName,
      severity: c.severity,
      category: c.category,
    })) || [],
    constraint_count: siteAnalysis?.constraints?.length || 0,
    high_severity_count: siteAnalysis?.constraints?.filter(c => c.severity === 'high').length || 0,

    // Full analysis for detailed reports
    full_analysis: {
      developmentPotential,
      constraints: siteAnalysis?.constraints,
    },

    // Source tracking
    source: 'organic',
    referrer: typeof window !== 'undefined' ? document.referrer || null : null,
    utm_source: getUrlParam('utm_source'),
    utm_medium: getUrlParam('utm_medium'),
    utm_campaign: getUrlParam('utm_campaign'),

    // User info
    user_id: user?.id || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    contact_name: contactName || null,
    report_requested: reportRequested,
  };

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to capture lead:', error);
      return { success: false, error: error.message };
    }

    return { success: true, leadId: data.id };
  } catch (err) {
    console.error('Failed to capture lead:', err);
    return { success: false, error: 'Failed to save lead' };
  }
}

/**
 * Check if a lead already exists for this property (to avoid duplicates)
 */
export async function checkExistingLead(lotPlan: string): Promise<Lead | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('lot_plan', lotPlan)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data as Lead | null;
}

/**
 * Update lead with contact info (for report request)
 */
export async function updateLeadContact(
  leadId: string,
  contact: {
    email?: string;
    phone?: string;
    name?: string;
    reportRequested?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('leads')
    .update({
      contact_email: contact.email,
      contact_phone: contact.phone,
      contact_name: contact.name,
      report_requested: contact.reportRequested ?? true,
    })
    .eq('id', leadId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Save a property for the user
 */
export async function saveProperty(params: {
  lotPlan: string;
  address?: string;
  locality?: string;
  propertyData?: unknown;
  analysisData?: unknown;
  notes?: string;
  tags?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Must be logged in to save properties' };
  }

  const saveData: SavedPropertyInsert = {
    user_id: user.id,
    lot_plan: params.lotPlan,
    address: params.address || null,
    locality: params.locality || null,
    property_data: params.propertyData || null,
    analysis_data: params.analysisData || null,
    notes: params.notes || null,
    tags: params.tags || null,
  };

  const { data, error } = await supabase
    .from('saved_properties')
    .upsert(saveData, { onConflict: 'user_id,lot_plan' })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Get saved properties for current user
 */
export async function getSavedProperties(): Promise<SavedProperty[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from('saved_properties')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (data as SavedProperty[]) || [];
}

/**
 * Delete a saved property
 */
export async function deleteSavedProperty(id: string): Promise<{ success: boolean }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('id', id);

  return { success: !error };
}

// Helper functions
function extractLocality(address?: string): string | null {
  if (!address) return null;
  // Try to extract suburb from address like "123 Smith St, Stafford QLD 4053"
  const match = address.match(/,\s*([A-Za-z\s]+?)(?:\s+(?:QLD|NSW|VIC|SA|WA|TAS|NT|ACT))?(?:\s+\d{4})?$/i);
  return match?.[1]?.trim() || null;
}

function getUrlParam(param: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}
