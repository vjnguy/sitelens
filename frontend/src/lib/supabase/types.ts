/**
 * Supabase Database Types
 * Auto-generated types for the leads system
 */

export type UserType = 'buyer' | 'developer' | 'agent' | 'planner' | 'admin';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'cancelled';
export type LeadStatus = 'new' | 'viewed' | 'contacted' | 'qualified' | 'converted' | 'rejected';
export type ServicesFeasibility = 'straightforward' | 'requires-investigation' | 'challenging';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  user_type: UserType;
  subscription_status: SubscriptionStatus;
  subscription_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;

  // Property identification
  lot_plan: string;
  address: string | null;
  locality: string | null;
  lga: string | null;
  state: string;

  // Location
  latitude: number | null;
  longitude: number | null;

  // Property details
  area_sqm: number | null;
  zoning_code: string | null;
  zoning_description: string | null;

  // Development analysis
  subdivision_potential: number | null;
  min_lot_size: number | null;
  practical_lots: number | null;
  access_required: boolean | null;

  // Services
  water_available: boolean | null;
  water_distance_m: number | null;
  sewer_available: boolean | null;
  sewer_distance_m: number | null;
  sewer_location: string | null;
  services_feasibility: ServicesFeasibility | null;

  // Constraints
  constraints: unknown[];
  constraint_count: number;
  high_severity_count: number;

  // Full analysis
  full_analysis: unknown | null;

  // Source tracking
  source: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;

  // User info
  user_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  report_requested: boolean;

  // Lead status
  status: LeadStatus;
  purchased_by: string | null;
  purchased_at: string | null;
  purchase_price_cents: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface LeadSubscription {
  id: string;
  developer_id: string;

  // Criteria
  localities: string[] | null;
  lgas: string[] | null;
  states: string[] | null;

  // Filters
  min_lots: number | null;
  min_area_sqm: number | null;
  zoning_codes: string[] | null;

  // Notifications
  notify_email: boolean;
  notify_sms: boolean;
  notify_immediately: boolean;

  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  lot_plan: string;
  address: string | null;
  locality: string | null;
  property_data: unknown | null;
  analysis_data: unknown | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

// Insert types (for creating new records)
export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'status' | 'purchased_by' | 'purchased_at' | 'purchase_price_cents'>;

export type SavedPropertyInsert = Omit<SavedProperty, 'id' | 'created_at' | 'updated_at'>;

export type LeadSubscriptionInsert = Omit<LeadSubscription, 'id' | 'created_at' | 'updated_at'>;
