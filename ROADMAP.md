# Fragrance OS — Produkt Roadmap

> **Nord Stern Dokument** — Wird laufend aktualisiert. ✅ = fertig · 🔄 = in Arbeit · ⬜ = geplant

---

## 0. CORE PRINZIP

Fragrance OS baut 4 Maschinen gleichzeitig:

| Maschine | Ziel |
|---|---|
| **Produkt-Maschine** | Individuelle Düfte mit Creator-System |
| **Creator-Maschine** | Traffic + Content durch Creator-Netzwerk |
| **AI-Maschine** | Personalisierung + Optimierung aller Flows |
| **Revenue-Maschine** | Upsells + Abos + Lifetime-Value |

---

## 1. USER SYSTEM

### Account & Profil
- ✅ Registrierung / Login (Email + Passwort)
- ⬜ Login via Google OAuth
- ⬜ Login via Apple Sign-In
- ✅ Benutzerprofil (Name, Display Name, Bio)
- ⬜ Duftprofil (automatisch generiert aus Käufen + Bewertungen, öffentlich sichtbar)
- ✅ Favoritenliste (Wishlist)
- ✅ Kaufhistorie (Bestellungen)
- ⬜ Abo-Übersicht
- ⬜ Wallet (Rabatt-Credits, Treuepunkte-Guthaben)

### Onboarding
- ✅ Lieblingsdüfte / Marken-Auswahl (30 Marken)
- ✅ Duftnoten / Familien Auswahl (floral, woody, oriental, fresh, citrus, powdery, green, gourmand, leather, musk)
- ✅ Intensität (light / moderate / strong)
- ✅ Anlass (Alltag, Büro, Abends, Besonderer Anlass, Sport)
- ✅ Budget (unter 50€ / 100€ / 200€ / kein Limit)
- ⬜ Mood Auswahl (clean, sexy, fresh, mysterious, cozy, energetic)
- ✅ Onboarding-Daten in `profiles.fragrance_preferences` gespeichert
- ✅ Redirect zu `/onboarding` nach Registrierung

### Interaktionen
- ✅ Saves / Wishlist (Düfte speichern)
- ✅ Bewertungen mit Gesamtstern + Dimensionen (Haltbarkeit, Preis-Leistung)
- ✅ Verified Purchase Badge auf Bewertungen
- ⬜ Likes (schnelles Herz ohne Review)
- ⬜ Kommentare auf Düften (Phase 2)

### Einstellungen
- ⬜ Sprache (DE / EN / FR)
- ⬜ Datenschutz / Tracking-Einstellungen
- ⬜ Benachrichtigungs-Präferenzen
- ⬜ Abo Verwaltung

---

## 2. AI SYSTEM

### Input Daten
- ✅ Klick-Tracking (`user_events` Tabelle)
- ✅ Kauftracking (order_placed Event)
- ✅ Bewertungs-Daten
- ✅ Duftattribute (Accorde, Kategorien)
- ⬜ Creator Performance Daten als AI Input

### Core Funktionen
- ✅ Feed-Algorithmus (`lib/feedAlgorithm.ts`) mit Präferenz + Verhaltens-Scoring
- ✅ „Für dich" personalisierter Feed auf Discover
- ⬜ „Ähnliche Düfte" auf Duft-Detailseite
- ⬜ Trend-Erkennung (meistgekaufte Accorde, wachsende Kategorien)

### AI Duft Engine
- ✅ KI-Vorschlag im Konfigurator (Claude API via `/api/ai-suggest`)
- ✅ Kompositions-Generierung anhand Text + Nutzerpräferenzen
- ⬜ Bestehende Düfte optimieren (AI schlägt Anpassungen vor)
- ⬜ Haltbarkeit optimieren (Fixateure vorschlagen)
- ⬜ Projektion optimieren (Kopfnoten-Anteil anpassen)

### AI User Features
- ⬜ Duft des Monats (personalisiert, automatisch generiert)
- ⬜ Persönliche Duftentwicklungs-Timeline
- ⬜ AI-generierter Duftpass (dein Geschmacksprofil als Karte)

### AI Creator Tools
- ✅ KI-Vorschlag bei Duft-Erstellung
- ⬜ AI Insight im Creator Dashboard (Optimierungsvorschläge)
- ⬜ Trend Hinweise ("Diese Note ist gerade +40% im Feed")
- ⬜ Viral Potential Score für neue Düfte

---

## 3. DUFT SYSTEM (Herzstück)

### Rohstoff-Ebene
- ⬜ Rohstoff-Datenbank (Name, INCI, Lieferant)
- ⬜ IFRA-Grenzwerte pro Rohstoff
- ⬜ Sicherheitsdatenblatt-Upload
- ⬜ Lieferanten-Verwaltung

