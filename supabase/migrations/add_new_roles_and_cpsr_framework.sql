-- ─────────────────────────────────────────────────────────────────────────────
-- Neue Rollen: production, supporter, marketing
-- ─────────────────────────────────────────────────────────────────────────────

-- Bestehende Check-Constraint auf profiles.role erweitern
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'creator', 'admin', 'production', 'supporter', 'marketing'));

-- ─────────────────────────────────────────────────────────────────────────────
-- CPSR-Rahmenwerk: vorgenehmigte Rohstoff-Palette
-- Alle Mischungen innerhalb der definierten Grenzen gelten als sicher.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cpsr_frameworks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  description         text,
  product_type        text NOT NULL DEFAULT 'fine_fragrance',
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cpsr_framework_materials (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id                uuid NOT NULL REFERENCES cpsr_frameworks(id) ON DELETE CASCADE,
  raw_material_id             uuid NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  max_concentration_percent   numeric(8,4) NOT NULL,
  calculated_mos              numeric(10,2),
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(framework_id, raw_material_id)
);

-- RLS
ALTER TABLE cpsr_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpsr_framework_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin und Production lesen Frameworks" ON cpsr_frameworks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'production'))
  );

CREATE POLICY "Admin verwaltet Frameworks" ON cpsr_frameworks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin und Production lesen Framework-Materialien" ON cpsr_framework_materials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'production'))
  );

CREATE POLICY "Admin verwaltet Framework-Materialien" ON cpsr_framework_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
