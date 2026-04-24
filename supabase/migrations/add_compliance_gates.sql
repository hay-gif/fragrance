-- ================================================================
-- COMPLIANCE GATES: EU Cosmetics Regulation 1223/2009 + § 22f UStG
-- ================================================================

-- 1. Fragrance compliance_status
--    Blocks is_public = TRUE until compliance_status = 'approved_for_sale'
ALTER TABLE fragrances
  ADD COLUMN IF NOT EXISTS compliance_status TEXT NOT NULL DEFAULT 'draft'
  CHECK (compliance_status IN ('draft', 'pif_submitted', 'cpsr_approved', 'approved_for_sale', 'rejected'));

-- 2. Creator business profile: tax & KYC fields required by § 22f UStG
ALTER TABLE creator_business_profiles
  ADD COLUMN IF NOT EXISTS legal_name TEXT,                    -- full legal name (from previous migration, idempotent)
  ADD COLUMN IF NOT EXISTS tax_id TEXT,                        -- Steuer-IdNr. (11-stellig, Deutschland)
  ADD COLUMN IF NOT EXISTS is_kleinunternehmer BOOLEAN DEFAULT FALSE, -- § 19 UStG Kleinunternehmer
  ADD COLUMN IF NOT EXISTS lucid_registered BOOLEAN DEFAULT FALSE,    -- Verpackungsregister LUCID (§ 9 VerpackG)
  ADD COLUMN IF NOT EXISTS dac7_tin TEXT,                      -- Tax Identification Number for DAC7 (§ 22 DAC7UmsG)
  ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ,        -- Timestamp when admin verified KYC
  ADD COLUMN IF NOT EXISTS kyc_verified_by UUID REFERENCES auth.users(id), -- Admin who verified
  ADD COLUMN IF NOT EXISTS payout_blocked BOOLEAN DEFAULT FALSE,       -- Admin can block payouts
  ADD COLUMN IF NOT EXISTS payout_blocked_reason TEXT;                  -- Reason for blocking

-- 3. RLS: Allow admins to read all business profiles for compliance review
CREATE POLICY IF NOT EXISTS "Admins read all business profiles"
  ON creator_business_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. RLS: Allow admins to update business profiles (KYC verification)
CREATE POLICY IF NOT EXISTS "Admins update business profiles"
  ON creator_business_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. RLS: Allow admins to read all fragrances regardless of compliance_status
-- (fragrances table should already have admin read policy - this adds update for compliance)
CREATE POLICY IF NOT EXISTS "Admins update fragrance compliance_status"
  ON fragrances
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'production')
    )
  );

-- 6. Index for compliance queries
CREATE INDEX IF NOT EXISTS idx_fragrances_compliance_status ON fragrances (compliance_status);
CREATE INDEX IF NOT EXISTS idx_creator_business_profiles_kyc ON creator_business_profiles (kyc_verified_at, payout_blocked);
