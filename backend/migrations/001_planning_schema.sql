-- Siteora Planning Data Schema
-- Run this in Supabase SQL Editor to set up the planning tables

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- PLANNING ZONES TABLE
-- Stores zoning polygons for all states
-- ============================================================================
CREATE TABLE IF NOT EXISTS planning_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(3) NOT NULL,  -- NSW, QLD, VIC, etc.
    zone_code VARCHAR(20) NOT NULL,  -- R2, B1, SP1, etc.
    zone_name VARCHAR(255) NOT NULL,  -- Low Density Residential, etc.
    zone_category VARCHAR(50),  -- residential, commercial, industrial, rural, etc.
    description TEXT,
    permitted_uses TEXT[],
    prohibited_uses TEXT[],
    objectives TEXT[],
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    lga_name VARCHAR(255),
    lga_code VARCHAR(20),
    source_url TEXT,
    source_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for fast lookups
CREATE INDEX IF NOT EXISTS idx_planning_zones_geometry ON planning_zones USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_planning_zones_state ON planning_zones (state);
CREATE INDEX IF NOT EXISTS idx_planning_zones_code ON planning_zones (zone_code);

-- ============================================================================
-- DEVELOPMENT CONTROLS TABLE
-- Stores height limits, FSR, lot sizes by zone/area
-- ============================================================================
CREATE TABLE IF NOT EXISTS development_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(3) NOT NULL,
    zone_code VARCHAR(20),  -- Can be null if controls apply to specific area
    control_type VARCHAR(50) NOT NULL,  -- height, fsr, lot_size, setback, etc.
    control_name VARCHAR(255) NOT NULL,
    min_value DECIMAL(10, 2),
    max_value DECIMAL(10, 2),
    unit VARCHAR(20),  -- m, sqm, ratio, %
    conditions JSONB,  -- Additional conditions for this control
    geometry GEOMETRY(MultiPolygon, 4326),  -- Optional spatial extent
    lga_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_controls_geometry ON development_controls USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_dev_controls_state ON development_controls (state);
CREATE INDEX IF NOT EXISTS idx_dev_controls_type ON development_controls (control_type);
CREATE INDEX IF NOT EXISTS idx_dev_controls_zone ON development_controls (zone_code);

-- ============================================================================
-- HAZARD OVERLAYS TABLE
-- Stores flood, bushfire, coastal erosion overlays
-- ============================================================================
CREATE TABLE IF NOT EXISTS hazard_overlays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(3) NOT NULL,
    hazard_type VARCHAR(50) NOT NULL,  -- flood, bushfire, coastal_erosion, landslide, etc.
    hazard_category VARCHAR(100),  -- 1_in_100, flame_zone, high_risk, etc.
    hazard_level VARCHAR(20),  -- low, medium, high, extreme
    name VARCHAR(255),
    description TEXT,
    planning_implications TEXT[],  -- What this means for development
    required_assessments TEXT[],  -- Reports/studies required
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    lga_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hazard_overlays_geometry ON hazard_overlays USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_hazard_overlays_state ON hazard_overlays (state);
CREATE INDEX IF NOT EXISTS idx_hazard_overlays_type ON hazard_overlays (hazard_type);

-- ============================================================================
-- HERITAGE ITEMS TABLE
-- Stores state and local heritage listings
-- ============================================================================
CREATE TABLE IF NOT EXISTS heritage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(3) NOT NULL,
    heritage_type VARCHAR(50) NOT NULL,  -- state, local, aboriginal, etc.
    listing_name VARCHAR(500) NOT NULL,
    listing_number VARCHAR(50),
    significance VARCHAR(50),  -- state, local, national
    description TEXT,
    address TEXT,
    planning_implications TEXT[],
    geometry GEOMETRY(Geometry, 4326),  -- Can be point, polygon, or multipolygon
    lga_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heritage_items_geometry ON heritage_items USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_heritage_items_state ON heritage_items (state);
CREATE INDEX IF NOT EXISTS idx_heritage_items_type ON heritage_items (heritage_type);

-- ============================================================================
-- ENVIRONMENTAL OVERLAYS TABLE
-- Stores vegetation, biodiversity, wetlands, etc.
-- ============================================================================
CREATE TABLE IF NOT EXISTS environmental_overlays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(3) NOT NULL,
    overlay_type VARCHAR(50) NOT NULL,  -- vegetation, biodiversity, wetland, koala_habitat, etc.
    overlay_category VARCHAR(100),
    name VARCHAR(255),
    description TEXT,
    planning_implications TEXT[],
    required_assessments TEXT[],
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    lga_name VARCHAR(255),
    source_url TEXT,
    source_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_env_overlays_geometry ON environmental_overlays USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_env_overlays_state ON environmental_overlays (state);
CREATE INDEX IF NOT EXISTS idx_env_overlays_type ON environmental_overlays (overlay_type);

-- ============================================================================
-- PROPERTY REPORTS TABLE
-- Stores generated property reports for caching/retrieval
-- ============================================================================
CREATE TABLE IF NOT EXISTS property_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lon DECIMAL(10, 7) NOT NULL,
    state VARCHAR(3) NOT NULL,
    lot_plan VARCHAR(50),
    report_data JSONB NOT NULL,  -- Full analysis data
    pdf_url TEXT,  -- Supabase storage URL for PDF
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

