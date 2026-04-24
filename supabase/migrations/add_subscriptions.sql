-- Platform subscription plans (seed data)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL,
  interval TEXT DEFAULT 'month',
  stripe_price_id TEXT,
  features JSONB DEFAULT '[]'
);

INSERT INTO subscription_plans (id, name, description, price_cents, features) VALUES
  ('explorer', 'Explorer', 'Monatlicher KI-Duft & Early Access', 999, '["Monatliche KI-Duft-Empfehlung","Early Access zu neuen Drops","Erweitertes Review-System","Personalisierter Feed Priority"]'),
  ('collector', 'Collector', 'Physisches 30ml Sample jeden Monat', 2499, '["Alles aus Explorer","Monatliches 30ml Sample (versandt)","2× Loyalty-Punkte","Exklusive Creator-Drops"]'),
  ('connoisseur', 'Connoisseur', 'Das vollständige Fragrance OS Erlebnis', 4999, '["Alles aus Collector","50ml Creator-kuratierter Duft / Monat","Exklusive Community","Priorisierter Support","Loyalty-Punkte 3×"]')
ON CONFLICT (id) DO NOTHING;

-- User platform subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Creator subscription plans
CREATE TABLE IF NOT EXISTS creator_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Fan-Abo',
  description TEXT,
  price_cents INT NOT NULL DEFAULT 499,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  benefits JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  subscriber_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(creator_id)
);

-- Creator subscriptions (user → creator)
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES creator_subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subscriber_id, creator_id)
);

-- Loyalty points
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'purchase', 'subscription', 'review', 'bonus'
  points INT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add stripe_customer_id to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own creator subs" ON creator_subscriptions FOR SELECT USING (auth.uid() = subscriber_id);
CREATE POLICY IF NOT EXISTS "Creators see their subs" ON creator_subscriptions FOR SELECT USING (auth.uid() = creator_id);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own points" ON loyalty_points FOR SELECT USING (auth.uid() = user_id);
