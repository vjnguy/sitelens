-- Migration 004: Project Markers (Nearmap-style location pins with custom attributes)

-- Add status and tags columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnail TEXT, -- Base64 or URL to map thumbnail
  ADD COLUMN IF NOT EXISTS center JSONB, -- [lng, lat] last view center
  ADD COLUMN IF NOT EXISTS zoom NUMERIC; -- Last view zoom level

-- Project markers table (locations with custom attributes)
CREATE TABLE IF NOT EXISTS project_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location JSONB NOT NULL, -- { lng, lat }
  color TEXT DEFAULT '#3b82f6', -- Marker color
  icon TEXT DEFAULT 'map-pin', -- Icon name
  attributes JSONB DEFAULT '{}'::jsonb, -- Custom user-defined attributes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_markers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_markers
DROP POLICY IF EXISTS "Users can view markers in their projects" ON project_markers;
CREATE POLICY "Users can view markers in their projects"
  ON project_markers FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can manage markers in their projects" ON project_markers;
CREATE POLICY "Users can manage markers in their projects"
  ON project_markers FOR ALL
  USING (project_id IN (
    SELECT id FROM projects WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_markers_project ON project_markers(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_project_markers_updated_at ON project_markers;
CREATE TRIGGER update_project_markers_updated_at
  BEFORE UPDATE ON project_markers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
