-- ============================================================
-- FRAGRANCE OS – SQL MIGRATIONEN
-- Alle Statements in Supabase > SQL Editor ausführen
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILE: Social Links (JSON) + Banner
-- ------------------------------------------------------------
alter table profiles
  add column if not exists social_links jsonb not null default '{}';

alter table profiles
  add column if not exists banner_url text;

-- ------------------------------------------------------------
-- 2. FRAGRANCE REVIEWS
-- ------------------------------------------------------------
create table if not exists fragrance_reviews (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text not null default '',
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now(),
  unique(fragrance_id, user_id)
);

alter table fragrance_reviews enable row level security;

create policy "Reviews sind öffentlich lesbar" on fragrance_reviews
  for select using (true);

create policy "Nutzer können eigene Reviews schreiben" on fragrance_reviews
  for insert with check (auth.uid() = user_id);

create policy "Nutzer können eigene Reviews bearbeiten" on fragrance_reviews
  for update using (auth.uid() = user_id);

create policy "Nutzer können eigene Reviews löschen" on fragrance_reviews
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 3. WISHLIST / FAVORITEN
-- ------------------------------------------------------------
create table if not exists wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, fragrance_id)
);

alter table wishlists enable row level security;

create policy "Nutzer sehen ihre eigene Wishlist" on wishlists
  for select using (auth.uid() = user_id);

create policy "Nutzer können zur Wishlist hinzufügen" on wishlists
  for insert with check (auth.uid() = user_id);

create policy "Nutzer können aus Wishlist entfernen" on wishlists
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 4. NOTIFICATIONS
-- ------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "Nutzer sehen eigene Notifications" on notifications
  for select using (auth.uid() = user_id);

create policy "Nutzer können Notifications als gelesen markieren" on notifications
  for update using (auth.uid() = user_id);

create policy "System darf Notifications schreiben" on notifications
  for insert with check (true);

-- ------------------------------------------------------------
-- 5. REFERRAL ATTRIBUTIONS (für Lifetime-Provision)
-- ------------------------------------------------------------
create table if not exists referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  referral_code text,
  source text,
  lifetime_commission_percent numeric(5,2) not null default 5.00,
  created_at timestamptz not null default now(),
  unique(referred_user_id)
);

alter table referral_attributions enable row level security;

create policy "Creator sehen eigene Referrals" on referral_attributions
  for select using (auth.uid() = creator_id);

-- Referral-Code auf Profil speichern
alter table profiles
  add column if not exists referral_code text unique;

-- Generiere Referral-Codes für bestehende Profile
update profiles
set referral_code = lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where referral_code is null;

-- ------------------------------------------------------------
-- 6. FRAGRANCE VARIANTS (Größen / Intensitäten)
-- ------------------------------------------------------------
create table if not exists fragrance_variants (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references fragrances(id) on delete cascade,
  size_ml integer not null,
  intensity text not null default 'edp' check (intensity in ('edt', 'edp', 'extrait', 'edc', 'mist')),
  price_cents integer not null,
  stock_qty integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table fragrance_variants enable row level security;

create policy "Varianten sind öffentlich lesbar" on fragrance_variants
  for select using (true);

create policy "Besitzer kann Varianten verwalten" on fragrance_variants
  for all using (
    auth.uid() = (select owner_id from fragrances where id = fragrance_id)
  );

-- ------------------------------------------------------------
-- 7. APPROVAL WORKFLOW – COMPLIANCE RULES (4-Augen-Prinzip)
-- ------------------------------------------------------------
alter table compliance_rules
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'pending_review', 'approved', 'rejected'));

alter table compliance_rules
  add column if not exists submitted_for_review_at timestamptz;

alter table compliance_rules
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table compliance_rules
  add column if not exists approved_at timestamptz;

alter table compliance_rules
  add column if not exists rejection_reason text;

-- Bestehende aktive Regeln als 'approved' markieren (Bestandsschutz)
update compliance_rules
set approval_status = 'approved', approved_at = now()
where is_active = true and approval_status = 'draft';

-- ------------------------------------------------------------
-- 8. APPROVAL WORKFLOW – ACCORDS (Team-Freigabe)
-- ------------------------------------------------------------
alter table accords
  add column if not exists approval_status text not null default 'draft'
    check (approval_status in ('draft', 'pending_review', 'approved', 'rejected'));

alter table accords
  add column if not exists submitted_for_review_at timestamptz;

alter table accords
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

alter table accords
  add column if not exists approved_at timestamptz;

alter table accords
  add column if not exists rejection_reason text;

-- Bestehende freigegebene Accords als 'approved' markieren (Bestandsschutz)
update accords
set approval_status = 'approved', approved_at = now()
where is_ready = true and approval_status = 'draft';

-- ------------------------------------------------------------
-- 9. AUDIT LOG (Änderungsprotokoll)
-- ------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

create policy "Admins sehen alle Audit Logs" on audit_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "System darf Audit Logs schreiben" on audit_logs
  for insert with check (true);

-- ------------------------------------------------------------
-- 10. ACCORD NOTE-KATEGORIEN + BILD
-- ------------------------------------------------------------
alter table accords
  add column if not exists note_category text not null default 'all'
    check (note_category in ('top', 'heart', 'base', 'all'));

alter table accords
  add column if not exists image_url text;