CREATE INDEX IF NOT EXISTS idx_property_reports_user ON property_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_property_reports_location ON property_reports (lat, lon);
CREATE INDEX IF NOT EXISTS idx_property_reports_created ON property_reports (created_at);

-- ============================================================================
-- SAVED SITES TABLE
-- Stores user's saved properties
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 7) NOT NULL,
    lon DECIMAL(10, 7) NOT NULL,
    state VARCHAR(3) NOT NULL,
    lot_plan VARCHAR(50),
    geometry GEOMETRY(Polygon, 4326),
    notes TEXT,
    tags TEXT[],
    property_data JSONB,  -- Cached property data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_sites_user ON saved_sites (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sites_geometry ON saved_sites USING GIST (geometry);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================
-- Enable RLS on user-specific tables
ALTER TABLE property_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_sites ENABLE ROW LEVEL SECURITY;

-- Property reports: users can only see their own
CREATE POLICY "Users can view own reports" ON property_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON property_reports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved sites: users can only manage their own
CREATE POLICY "Users can view own sites" ON saved_sites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sites" ON saved_sites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sites" ON saved_sites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sites" ON saved_sites
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get zone at a point
CREATE OR REPLACE FUNCTION get_zone_at_point(
    p_lon DECIMAL,
    p_lat DECIMAL,
    p_state VARCHAR(3) DEFAULT NULL
)
RETURNS TABLE (
    zone_code VARCHAR(20),
    zone_name VARCHAR(255),
    zone_category VARCHAR(50),
    description TEXT,
    permitted_uses TEXT[],
    lga_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pz.zone_code,
        pz.zone_name,
        pz.zone_category,
        pz.description,
        pz.permitted_uses,
        pz.lga_name
    FROM planning_zones pz
    WHERE ST_Contains(pz.geometry, ST_SetSRID(ST_Point(p_lon, p_lat), 4326))
    AND (p_state IS NULL OR pz.state = p_state)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get all overlays at a point
CREATE OR REPLACE FUNCTION get_overlays_at_point(
    p_lon DECIMAL,
    p_lat DECIMAL,
    p_state VARCHAR(3) DEFAULT NULL
)
RETURNS TABLE (
    overlay_type VARCHAR(50),
    overlay_name VARCHAR(255),
    overlay_category VARCHAR(100),
    overlay_level VARCHAR(20),
    planning_implications TEXT[],
    source_table VARCHAR(50)
) AS $$
BEGIN
    -- Hazard overlays
    RETURN QUERY
    SELECT
        ho.hazard_type,
        ho.name,
        ho.hazard_category,
        ho.hazard_level,
        ho.planning_implications,
        'hazard_overlays'::VARCHAR(50)
    FROM hazard_overlays ho
    WHERE ST_Contains(ho.geometry, ST_SetSRID(ST_Point(p_lon, p_lat), 4326))
    AND (p_state IS NULL OR ho.state = p_state);

    -- Environmental overlays
    RETURN QUERY
    SELECT
        eo.overlay_type,
        eo.name,
        eo.overlay_category,
        NULL::VARCHAR(20),
        eo.planning_implications,
        'environmental_overlays'::VARCHAR(50)
    FROM environmental_overlays eo
    WHERE ST_Contains(eo.geometry, ST_SetSRID(ST_Point(p_lon, p_lat), 4326))
    AND (p_state IS NULL OR eo.state = p_state);
END;
$$ LANGUAGE plpgsql;

-- Function to get development controls at a point
CREATE OR REPLACE FUNCTION get_controls_at_point(
    p_lon DECIMAL,
    p_lat DECIMAL,
    p_zone_code VARCHAR(20) DEFAULT NULL,
    p_state VARCHAR(3) DEFAULT NULL
)
RETURNS TABLE (
    control_type VARCHAR(50),
    control_name VARCHAR(255),
    min_value DECIMAL(10, 2),
    max_value DECIMAL(10, 2),
    unit VARCHAR(20),
    conditions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.control_type,
        dc.control_name,
        dc.min_value,
        dc.max_value,
        dc.unit,
        dc.conditions
    FROM development_controls dc
    WHERE (
        -- Match by zone code
        (dc.zone_code = p_zone_code)
        OR
        -- Match by spatial extent
        (dc.geometry IS NOT NULL AND ST_Contains(dc.geometry, ST_SetSRID(ST_Point(p_lon, p_lat), 4326)))
    )
    AND (p_state IS NULL OR dc.state = p_state);
END;
$$ LANGUAGE plpgsql;

-- Function to get heritage items near a point
CREATE OR REPLACE FUNCTION get_heritage_near_point(
    p_lon DECIMAL,
    p_lat DECIMAL,
    p_radius_m INTEGER DEFAULT 100,
    p_state VARCHAR(3) DEFAULT NULL
)
RETURNS TABLE (
    heritage_type VARCHAR(50),
    listing_name VARCHAR(500),
    listing_number VARCHAR(50),
    significance VARCHAR(50),
    distance_m DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hi.heritage_type,
        hi.listing_name,
        hi.listing_number,
        hi.significance,
        ST_Distance(
            hi.geometry::geography,
            ST_SetSRID(ST_Point(p_lon, p_lat), 4326)::geography
        )::DECIMAL as distance_m
    FROM heritage_items hi
    WHERE ST_DWithin(
        hi.geometry::geography,
        ST_SetSRID(ST_Point(p_lon, p_lat), 4326)::geography,
        p_radius_m
    )
    AND (p_state IS NULL OR hi.state = p_state)
    ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;