### Accord-Ebene
- ✅ Accord-System (Datenbank mit Kategorien)
- ✅ Accord-Auswahl im Konfigurator
- ✅ Prozentwerte pro Accord
- ⬜ Accord aus Rohstoffen zusammenstellen (Vererbung Rohstoff → Accord)
- ⬜ Accord-Kategorie + Duftprofil hinterlegen

### Duft-Ebene
- ✅ Duft aus Accorden zusammenstellen
- ✅ Intensität (Größe / Konzentration als Varianten)
- ✅ Zielprofil / Kategorie
- ✅ Öffentlich / Privat
- ⬜ EDT / EDP / Extrait als Konzentrations-Typ
- ⬜ Automatische INCI-Liste aus Rohstoffen
- ⬜ Automatische Prozentberechnung Rohstoff → Accord → Duft

### Varianten
- ✅ Größen-Varianten (z.B. 30ml, 50ml, 100ml)
- ✅ Intensitäts-Varianten
- ✅ Preis pro Variante
- ✅ Lagerbestand pro Variante

---

## 4. REGULATORY SYSTEM

- ⬜ INCI-Liste automatisch aus Rohstoff-Datenbank generieren
- ⬜ IFRA-Grenzwerte automatisch prüfen
- ⬜ Verbotene Stoffe erkennen + warnen
- ⬜ Compliance Engine (Ampelsystem: grün / gelb / rot)
- ⬜ PIF (Product Information File) automatisch erstellen
- ⬜ PDF-Export (INCI-Liste, Sicherheitsinfo)
- ⬜ Toxikologen-Workflow (Freigabe-Prozess integrieren)

---

## 5. CREATOR SYSTEM

### Account
- ✅ Creator-Bewerbung (`/apply` Seite)
- ✅ Bewerbungs-Formular (Motivation + Portfolio)
- ✅ Admin-Review von Bewerbungen
- ✅ Creator-Status (`none` / `pending` / `approved` / `rejected`)
- ✅ Creator-Profil (Bio, Social Links, Avatar, Banner)
- ⬜ Creator-Verifizierung (ID-Prüfung / Vertragsunterzeichnung)
- ⬜ Creator-Onboarding nach Freischaltung

### Funktionen
- ✅ Düfte erstellen + veröffentlichen
- ✅ KI-Unterstützung bei Komposition
- ✅ Creator Dashboard (Umsatz, Bestellungen, Referrals)
- ✅ Öffentliche Creator-Profilseite (`/creator/[username]`)
- ✅ Follower-System
- ⬜ Creator Newsletter / Ankündigungs-System

### Monetarisierung
- ✅ Revenue Share (konfigurierbar, Standard 25%)
- ✅ Lifetime-Referral (5% auf alle Käufe geworbener User)
- ✅ Provisions-Auszahlungen über Admin-Panel
- ⬜ Bonus-System (z.B. +5% bei > 50 Verkäufen/Monat)
- ⬜ Auszahlung via Stripe / SEPA direkt aus System

---

## 6. CREATOR DASHBOARD

### Analytics
- ✅ Umsatz gesamt + pro Duft
- ✅ Verkaufsanzahl
- ✅ Referral-Einnahmen
- ✅ Auszahlungsstatus
- ⬜ Conversion Rate (Besucher → Kauf)
- ⬜ Wiederkäufer-Rate
- ⬜ Diagramme / Charts (Umsatz über Zeit)

### Duft Analyse
- ⬜ Note-Performance (welche Accorde performen am besten)
- ⬜ Zielgruppen-Analyse (Alter, Geschlecht basierend auf Käuferprofilen)
- ✅ Bewertungsübersicht pro Duft

### Duft Creation Tool
- ✅ Kompositions-Builder (Accorde + Prozentwerte)
- ✅ Live-Vorschau der Komposition
- ✅ AI Vorschlag Button
- ⬜ Drag & Drop Accorde
- ⬜ Referenz-Duft eingeben → AI analysiert + schlägt ähnliche Komposition vor

---

## 7. UPSELL SYSTEM

### Checkout
- ⬜ Größen-Upgrade Vorschlag ("50ml für nur +15€ mehr")
- ⬜ Intensitäts-Upgrade (EDT → EDP)
- ⬜ Gravur (+Preis)
- ⬜ Premium Box Upgrade
- ⬜ Bundle-Angebote (2 Düfte zusammen günstiger)

### After Sale
- ⬜ Refill-Angebot nach geschätzter Nutzungszeit
- ⬜ Abo-Upgrade nach 2. Kauf
- ⬜ Limited Drop Ankündigung per Notification

