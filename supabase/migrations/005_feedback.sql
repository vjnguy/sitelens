-- ============================================================================
-- FEEDBACK TABLE
-- Captures user feedback and bug reports from the app
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User info (nullable for anonymous feedback)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,

  -- Feedback content
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request', 'general')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Context
  page_url TEXT,

  -- Admin tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'wontfix')),
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback (status, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON feedback (user_id);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback
CREATE POLICY "Anyone can create feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT USING (auth.uid() = user_id);
