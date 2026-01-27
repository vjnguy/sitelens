-- Siteora GIS Platform Schema
-- Migration 002: GIS-specific tables for projects, layers, datasets, and AI

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  bounds JSONB, -- Bounding box: { west, south, east, north }
  settings JSONB DEFAULT '{}'::jsonb, -- { defaultCenter, defaultZoom, basemap }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Layers table
CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vector', 'raster', 'api')),
  source_type TEXT NOT NULL CHECK (source_type IN ('geojson', 'tiles', 'wms', 'wfs', 'api', 'file')),
  source_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- { url, data, apiEndpoint, apiParams }
  style JSONB DEFAULT '{}'::jsonb, -- { type, paint, layout, filter }
  visible BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional layer metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Datasets table (uploaded/imported data)
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('geojson', 'shapefile', 'csv', 'kml', 'geopackage', 'other')),
  storage_path TEXT, -- Path in Supabase storage
  file_size BIGINT,
  metadata JSONB DEFAULT '{}'::jsonb, -- { featureCount, geometryType, properties, bounds, crs }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data sources (external API connections)
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api', 'wms', 'wfs', 'tiles', 'database')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- { baseUrl, apiKey, headers, queryParams, refreshInterval }
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis scripts (user code)
CREATE TABLE IF NOT EXISTS analysis_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT DEFAULT 'javascript' CHECK (language IN ('javascript', 'python')),
  is_protected BOOLEAN DEFAULT false, -- Protected scripts can't be modified
  last_run TIMESTAMPTZ,
  last_result JSONB, -- Last execution result
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb, -- Array of { role, content, timestamp, metadata }
  context JSONB DEFAULT '{}'::jsonb, -- Conversation context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Property searches/lookups cache
CREATE TABLE IF NOT EXISTS property_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  query_type TEXT NOT NULL CHECK (query_type IN ('address', 'lot_plan', 'coordinates', 'polygon')),
  results JSONB DEFAULT '[]'::jsonb, -- Cached search results
  source TEXT, -- API source used
  expires_at TIMESTAMPTZ, -- Cache expiration
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial bookmarks
CREATE TABLE IF NOT EXISTS spatial_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  center JSONB NOT NULL, -- [lng, lat]
  zoom NUMERIC NOT NULL,
  bearing NUMERIC DEFAULT 0,
  pitch NUMERIC DEFAULT 0,
  layers_state JSONB, -- Snapshot of layer visibility
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE spatial_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update projects in their organization"
  ON projects FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete projects in their organization"
  ON projects FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies for layers (through project ownership)
CREATE POLICY "Users can view layers in their projects"
  ON layers FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage layers in their projects"
  ON layers FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for datasets
CREATE POLICY "Users can view datasets in their organization"
  ON datasets FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage datasets in their organization"
  ON datasets FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies for data_sources
CREATE POLICY "Users can view data sources in their organization"
  ON data_sources FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage data sources in their organization"
  ON data_sources FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies for analysis_scripts
CREATE POLICY "Users can view scripts in their projects"
  ON analysis_scripts FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage scripts in their projects"
  ON analysis_scripts FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for ai_conversations
CREATE POLICY "Users can view their own AI conversations"
  ON ai_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own AI conversations"
  ON ai_conversations FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for property_searches
CREATE POLICY "Users can view property searches in their organization"
  ON property_searches FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create property searches"
  ON property_searches FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS Policies for spatial_bookmarks
CREATE POLICY "Users can view bookmarks in their projects"
  ON spatial_bookmarks FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage their own bookmarks"
  ON spatial_bookmarks FOR ALL
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_layers_project ON layers(project_id);
CREATE INDEX IF NOT EXISTS idx_layers_order ON layers(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_datasets_organization ON datasets(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_organization ON data_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_analysis_scripts_project ON analysis_scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_property_searches_organization ON property_searches(organization_id);
CREATE INDEX IF NOT EXISTS idx_property_searches_expires ON property_searches(expires_at);
CREATE INDEX IF NOT EXISTS idx_spatial_bookmarks_project ON spatial_bookmarks(project_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_layers_updated_at
  BEFORE UPDATE ON layers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_scripts_updated_at
  BEFORE UPDATE ON analysis_scripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for GIS files
INSERT INTO storage.buckets (id, name, public)
VALUES ('gis-files', 'gis-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for GIS files
CREATE POLICY "Users can upload GIS files to their organization"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gis-files' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view GIS files in their organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'gis-files' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete GIS files in their organization"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gis-files' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );
