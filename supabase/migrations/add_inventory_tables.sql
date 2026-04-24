-- ─────────────────────────────────────────────────────────────────────────────
-- INVENTORY – fehlende Tabellen für Inventory-Subseiten
-- ─────────────────────────────────────────────────────────────────────────────

-- Einkaufsbestellungen (Rohstoffe / Verpackung einkaufen)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name       text NOT NULL,
  supplier_email      text,
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'ordered', 'shipped', 'received', 'cancelled')),
  total_cents         integer NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'EUR',
  order_date          date NOT NULL DEFAULT CURRENT_DATE,
  expected_date       date,
  received_date       date,
  notes               text,
  invoice_url         text,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  resource_id         uuid REFERENCES resources(id) ON DELETE SET NULL,
  raw_material_id     uuid REFERENCES raw_materials(id) ON DELETE SET NULL,
  description         text NOT NULL,
  quantity            numeric(12,4) NOT NULL,
  unit                text NOT NULL DEFAULT 'ml',
  unit_price_cents    integer NOT NULL DEFAULT 0,
  total_cents         integer GENERATED ALWAYS AS (ROUND(quantity * unit_price_cents)) STORED,
  received_quantity   numeric(12,4) NOT NULL DEFAULT 0
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Production liest Bestellungen" ON purchase_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production'))
  );
CREATE POLICY IF NOT EXISTS "Production verwaltet Bestellungen" ON purchase_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production'))
  );
CREATE POLICY IF NOT EXISTS "Production liest Positionen" ON purchase_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production'))
  );
CREATE POLICY IF NOT EXISTS "Production verwaltet Positionen" ON purchase_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production'))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE RULES – IFRA-Grenzwerte und eigene Regeln
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS compliance_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id uuid REFERENCES raw_materials(id) ON DELETE CASCADE,
  rule_name       text NOT NULL,
  category        text NOT NULL DEFAULT 'IFRA',     -- 'IFRA' | 'internal' | 'EU_regulation'
  product_type    text NOT NULL DEFAULT 'fine_fragrance',
  max_percent     numeric(8,4) NOT NULL,
  notes           text,
  source_url      text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Production liest Compliance-Regeln" ON compliance_rules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production','creator'))
  );
CREATE POLICY IF NOT EXISTS "Admin verwaltet Compliance-Regeln" ON compliance_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production'))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- RAW MATERIAL DOCUMENTS – SDS, COA, IFRA-Zertifikate
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS raw_material_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id uuid NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  doc_type        text NOT NULL
    CHECK (doc_type IN ('SDS','COA','IFRA','TDS','allergen_declaration','other')),
  title           text NOT NULL,
  file_url        text NOT NULL,
  version         text,
  valid_until     date,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE raw_material_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Production liest Rohstoff-Dokumente" ON raw_material_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production','creator'))
  );
CREATE POLICY IF NOT EXISTS "Production verwaltet Rohstoff-Dokumente" ON raw_material_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production'))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDICES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_role           ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code  ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_order_items_creator_id  ON order_items(creator_id);
CREATE INDEX IF NOT EXISTS idx_fragrance_likes_user    ON fragrance_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_entries_date        ON tax_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_cid   ON challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_uid   ON challenge_entries(creator_id);
