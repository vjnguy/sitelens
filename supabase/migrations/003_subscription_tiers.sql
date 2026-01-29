-- Siteora Subscription Tiers
-- Migration 003: Add subscription tier tracking to profiles

-- Add subscription_tier column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'
CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

-- Add subscription metadata columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);

-- Comment on columns
COMMENT ON COLUMN profiles.subscription_tier IS 'User subscription tier: free, pro, or enterprise';
COMMENT ON COLUMN profiles.subscription_started_at IS 'When the current subscription started';
COMMENT ON COLUMN profiles.subscription_expires_at IS 'When the current subscription expires (null for active subscriptions)';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID';
