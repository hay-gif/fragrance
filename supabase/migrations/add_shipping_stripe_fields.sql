-- Migration: Tracking-Nummer, Versandlabel und Stripe-Felder zur orders-Tabelle hinzufügen
-- Ausführen in: Supabase Dashboard → SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number       TEXT,
  ADD COLUMN IF NOT EXISTS shipping_label_url    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_id     TEXT,
  ADD COLUMN IF NOT EXISTS paid_at               TIMESTAMPTZ;

-- Status-Typ erweitern (falls orders.status ein TEXT-Feld ist, nichts tun)
-- Falls es ein ENUM ist:
-- ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- Kommentar für Dokumentation
COMMENT ON COLUMN orders.tracking_number    IS 'DHL Sendungsnummer';
COMMENT ON COLUMN orders.shipping_label_url IS 'URL zum DHL-Versandlabel PDF';
COMMENT ON COLUMN orders.stripe_payment_id  IS 'Stripe PaymentIntent ID nach erfolgreicher Zahlung';
COMMENT ON COLUMN orders.paid_at            IS 'Zeitstempel der Zahlungsbestätigung durch Stripe';
