-- ─────────────────────────────────────────────────────────────────────────────
-- AFFILIATE-SYSTEM
-- Jeder User (nicht nur Creators) kann 10 % Provision verdienen wenn jemand
-- über sein Profil / seinen Link kauft. Rate ist individuell einstellbar
-- (z.B. per Vertrag via Admin-Panel).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) affiliate_commission_percent an profiles anhängen
--    Default: 10 % für alle User
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS affiliate_commission_percent numeric(5,2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS affiliate_contract_note text;       -- Freitext für Admin (z.B. "Vertrag #42, 15 %")

-- 2) order_items um Affiliate-Felder erweitern
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS affiliate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_commission_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_payout_status text NOT NULL DEFAULT 'none'
    CHECK (affiliate_payout_status IN ('none','pending','payable','paid'));

-- 3) Affiliate-Auszahlungs-Tabelle (analog zu creator_payout_requests)
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_item_id       uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  amount_cents        integer NOT NULL,
  commission_percent  numeric(5,2) NOT NULL,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','payable','paid')),
  stripe_transfer_id  text,
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_item_id)   -- pro Order-Item nur ein Affiliate-Payout
);

ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- User sieht eigene Payouts
CREATE POLICY IF NOT EXISTS "User sieht eigene Affiliate-Payouts" ON affiliate_payouts
  FOR SELECT USING (auth.uid() = user_id);

-- Admin verwaltet alle
CREATE POLICY IF NOT EXISTS "Admin verwaltet Affiliate-Payouts" ON affiliate_payouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Indices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_items_affiliate_user ON order_items(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_user     ON affiliate_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status   ON affiliate_payouts(status);
