-- ============================================================================
-- SITEORA LEADS SCHEMA
-- Captures development feasibility leads for monetization
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  company TEXT,

  -- User type: 'buyer' (free), 'developer' (paid), 'agent', 'planner'
  user_type TEXT NOT NULL DEFAULT 'buyer' CHECK (user_type IN ('buyer', 'developer', 'agent', 'planner', 'admin')),

  -- For developers: subscription status
  subscription_status TEXT DEFAULT 'none' CHECK (subscription_status IN ('none', 'trial', 'active', 'cancelled')),
  subscription_ends_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, company, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'organization_name',
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- LEADS TABLE
-- Captures property analysis events (the gold!)
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Property identification
  lot_plan TEXT NOT NULL,
  address TEXT,
  locality TEXT,
  lga TEXT,
  state TEXT DEFAULT 'QLD',

  -- Location (for geo-queries)
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Property details
  area_sqm DOUBLE PRECISION,
  zoning_code TEXT,
  zoning_description TEXT,

  -- Development analysis results (the valuable data)
  subdivision_potential INTEGER, -- Number of lots possible
  min_lot_size INTEGER,
  practical_lots INTEGER,
  access_required BOOLEAN,

  -- Services assessment
  water_available BOOLEAN,
  water_distance_m INTEGER,
  sewer_available BOOLEAN,
  sewer_distance_m INTEGER,
  sewer_location TEXT, -- 'frontage', 'rear', 'side', etc.
  services_feasibility TEXT, -- 'straightforward', 'requires-investigation', 'challenging'

  -- Constraints summary
  constraints JSONB DEFAULT '[]'::jsonb,
  constraint_count INTEGER DEFAULT 0,
  high_severity_count INTEGER DEFAULT 0,

  -- Full analysis data (for detailed reports)
  full_analysis JSONB,

  -- Lead source tracking
  source TEXT DEFAULT 'organic', -- 'organic', 'shared_link', 'embed', 'api'
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- User who generated the lead (nullable for anonymous)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contact info (if user opted in for report)
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  report_requested BOOLEAN DEFAULT FALSE,

  -- Lead status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'contacted', 'qualified', 'converted', 'rejected')),

  -- For developers who purchased the lead
  purchased_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  purchase_price_cents INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for geo-queries (developers searching by area)
CREATE INDEX IF NOT EXISTS leads_location_idx ON leads (latitude, longitude);
CREATE INDEX IF NOT EXISTS leads_locality_idx ON leads (locality, state);
CREATE INDEX IF NOT EXISTS leads_lga_idx ON leads (lga, state);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_subdivision_idx ON leads (subdivision_potential DESC) WHERE subdivision_potential > 1;

-- ============================================================================
-- DEVELOPER SUBSCRIPTIONS
-- Areas that developers are watching for leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Developer who subscribed
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Subscription criteria (at least one required)
  localities TEXT[], -- e.g., ['Stafford', 'Chermside', 'Kedron']
  lgas TEXT[], -- e.g., ['Brisbane City']
  states TEXT[], -- e.g., ['QLD']

  -- Optional filters
  min_lots INTEGER, -- Minimum subdivision potential
  min_area_sqm DOUBLE PRECISION,
  zoning_codes TEXT[], -- e.g., ['LMR', 'MDR', 'HDR']

  -- Notification preferences
  notify_email BOOLEAN DEFAULT TRUE,
  notify_sms BOOLEAN DEFAULT FALSE,
  notify_immediately BOOLEAN DEFAULT FALSE, -- vs daily digest

  -- Subscription status
  active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_subs_developer_idx ON lead_subscriptions (developer_id, active);

-- ============================================================================
-- LEAD NOTIFICATIONS
-- Track when developers are notified about leads
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  developer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES lead_subscriptions(id) ON DELETE SET NULL,

  -- Notification details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'in_app')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  UNIQUE(lead_id, developer_id, channel)
);

-- ============================================================================
-- SAVED PROPERTIES
-- For users to save properties they're interested in
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Property identification
  lot_plan TEXT NOT NULL,
  address TEXT,
  locality TEXT,

  -- Saved data snapshot
  property_data JSONB,
  analysis_data JSONB,

  -- User notes
  notes TEXT,
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, lot_plan)
);

CREATE INDEX IF NOT EXISTS saved_props_user_idx ON saved_properties (user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Leads: anyone can insert (anonymous allowed), users can see their own
CREATE POLICY "Anyone can create leads" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

-- Developers can view leads in their subscribed areas (handled by function)
CREATE POLICY "Developers can view matching leads" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.user_type = 'developer'
      AND p.subscription_status = 'active'
    )
  );

-- Lead subscriptions: developers manage their own
CREATE POLICY "Developers manage own subscriptions" ON lead_subscriptions
  FOR ALL USING (auth.uid() = developer_id);

-- Saved properties: users manage their own
CREATE POLICY "Users manage own saved properties" ON saved_properties
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to match leads to developer subscriptions
CREATE OR REPLACE FUNCTION get_matching_developers(lead_row leads)
RETURNS TABLE(developer_id UUID, subscription_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT ls.developer_id, ls.id as subscription_id
  FROM lead_subscriptions ls
  JOIN profiles p ON p.id = ls.developer_id
  WHERE ls.active = TRUE
    AND p.subscription_status = 'active'
    AND (
      -- Match by locality
      (ls.localities IS NOT NULL AND lead_row.locality = ANY(ls.localities))
      OR
      -- Match by LGA
      (ls.lgas IS NOT NULL AND lead_row.lga = ANY(ls.lgas))
      OR
      -- Match by state (broad)
      (ls.states IS NOT NULL AND lead_row.state = ANY(ls.states) AND ls.localities IS NULL AND ls.lgas IS NULL)
    )
    -- Optional filters
    AND (ls.min_lots IS NULL OR lead_row.subdivision_potential >= ls.min_lots)
    AND (ls.min_area_sqm IS NULL OR lead_row.area_sqm >= ls.min_area_sqm)
    AND (ls.zoning_codes IS NULL OR lead_row.zoning_code = ANY(ls.zoning_codes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON lead_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_saved_props_updated_at BEFORE UPDATE ON saved_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
