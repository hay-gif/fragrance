-- ============================================================
-- Share & Earn System
-- Normale User erhalten 10 % Provision wenn jemand ihren Duft
-- über ihren persönlichen Share-Link kauft.
-- ============================================================

-- Share-Links: ein Link pro User+Fragrance
CREATE TABLE IF NOT EXISTS fragrance_share_links (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fragrance_id           uuid NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  share_code             text UNIQUE NOT NULL
                           DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  clicks                 integer NOT NULL DEFAULT 0,
  conversions            integer NOT NULL DEFAULT 0,
  total_commission_cents integer NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, fragrance_id)
);

-- Auszahlungsanfragen für Share-Provisionen
-- (separate Tabelle, da normale User kein Stripe Connect haben)
CREATE TABLE IF NOT EXISTS share_payout_requests (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fragrance_share_link_id   uuid REFERENCES fragrance_share_links(id),
  order_id                  uuid,               -- Bestellung die die Provision ausgelöst hat
  amount_cents              integer NOT NULL,
  status                    text NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  payout_method             text CHECK (payout_method IN ('iban', 'paypal')),
  iban                      text,
  paypal_email              text,
  tax_id                    text,               -- Steuer-ID (Pflicht ab 15 € Auszahlung)
  admin_note                text,
  paid_at                   timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- Profil-Erweiterungen für Share & Earn
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_terms_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_balance_cents      integer NOT NULL DEFAULT 0;

-- RLS
ALTER TABLE fragrance_share_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_payout_requests  ENABLE ROW LEVEL SECURITY;

-- fragrance_share_links: User liest/erstellt nur eigene
CREATE POLICY "share_links_own_read"   ON fragrance_share_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "share_links_own_insert" ON fragrance_share_links FOR INSERT WITH CHECK (auth.uid() = user_id);
-- öffentlich lesbar nach share_code (für Click-Tracking via service role)

-- share_payout_requests: User liest/erstellt nur eigene
CREATE POLICY "share_payouts_own_read"   ON share_payout_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "share_payouts_own_insert" ON share_payout_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_share_links_user      ON fragrance_share_links(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_code      ON fragrance_share_links(share_code);
CREATE INDEX IF NOT EXISTS idx_share_links_fragrance ON fragrance_share_links(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_share_payouts_user    ON share_payout_requests(user_id);

-- Atomic click increment function (avoids read-modify-write race conditions)
CREATE OR REPLACE FUNCTION increment_share_clicks(p_share_code text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE fragrance_share_links
  SET clicks = clicks + 1
  WHERE share_code = p_share_code;
$$;
