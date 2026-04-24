-- Likes (schnelles Herz ohne Review)
CREATE TABLE IF NOT EXISTS fragrance_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_id UUID NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fragrance_id, user_id)
);

ALTER TABLE fragrance_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users manage own likes" ON fragrance_likes
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Anyone can read like counts" ON fragrance_likes
  FOR SELECT USING (true);

-- Loyalty-Punkte Gesamtstand (Materialized View-ähnlich via Tabelle)
CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own points" ON loyalty_points
  FOR SELECT USING (auth.uid() = user_id);

-- Loyalty-Events Log
CREATE TABLE IF NOT EXISTS loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'purchase', 'subscription', 'review', 'bonus'
  points INT NOT NULL,
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE loyalty_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users see own loyalty events" ON loyalty_events
  FOR SELECT USING (auth.uid() = user_id);
