-- Notification subscriptions table
-- Tracks which users want to receive notifications for which maps/pin types

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  pin_types TEXT[] DEFAULT '{}', -- Empty array = all types, or specific types like ['danger', 'medical']
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate subscriptions
  UNIQUE(map_id, email)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_subs_map_id ON notification_subscriptions(map_id);
CREATE INDEX IF NOT EXISTS idx_notification_subs_active ON notification_subscriptions(is_active) WHERE is_active = true;

-- Notification log (for debugging and rate limiting)
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES notification_subscriptions(id) ON DELETE SET NULL,
  pin_id UUID REFERENCES pins(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for log queries
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER notification_subscription_updated_at
BEFORE UPDATE ON notification_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_notification_subscription_updated_at();

-- Grant permissions (adjust based on your auth setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_subscriptions TO authenticated;
-- GRANT SELECT, INSERT ON notification_log TO authenticated;