### AI Upsells
- ⬜ Ergänzungsduft vorschlagen ("Passt gut zu deinem Kauf")
- ⬜ Layering-Vorschläge (2 Düfte zusammen tragen)

---

## 8. RETENTION SYSTEM

- ⬜ Refill-System (identischer Duft nachbestellen)
- ✅ Duft-Historie / Kaufhistorie
- ⬜ Leer-Erinnerung (Push/Email nach ~60/90 Tagen)
- ⬜ Loyalty-Punkte (z.B. 1€ = 1 Punkt, 100 Punkte = 5€ Rabatt)
- ⬜ Level-System (Bronze / Silber / Gold / Platinum)
- ✅ Wishlist / Saves als Retention-Hook
- ✅ Following-System (Creator Content Feed)

---

## 9. PRODUCT EXPERIENCE

- ⬜ Flakon-Auswahl im Checkout (verschiedene Designs)
- ⬜ Premium Packaging Option
- ⬜ Gravur-Funktion
- ⬜ Story-Karte (Creator schreibt Nachricht zum Duft)
- ⬜ Personalisierung (Name auf Etikett)
- ⬜ Seriennummer für limitierte Editionen

---

## 10. CREATOR ABO SYSTEM

### Funktionen
- ⬜ Duft-des-Monats Abo (Creator kuratiert)
- ⬜ Exklusive Drops für Abonnenten
- ⬜ Early Access für Abo-Mitglieder

### Optionen
- ⬜ Plattform-Versand (zentral über Fragrance OS)
- ⬜ Creator-Versand (Creator versendet selbst, Phase 2)
- ⬜ Abo-Verwaltung im Creator Dashboard

---

## 11. BRANDING SYSTEM

### Flakons
- ⬜ Flakon-Bibliothek (Bilder, Typen, Kapazitäten)
- ⬜ Farb-Auswahl
- ⬜ Deckel-Varianten

### Labels / Boxen
- ⬜ Label-Designer (Text, Schriftart, Farbe)
- ⬜ Logo-Upload für Creator
- ⬜ Box-Varianten (Standard / Premium / Limited)

### Premium
- ⬜ Gravur-Workflow
- ⬜ Seriennummer-Generierung
- ⬜ Echtheitszertifikat PDF

---

## 12. DATENSYSTEM

- ✅ `user_events` Tabelle (Klick-, Kauf-, Such-Tracking)
- ✅ Event-Typen: fragrance_view, wishlist_add, cart_add, order_placed, search, category_filter, brand_click, creator_view, onboarding_complete
- ✅ Präferenzen in `profiles.fragrance_preferences` (JSONB)
- ✅ Admin Analytics Dashboard (Aggregationen client-seitig)
- ⬜ Trend-Erkennung (wachsende Suchbegriffe, steigende Kategorien)
- ⬜ Cluster-Bildung (Nutzertypen automatisch erkennen)
- ⬜ Cohort-Analyse (Retention nach Registrierungsmonat)
- ⬜ Server-seitige Aggregation (für Performance bei Scale)

---

## 13. COMMUNITY SYSTEM

- ✅ Bewertungen (mehrdimensional: Sterne, Haltbarkeit, Preis-Leistung, Saison, Anlass)
- ✅ Following System (Creator folgen)
- ✅ Following Feed (neue Düfte von gefolgten Creatorn)
- ⬜ Rankings (Top Düfte, Top Creator)
- ⬜ Trending Section auf Discover
- ⬜ Badges (z.B. "100 Verkäufe", "Erstbewerter", "Treue Fan")
- ⬜ Kommentare (Phase 2)

---

## 14. INTERNATIONALISIERUNG

- ⬜ Mehrsprachigkeit (DE / EN / FR — i18n Framework)
- ⬜ Währungs-Umrechnung (EUR / USD / GBP / CHF)
- ⬜ Versandländer-Konfiguration
- ⬜ Lokale Compliance-Regeln (EU vs. UK vs. US)
- ⬜ Lokale Zahlungsmethoden

---

## 15. ADMIN SYSTEM

- ✅ User-Verwaltung (Liste, Rollen vergeben)
- ✅ Creator-Bewerbungen verwalten (genehmigen / ablehnen + Notiz)
- ✅ Bestellungen einsehen
- ✅ Auszahlungen verwalten (Payout Status)
- ✅ Analytics Tab (Events, Top-Düfte, Suchbegriffe, Familien-Verteilung)
- ⬜ Duft-Verwaltung (Düfte deaktivieren, featured markieren)
- ⬜ Benachrichtigungen senden (Push / Email an Nutzergruppen)
- ⬜ Reports exportieren (CSV / PDF)
- ⬜ Fraud Detection (ungewöhnliche Aktivität flaggen)

