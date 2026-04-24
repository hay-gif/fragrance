-- ============================================================
-- Resource Prediction System
-- Lernender EMA-Algorithmus (lib/resourcePredictor.ts) der
-- Rohstoff-/Accord-Bedarfe vorhersagt und sich selbst verbessert.
-- ============================================================

-- Modell-Parameter pro Accord (werden beim Lernen aktualisiert)
CREATE TABLE IF NOT EXISTS resource_model_state (
  accord_id          uuid PRIMARY KEY REFERENCES accords(id) ON DELETE CASCADE,
  alpha              numeric NOT NULL DEFAULT 0.3,  -- EMA Glättungsfaktor
  beta               numeric NOT NULL DEFAULT 0.3,  -- Trend-Glättungsfaktor
  last_ema           numeric,                        -- letzter EMA-Wert (g/Tag)
  last_trend         numeric DEFAULT 0,              -- letzter Trend-Wert
  mape               numeric,                        -- Mean Absolute % Error
  prediction_count   integer NOT NULL DEFAULT 0,
  last_trained_at    timestamptz NOT NULL DEFAULT now()
);

-- Vorhersagen (werden mit Ist-Werten gefüllt sobald Zeit verstreicht)
CREATE TABLE IF NOT EXISTS resource_predictions (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accord_id                   uuid NOT NULL REFERENCES accords(id) ON DELETE CASCADE,
  prediction_made_at          timestamptz NOT NULL DEFAULT now(),
  horizon_days                integer NOT NULL,             -- 7, 30 oder 90
  predicted_amount_grams      numeric NOT NULL,
  actual_amount_grams         numeric,                      -- wird nachträglich gefüllt
  model_snapshot              jsonb,                        -- {alpha, beta, mape} bei Erstellung
  UNIQUE(accord_id, prediction_made_at, horizon_days)
);

-- Täglich aggregierter Ist-Verbrauch (aus Order-Auswertung)
CREATE TABLE IF NOT EXISTS resource_usage_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accord_id        uuid NOT NULL REFERENCES accords(id) ON DELETE CASCADE,
  usage_date       date NOT NULL,
  amount_grams     numeric NOT NULL DEFAULT 0,
  order_count      integer NOT NULL DEFAULT 0,
  UNIQUE(accord_id, usage_date)
);

-- RLS: nur service role schreibt; admins + production lesen
ALTER TABLE resource_model_state  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_predictions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_usage_log    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_read_staff" ON resource_model_state FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production')));
CREATE POLICY "resource_pred_read_staff" ON resource_predictions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production')));
CREATE POLICY "resource_usage_read_staff" ON resource_usage_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','production')));

-- Indizes
CREATE INDEX IF NOT EXISTS idx_resource_predictions_accord  ON resource_predictions(accord_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_accord_date   ON resource_usage_log(accord_id, usage_date);
