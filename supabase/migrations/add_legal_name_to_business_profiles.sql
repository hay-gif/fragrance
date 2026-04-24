-- Add legal_name to creator_business_profiles for contract law compliance
ALTER TABLE creator_business_profiles ADD COLUMN IF NOT EXISTS legal_name TEXT;
