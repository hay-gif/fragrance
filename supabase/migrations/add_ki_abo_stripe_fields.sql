-- KI-Abo: Stripe Customer ID hinzufügen
ALTER TABLE ki_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;
