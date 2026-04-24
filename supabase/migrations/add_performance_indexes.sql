-- Performance-Indizes für RLS und häufige Queries
-- Kritisch: role-Checks in RLS-Policies laufen für jede Row ohne Index sehr langsam.

-- profiles: RLS role-Checks + Username-Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username      ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_id_role       ON profiles(id, role);

-- orders: Status-Filter + User-Lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_id         ON orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at         ON orders(paid_at DESC) WHERE paid_at IS NOT NULL;

-- order_items: Creator-Payouts, Affiliate-Payouts
CREATE INDEX IF NOT EXISTS idx_order_items_order_id          ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_creator_id        ON order_items(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_payout_status     ON order_items(payout_status) WHERE payout_status != 'paid';
CREATE INDEX IF NOT EXISTS idx_order_items_affiliate_user_id ON order_items(affiliate_user_id) WHERE affiliate_user_id IS NOT NULL;

-- affiliate_payouts: User Dashboard-Queries
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_user_id ON affiliate_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status  ON affiliate_payouts(status) WHERE status != 'paid';

-- fragrances: Public discover + Creator-Queries
CREATE INDEX IF NOT EXISTS idx_fragrances_is_public  ON fragrances(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_fragrances_creator_id ON fragrances(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fragrances_status     ON fragrances(status);

-- fragrance_likes: User + Fragrance Lookups
CREATE INDEX IF NOT EXISTS idx_fragrance_likes_user       ON fragrance_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_fragrance_likes_fragrance  ON fragrance_likes(fragrance_id);

-- loyalty_events: User Timeline
CREATE INDEX IF NOT EXISTS idx_loyalty_events_user_id    ON loyalty_events(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_created_at ON loyalty_events(created_at DESC);

-- notifications: Unread Inbox
CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread     ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- tax_entries: Finance Dashboard
CREATE INDEX IF NOT EXISTS idx_tax_entries_user_id  ON tax_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_entries_date     ON tax_entries(date DESC);

-- challenges: Active Challenges + Entries
CREATE INDEX IF NOT EXISTS idx_challenges_status           ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_user      ON challenge_entries(user_id);
