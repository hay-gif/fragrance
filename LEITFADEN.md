# Fragrance OS – Entwicklungs-Leitfaden
*Stand: 27.03.2026 | Analysiert: vollständige Codebasis (~55 Seiten, 12 Libs, 7 Migrations)*

---

## LEGENDE
- 🔴 P0 — Produktions-Blocker (sofort)
- 🟠 P1 — Wichtig für vollständige UX (diese Woche)
- 🟡 P2 — Qualität & Stabilität (nächste Woche)
- 🟢 P3 — Nice-to-have / Polish (später)
- ✅ Erledigt

---

## PHASE 1 — KRITISCHE BUGS & BROKEN FLOWS

### ✅ P0-1 — OAuth Callback Route fehlt
**Datei**: `app/auth/callback/route.ts` (existiert nicht)
**Problem**: `supabase.auth.signInWithOAuth({ redirectTo: '.../auth/callback' })` wird aufgerufen, aber die Route existiert nicht → Google-Login bricht mit 404 ab.
**Fix**: Route anlegen, Supabase Session austauschen, Profil sicherstellen, dann redirect zu `/`.

---

### ✅ P0-2 — Stripe Webhook Handler fehlt
**Datei**: `app/api/stripe/webhook/route.ts` (existiert nicht)
**Problem**: Payments werden via Stripe Checkout erstellt, aber kein Webhook verarbeitet die Bestätigung:
- Orders bleiben auf `status: 'created'`
- Creator-Provisionen werden nie `payable`
- Loyalty Points werden nie gutgeschrieben
- Tax-Einträge werden nie auto-generiert
**Fix**: Webhook Route anlegen für Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`

---

### ✅ P0-3 — Falscher Supabase-Import in /abo
**Datei**: `app/abo/page.tsx` Zeile 4
**Problem**: `import { createClient } from "@/utils/supabase/client"` — diese Datei existiert nicht → Page crasht.
**Fix**: Ersetzen durch `import { supabase } from "@/lib/supabase"`

---

### ✅ P0-4 — Hardcoded lifetime_commission: 5% statt 3%
**Datei**: `app/auth/page.tsx` (Zeile ~64)
**Problem**: Bei Signup über Referral-Link wird `lifetime_commission_percent: 5` hardcoded, obwohl die Migration den Default auf 3 gesetzt hat → Inkonsistenz.
**Fix**: Wert auf `3` ändern.

---

### ✅ P0-5 — Doppelte Loyalty-Tabellen in Migrations
**Dateien**: `supabase/migrations/add_subscriptions.sql` + `add_likes_and_loyalty.sql`
**Problem**: `loyalty_points` und `loyalty_events` werden in beiden Migrations mit `CREATE TABLE` definiert (ohne IF NOT EXISTS in einem davon) → Migrations-Fehler bei Neuinstallation.
**Fix**: Duplikate entfernen, nur eine Definition behalten.

---

### ✅ P0-6 — Inventory-Subseiten referenzieren nicht definierte Tabellen
**Betroffene Seiten**: `/inventory/purchases`, `/inventory/movements`, `/inventory/compliance-rules`, `/inventory/raw-material-documents`, `/inventory/reorder-planning`, `/inventory/order-material-demand`
**Problem**: Diese Seiten querien Tabellen (`purchase_orders`, `inventory_movements`, `compliance_rules`, `raw_material_documents`) für die keine Migrations existieren → Supabase gibt Fehler zurück.
**Fix**: Migration erstellen die alle fehlenden Tabellen definiert.

---

### ✅ P0-7 — N+1 Query im Cart
**Datei**: `app/cart/page.tsx` (Zeilen ~65–94)
**Problem**: Für jede Fragrance im Cart wird ein separater Supabase-Call gemacht (Loop). Bei 5 Items = 5 Queries.
**Fix**: Alle fragrance_ids sammeln, einmal mit `WHERE id = ANY(array[...])` abfragen.

---

## PHASE 2 — FEHLENDE FEATURES & UNVOLLSTÄNDIGE FLOWS

### ✅ P1-1 — Image Upload Handler fehlt
**Problem**: `avatar_url`, `image_url` (Duft), `logo_url` (Challenge) werden als URLs gespeichert, aber es gibt keine Upload-Logik. User können kein Bild hochladen.
**Fix**: Supabase Storage Bucket einrichten + Upload-Handler in bestehende Seiten einbauen (Profile, Create, Admin-Challenges).

---

### ✅ P1-2 — KI-Abo Stripe-Subscription Flow unvollständig
**Datei**: `app/ki-abo/page.tsx`
**Problem**:
- Abo wird direkt per `INSERT` in `ki_subscriptions` angelegt (kein Stripe)
- Kein Stripe Recurring Subscription
- Kein monatliches Empfehlungs-Scheduling
**Fix**: Stripe Subscription erstellen wenn User sich anmeldet, Webhook handled Status. Für monatliche Empfehlung: Supabase Edge Function oder Cron-Job.

---

### ✅ P1-3 — Platform-Abo (Explorer/Collector/Connoisseur) unvollständig
**Datei**: `app/abo/page.tsx`
**Problem**: Nach dem Import-Fix (P0-3) fehlt noch die Stripe-Checkout-Session-Erstellung für Platform-Abos. Kein API-Route gefunden für `/api/stripe/create-subscription`.
**Fix**: API Route anlegen + Webhook für Abo-Status.

---

### ✅ P1-4 — Creator Payout Workflow unklar/unvollständig
**Datei**: `app/creator-dashboard/page.tsx`, `app/finance/page.tsx`
**Problem**: `creator_payout_requests` Tabelle existiert, aber der tatsächliche Payout (Stripe Transfer to Connected Account) ist nicht implementiert. Creator können Auszahlung beantragen, aber nichts passiert.
**Fix**: API Route `/api/stripe/payout` die Stripe Transfer ausführt + Status updated.

---

### ✅ P1-5 — Server-Side Role Guards fehlen (Security)
**Problem**: Alle Rollen-Checks sind Client-Side (`"use client"`). Jemand kann direkt `/admin` aufrufen und sieht kurz Content bevor der Redirect greift.
**Fix**: Next.js Middleware (`middleware.ts`) anlegen die Routes wie `/admin`, `/production`, `/support`, `/marketing` server-side schützt.

---

### ✅ P1-6 — Nav fehlt Links für /challenges und /ki-abo
**Datei**: `components/Nav.tsx`
**Problem**: Beide Seiten sind auf der Homepage beworben, aber nicht im Nav verlinkt → User findet sie nicht.
**Fix**: Links zu Nav hinzufügen.

---

### ✅ P1-7 — /fragrance/[id]/documents vs /documentation — Duplikat prüfen
**Dateien**: `app/fragrance/[id]/documents/page.tsx` + `app/fragrance/[id]/documentation/page.tsx`
**Problem**: Zwei sehr ähnlich klingende Routen → eine davon ist möglicherweise redundant oder veraltet.
**Fix**: Beide lesen, eine entfernen oder klar abgrenzen.

---

### ✅ P1-8 — /creator/[username] vs /profile/creator/[username] — Duplikat
**Dateien**: `app/creator/[username]/page.tsx` + `app/profile/creator/[username]/page.tsx`
**Problem**: Zwei Routen für dasselbe Creator-Profil.
**Fix**: Beide prüfen, Redirect anlegen, eine als kanonisch definieren.

---

## PHASE 3 — CODE-QUALITÄT & STABILITÄT

### ✅ P2-1 — Zentrales Type-System anlegen
**Problem**: `type Fragrance` ist in mind. 5 Dateien unterschiedlich definiert. Gleiches für `Profile`, `Order`, `Challenge`.
**Fix**: `lib/types/` Verzeichnis anlegen mit `fragrance.ts`, `profile.ts`, `order.ts`, `challenge.ts`. Alle Seiten importieren daraus.

---

### ✅ P2-2 — Gemeinsame Komponenten extrahieren
**Problem**: StatusBadge, LoadingSpinner, EmptyState, Card-Layout sind in jeder Seite neu implementiert.
**Fix**:
- `components/StatusBadge.tsx`
- `components/LoadingSpinner.tsx`
- `components/EmptyState.tsx`
- `components/PageHeader.tsx`

---

### ✅ P2-3 — Form Validierung vereinheitlichen
**Problem**: Überall `if (!name.trim()) { alert("...") }`. Kein Zod, kein Yup, kein einheitliches Error-Display.
**Fix**: Zod installieren, zentrale Schemas für Fragrance, Profile, Order definieren.

---

### ✅ P2-4 — Error Boundaries einbauen
**Problem**: Ein Netzwerkfehler in useEffect → weißer Screen. Kein globales Error Handling.
**Fix**: `app/error.tsx` + `app/global-error.tsx` anlegen. Error Boundary um kritische Sections.

---

### ✅ P2-5 — RLS Policy Performance optimieren
**Problem**: Role-Checks in RLS nutzen `EXISTS (SELECT 1 FROM profiles WHERE ...)` → wird für jede Row ausgeführt.
**Fix**: Index auf `profiles(id, role)` anlegen. Alternativ: `auth.jwt() ->> 'role'` nutzen wenn JWT Claims konfiguriert.

---

### ✅ P2-6 — Inkonsistente Loading States
**Problem**: Manche Seiten zeigen Spinner, andere leere Tabellen, andere gar nichts während Daten laden.
**Fix**: Einheitliches Loading-Pattern mit Skeleton-Screens für Tabellen/Cards.

---

### ✅ P2-7 — .env.example fehlt
**Problem**: Keine Dokumentation der benötigten ENV-Variablen → Onboarding für neue Entwickler unklar.
**Fix**: `.env.example` mit allen Keys anlegen (SUPABASE_URL, SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, etc.)

---

## PHASE 4 — FEATURES & POLISH

### ✅ P3-1 — Volltext-Suche
**Problem**: Kein dedizierter Search-Endpoint. Discover hat Filter aber kein Fulltext-Search über Duft-Namen, INCI, Noten.
**Fix**: Supabase `fts` (full-text search) auf `fragrances.name` + `fragrances.description` oder Algolia.

---

### ✅ P3-2 — Benachrichtigungs-System vollenden
**Datei**: `app/notifications/page.tsx`
**Problem**: Tabelle und Seite existieren, aber Notifications werden nicht überall korrekt getriggert (z.B. nach Challenge-Gewinn, Payout-Bestätigung).
**Fix**: Systematisch alle relevanten Events mit Notification verknüpfen.

---

### ✅ P3-3 — Challenge Gewinner-Payout
**Problem**: `is_winner = true` wird gesetzt, aber kein Preisgeld wird transferiert. `prize_amount_cents` ist gespeichert aber ungenutzt.
**Fix**: Bei Winner-Markierung: Stripe Transfer an Creator + Notification.

---

### ✅ P3-4 — Analytics Dashboard ausbauen
**Datei**: `app/marketing/page.tsx`
**Problem**: Grundgerüst vorhanden, aber Events (views, clicks, purchases) werden zwar getrackt aber nicht vollständig visualisiert.
**Fix**: Zeitreihen-Charts (7d/30d/90d), Funnel-Analyse, Top-Performer-Rankings.

---

### ✅ P3-5 — Mobile Optimierung
**Problem**: Design ist responsive designed, aber Touch-Interaktionen (Swipe, Tap-Targets) nicht optimiert.
**Fix**: Tap-Target Größen prüfen, Swipe-Gesten für Tab-Navigation.

---

### ✅ P3-6 — Logging & Monitoring
**Problem**: Keine strukturierten Logs. Fehler verschwinden im Void.
**Fix**: Sentry für Error Tracking + Vercel Analytics für Performance.

---

### ✅ P3-7 — Tax Auto-Import aus Orders
**Problem**: `tax_entries.source` hat `'auto_order'` als Wert definiert, aber der Webhook (P0-2) generiert noch keine Tax-Einträge automatisch.
**Fix**: Im Stripe Webhook Handler: nach `checkout.session.completed` automatisch Tax-Entry für Creator anlegen.
*(Abhängigkeit: P0-2 muss zuerst erledigt sein)*

---

## ÜBERSICHT

| Phase | Punkte | Priorität |
|-------|--------|-----------|
| Phase 1 | P0-1 bis P0-7 | 🔴 Sofort |
| Phase 2 | P1-1 bis P1-8 | 🟠 Diese Woche |
| Phase 3 | P2-1 bis P2-7 | 🟡 Nächste Woche |
| Phase 4 | P3-1 bis P3-7 | 🟢 Danach |

**Gesamt: 29 Punkte** + Affiliate-System (Bonus-Feature vollständig implementiert)

---

## BONUS-FEATURES (nach Leitfaden)

### ✅ B1 — Share & Earn für normale User
- 10% Provision wenn User ihren Duft teilen und jemand kauft
- `fragrance_share_links` + `share_payout_requests` Tabellen
- `ShareButton` Komponente mit rechtlich konformen Nutzungsbedingungen (DAC7, § 22 EStG)
- `?via=CODE` Attribution, 7-Tage Cookie per localStorage
- Webhook-Integration für automatische Provisionsberechnung + Tax-Einträge
- Rechtliche Absicherung: Steuerpflicht-Hinweis, DAC7-Meldepflicht, Mindestgrenze 15€

### ✅ B2 — Lernender Ressourcen-Vorhersage-Algorithmus
- EMA + Trend-Modell (Holt's Doppelte Exponentialglättung)
- Lernt aus Vorhersagefehlern: MAPE → α/β Anpassung
- 7/30/90-Tage Horizonte, Konfidenz-Level
- `resource_model_state`, `resource_predictions`, `resource_usage_log` Tabellen
- API: `/api/resource-predictor` (berechnet + persistiert + lernt)
- UI-Widget auf Produktionsseite (on-demand, 3 Zeithorizonte)

### ✅ B3 — Plattformweite Info-Buttons
- `InfoTooltip` Komponente: hover + click, alle 4 Positionen, accessible (aria-*)
- `lib/helpTexts.ts`: 35+ Hilfe-Texte für admin, production, finance, creator, orders, compliance, ki-abo
- Integriert in: Admin (Nutzer-Tabelle, Bestell-Tabelle), Produktion (Vorhersage, Warteschlange), Finance (KPIs, Auszahlung), Creator Dashboard (Referral)

---

*Zuletzt aktualisiert: 27.03.2026*