-- Storage Bucket für Accord-Bilder (falls noch nicht vorhanden)
-- insert into storage.buckets (id, name, public)
-- values ('accord-images', 'accord-images', true)
-- on conflict do nothing;

-- RLS für accord-images Bucket
-- create policy "Accord-Bilder sind öffentlich lesbar" on storage.objects
--   for select using (bucket_id = 'accord-images');
-- create policy "Admins können Accord-Bilder hochladen" on storage.objects
--   for insert with check (bucket_id = 'accord-images');

-- ------------------------------------------------------------
-- 11. ERWEITERTES BENUTZERPROFIL (Adresse, Kontakt, Präferenzen)
-- ------------------------------------------------------------
alter table profiles
  add column if not exists phone text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country text not null default 'DE',
  add column if not exists date_of_birth date,
  add column if not exists newsletter_opt_in boolean not null default false,
  add column if not exists fragrance_preferences jsonb not null default '{}';

-- fragrance_preferences Struktur (Beispiel):
-- { "notes": ["floral", "woody", "citrus"], "families": ["oriental", "fresh"], "intensity": "moderate" }

-- ------------------------------------------------------------
-- 12. BESTELLUNGEN – LIEFERADRESSE
-- ------------------------------------------------------------
alter table orders
  add column if not exists shipping_address_line1 text,
  add column if not exists shipping_address_line2 text,
  add column if not exists shipping_city text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_country text,
  add column if not exists shipping_phone text;

-- ------------------------------------------------------------
-- 13. FRAGRANCE REVIEWS – ERWEITERTES BEWERTUNGSSYSTEM
-- ------------------------------------------------------------
alter table fragrance_reviews
  add column if not exists longevity integer check (longevity between 1 and 5),
  add column if not exists sillage integer check (sillage between 1 and 5),
  add column if not exists value_for_money integer check (value_for_money between 1 and 5),
  add column if not exists seasons jsonb not null default '[]',
  add column if not exists occasion text
    check (occasion in ('everyday', 'office', 'evening', 'special', 'sport')),
  add column if not exists gender_fit text
    check (gender_fit in ('unisex', 'feminine', 'masculine'));

-- ------------------------------------------------------------
-- 14. CREATOR APPLICATIONS (Bewerbungsflow)
-- ------------------------------------------------------------
create table if not exists creator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  message text,
  portfolio_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id)
);

alter table creator_applications enable row level security;

create policy "Nutzer kann eigene Bewerbung lesen" on creator_applications
  for select using (auth.uid() = user_id);

create policy "Nutzer kann eigene Bewerbung einreichen" on creator_applications
  for insert with check (auth.uid() = user_id);

create policy "Admin kann alle Bewerbungen lesen" on creator_applications
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admin kann Bewerbungen aktualisieren" on creator_applications
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ------------------------------------------------------------
-- 15. USER EVENTS – VERHALTENS-TRACKING
-- ------------------------------------------------------------
-- event_type: fragrance_view | wishlist_add | wishlist_remove | cart_add |
--             order_placed | review_submit | search | category_filter |
--             brand_click | creator_view | onboarding_complete
create table if not exists user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text,      -- 'fragrance' | 'category' | 'brand' | 'creator'
  entity_id text,        -- UUID oder freier String (z.B. Markenname)
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table user_events enable row level security;

create policy "Nutzer sehen eigene Events" on user_events
  for select using (auth.uid() = user_id);

create policy "System darf Events schreiben" on user_events
  for insert with check (true);

create policy "Admins sehen alle Events" on user_events
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ------------------------------------------------------------
-- 16. ONBOARDING FLAG + ERWEITERTE PRÄFERENZEN
-- ------------------------------------------------------------
alter table profiles
  add column if not exists onboarding_completed boolean not null default false;

-- fragrance_preferences JSONB wird erweitert um:
-- brands: string[]      – bevorzugte Hersteller (Chanel, Dior, etc.)
-- occasions: string[]   – Alltag, Büro, Abends, Sport, Besonderer Anlass
-- price_max: number     – maximales Budget in Cent
-- (notes, families, intensity bleiben erhalten)

-- ------------------------------------------------------------
-- 17. ORDERS – user_id + RLS für Kunden-Bestellübersicht
-- ------------------------------------------------------------
-- user_id Spalte auf orders ergänzen (falls nicht vorhanden)
alter table orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- RLS aktivieren (falls noch nicht)
alter table orders enable row level security;
alter table order_items enable row level security;

-- Kunden sehen ihre eigenen Bestellungen
create policy "Kunden sehen eigene Bestellungen" on orders
  for select using (auth.uid() = user_id);

-- Admins sehen alle Bestellungen
create policy "Admins sehen alle Bestellungen" on orders
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Kunden können Bestellungen anlegen
create policy "Kunden können Bestellungen anlegen" on orders
  for insert with check (auth.uid() = user_id);

-- Kunden sehen eigene Order-Items (via orders)
create policy "Kunden sehen eigene Order-Items" on order_items
  for select using (
    exists (select 1 from orders where orders.id = order_id and orders.user_id = auth.uid())
  );

-- Admins sehen alle Order-Items
create policy "Admins sehen alle Order-Items" on order_items
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- System darf Order-Items einfügen
create policy "System darf Order-Items einfügen" on order_items
  for insert with check (true);
