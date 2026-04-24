-- Stripe Connect accounts for creators
CREATE TABLE IF NOT EXISTS creator_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, restricted
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  business_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE creator_stripe_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Creators see own connect account" ON creator_stripe_accounts
  FOR SELECT USING (auth.uid() = creator_id);

-- Creator business profile + contract acceptance
CREATE TABLE IF NOT EXISTS creator_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT,
  vat_id TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'DE',
  agreement_accepted_at TIMESTAMPTZ,
  agreement_version TEXT DEFAULT '1.0',
  agreement_ip TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE creator_business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Creators manage own business profile" ON creator_business_profiles
  FOR ALL USING (auth.uid() = creator_id);

-- Creator physical products
CREATE TABLE IF NOT EXISTS creator_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'other', -- flakon, sample, accessoire, merch, other
  image_url TEXT,
  weight_grams INT DEFAULT 200,
  is_published BOOLEAN DEFAULT FALSE,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE creator_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Creators manage own products" ON creator_products
  FOR ALL USING (auth.uid() = creator_id);
CREATE POLICY IF NOT EXISTS "Anyone can read published products" ON creator_products
  FOR SELECT USING (is_published = TRUE);

-- Creator payout requests
CREATE TABLE IF NOT EXISTS creator_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  fee_cents INT NOT NULL DEFAULT 0,
  net_cents INT NOT NULL,
  type TEXT NOT NULL DEFAULT 'standard', -- standard, instant
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  stripe_payout_id TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE creator_payout_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Creators see own payouts" ON creator_payout_requests
  FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY IF NOT EXISTS "Creators insert own payouts" ON creator_payout_requests
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
