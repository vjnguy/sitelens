-- ============================================================================
-- DEMO REQUESTS TABLE
-- Captures demo/access requests from landing page
-- ============================================================================

CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  occupation TEXT,

  -- Optional company info
  company TEXT,
  phone TEXT,

  -- Request status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'converted', 'rejected')),

  -- Notes from admin
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS demo_requests_status_idx ON demo_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS demo_requests_email_idx ON demo_requests (email);

-- Enable RLS
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (from landing page)
CREATE POLICY "Anyone can create demo requests" ON demo_requests
  FOR INSERT WITH CHECK (true);

-- Only admins can view/update (via service role key or admin check)
CREATE POLICY "Admins can view demo requests" ON demo_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update demo requests" ON demo_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.user_type = 'admin'
    )
  );