---

## 16. PRODUKTIONS SYSTEM

- ✅ Auftrags-Verwaltung (Bestellungen in Produktion aufnehmen)
- ✅ Status-Tracking (pending → in_production → shipped → delivered)
- ✅ Batch-Verwaltung
- ✅ Sample-System (Samples anfordern, Status tracken)
- ✅ Payout-Status Verwaltung
- ⬜ Mischanweisungen automatisch aus Komposition generieren
- ⬜ Qualitäts-Checkliste pro Batch
- ⬜ Produktions-Kalender / Kapazitätsplanung

---

## 17. LOGISTIK SYSTEM

- ✅ Versand-Adresse in Bestellungen gespeichert
- ⬜ Tracking-Nummer eingeben + automatisch an Kunden senden
- ⬜ Tracking-Link für Kunden (DHL, DPD, UPS Integration)
- ⬜ Retouren-Workflow
- ⬜ Refill-Handling (Leer-Flakon zurückschicken)
- ⬜ Automatische Versand-Benachrichtigungen (Email / Push)

---

## 18. SECURITY & LEGAL

- ⬜ DSGVO-konforme Datenschutzerklärung (`/datenschutz`)
- ⬜ AGB (`/agb`)
- ⬜ Impressum (`/impressum`)
- ⬜ Cookie-Banner (konform mit ePrivacy)
- ⬜ Recht auf Datenlöschung (User kann Account löschen)
- ⬜ Datenexport (DSGVO Art. 20)
- ⬜ RLS (Row Level Security) auf allen Supabase-Tabellen vollständig konfiguriert
- ✅ RLS auf `orders` und `order_items` (Kunden sehen nur eigene)
- ✅ RLS auf `user_events` (Kunden sehen nur eigene)
- ⬜ Markenhinweise / Disclaimer bei Creator-Inspirationen

---

## 19. REVENUE SYSTEM

### Einnahmen-Quellen
- ✅ Einzelverkauf (Preis pro Duft / Variante)
- ⬜ Abonnements (monatlich / jährlich, verschiedene Tiers)
- ⬜ Upsells (Gravur, Premium Box, Upgrade)
- ✅ Creator-Beteiligung (25% Revenue Share konfigurierbar)
- ✅ Lifetime-Referral (5% auf Folgekäufe)
- ⬜ Plattform-Fee auf Creator-Verkäufe
- ⬜ Affiliate-Programm für externe Influencer

### Payment
- ⬜ Stripe Integration (Checkout, Webhooks)
- ⬜ Abo-Billing (Stripe Subscriptions)
- ⬜ Automatische Auszahlungen an Creator (Stripe Connect)
- ⬜ Rechnungsgenerierung (PDF)

---

## TECH STACK

| Layer | Technologie |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL, Storage, RLS) |
| AI | Anthropic Claude API (claude-opus-4-6) |
| Hosting | Vercel (geplant) |
| Payments | Stripe (geplant) |
| Email | Resend / Sendgrid (geplant) |

---

## DESIGN SYSTEM

> Konsistentes Design über alle Seiten: Luxury × Tech × Apple

| Token | Wert |
|---|---|
| Page Background | `#FAFAF8` |
| Primary Text | `#0A0A0A` |
| Secondary Text | `#6E6860` |
| Muted Text | `#9E9890` |
| Border | `#E5E0D8` |
| Light Surface | `#F0EDE8` |
| Dark Hero | `#0A0A0A` |
| Gold Accent | `#B09050` |

---

## PRIORITÄTEN (nächste Schritte)

### 🔥 Phase 1 — Jetzt (MVP komplett)
- ⬜ UI/UX Design durchgezogen auf allen Seiten
- ⬜ Stripe Integration (Checkout)
- ⬜ Email-Benachrichtigungen (Bestellbestätigung)
- ⬜ DSGVO-Seiten (Datenschutz, AGB, Impressum)

### 🚀 Phase 2 — Launch
- ⬜ Google/Apple Login
- ⬜ Refill-System
- ⬜ Tracking-Integration (DHL etc.)
- ⬜ Loyalty-Punkte
- ⬜ Creator Abo-System

### 🌍 Phase 3 — Scale
- ⬜ Rohstoff-Datenbank + INCI-Compliance Engine
- ⬜ Internationalisierung (EN/FR)
- ⬜ Branding-System (Flakon-Auswahl, Label-Designer)
- ⬜ Community Rankings + Badges
- ⬜ Stripe Connect (automatische Creator-Auszahlungen)
