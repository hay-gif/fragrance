-- ─────────────────────────────────────────────────────────────────────────────
-- CHALLENGES – Duft-Wettbewerbe mit Preisgeldern
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS challenges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text NOT NULL,
  description           text,
  accord_required       text,            -- Pflicht-Accord, z.B. "Rose" oder NULL
  prize_amount_cents    integer NOT NULL DEFAULT 0,
  prize_description     text,            -- Zusatzpreise: Logo, Badge, Feature etc.
  logo_url              text,
  rules                 text,
  start_date            date NOT NULL,
  end_date              date NOT NULL,
  max_entries           integer,
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'judging', 'ended')),
  created_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  fragrance_id    uuid NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  creator_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  is_winner       boolean NOT NULL DEFAULT false,
  admin_feedback  text,
  UNIQUE(challenge_id, fragrance_id)
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_entries ENABLE ROW LEVEL SECURITY;

-- Jeder kann aktive/beendete Challenges lesen
CREATE POLICY "Öffentliche Challenges lesbar" ON challenges
  FOR SELECT USING (status IN ('active', 'judging', 'ended'));

-- Admin kann alles
CREATE POLICY "Admin verwaltet Challenges" ON challenges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Einreichungen: Creator sehen eigene, öffentlich les
CREATE POLICY "Challenge-Einreichungen öffentlich lesbar" ON challenge_entries
  FOR SELECT USING (true);

CREATE POLICY "Creator kann eigene Einreichung hinzufügen" ON challenge_entries
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admin verwaltet Einreichungen" ON challenge_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- KI-ABO – Monatliche KI-Duft-Empfehlung (Subscription Box)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ki_subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status                  text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'past_due')),
  price_cents_monthly     integer NOT NULL DEFAULT 1990,
  stripe_subscription_id  text,
  current_period_end      timestamptz,
  shipping_address        jsonb,         -- {line1, city, postal_code, country}
  created_at              timestamptz NOT NULL DEFAULT now(),
  cancelled_at            timestamptz,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS ki_subscription_deliveries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id         uuid REFERENCES ki_subscriptions(id) ON DELETE CASCADE,
  user_id                 uuid NOT NULL REFERENCES auth.users(id),
  delivery_month          text NOT NULL,  -- '2026-03'
  fragrance_id            uuid REFERENCES fragrances(id) ON DELETE SET NULL,
  recommendation_reason   text,           -- KI-Erklärung warum dieser Duft
  status                  text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered')),
  tracking_number         text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ki_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ki_subscription_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht eigenes KI-Abo" ON ki_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Nutzer verwaltet eigenes KI-Abo" ON ki_subscriptions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin sieht alle KI-Abos" ON ki_subscriptions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Nutzer sieht eigene Lieferungen" ON ki_subscription_deliveries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin verwaltet Lieferungen" ON ki_subscription_deliveries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STEUER-TRACKING – EÜR (Einnahmen-Überschuss-Rechnung)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tax_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              text NOT NULL CHECK (type IN ('income', 'expense')),
  category          text NOT NULL,
  amount_cents      integer NOT NULL,   -- Brutto
  vat_percent       numeric(5,2) NOT NULL DEFAULT 0,
  description       text NOT NULL,
  entry_date        date NOT NULL,
  receipt_url       text,
  reference_id      text,              -- z.B. Order-ID für automatisch erzeugte Einträge
  source            text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'auto_order', 'auto_commission')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tax_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nutzer sieht eigene Steuereinträge" ON tax_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Nutzer verwaltet eigene Steuereinträge" ON tax_entries
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admin sieht alle Steuereinträge" ON tax_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
