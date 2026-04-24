-- Lifetime-Provision Standardwert von 5% auf 3% senken
ALTER TABLE referral_attributions
  ALTER COLUMN lifetime_commission_percent SET DEFAULT 3.00;

-- Per-Creator Lifetime-Provision auf Profil-Ebene hinzufügen (Admin kann pro Creator individuell setzen)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lifetime_commission_percent numeric(5,2) NOT NULL DEFAULT 3.00;

-- RLS: Admin kann lifetime_commission_percent auf Profilen aktualisieren
-- (wird durch die bestehende Admin-Policy abgedeckt)
