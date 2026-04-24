/**
 * Zentrale Hilfe-Texte für InfoTooltip-Buttons.
 * Import: import { HELP } from "@/lib/helpTexts";
 * Verwendung: <InfoTooltip text={HELP.admin.commissionPercent} />
 */

export const HELP = {

  // ──────────────────────────────────────────
  // Admin
  // ──────────────────────────────────────────
  admin: {
    role: "Die Rolle bestimmt welche Seiten ein Nutzer sehen und bearbeiten kann. 'creator' darf Düfte veröffentlichen, 'production' sieht den Produktionsbereich, 'marketing' sieht Analytics.",
    creatorStatus: "'none' = normaler Nutzer. 'invited' = hat Einladung erhalten. 'unlocked' = aktiver Creator mit eigenem Dashboard.",
    publicSlots: "Anzahl der Düfte die ein Creator gleichzeitig öffentlich stellen darf.",
    commissionPercent: "Prozentualer Anteil am Verkaufspreis den der Creator pro Bestellung verdient.",
    lifetimeCommissionPercent: "Provision die ein Creator auf alle zukünftigen Käufe von geworbenen Nutzern erhält (lebenslang).",
    affiliateCommissionPercent: "Provision für Affiliate-Partner die über ihren Link Neukunden bringen (einmalig pro Kauf).",
    affiliateContractNote: "Interne Notiz zum Affiliate-Vertrag (nur für Admins sichtbar).",
    orderStatus: "created = Zahlung bestätigt. processing = in Bearbeitung. shipped = versendet. delivered = zugestellt. cancelled = storniert.",
    payoutStatus: "pending = noch nicht fällig. payable = bereit zur Auszahlung. paid = ausgezahlt. rejected = abgelehnt.",
    challengeStatus: "draft = nicht sichtbar. active = Einreichungen möglich. judging = Auswertungsphase. ended = abgeschlossen.",
    analyticsEvents: "Event-Typen die von Nutzern auf der Plattform ausgelöst werden. Jeder Event wird in der user_events-Tabelle gespeichert.",
  },

  // ──────────────────────────────────────────
  // Production
  // ──────────────────────────────────────────
  production: {
    batchSize: "Empfohlene Produktionsmenge basierend auf aktuellen Bestellungen + 20% Puffer.",
    resourceForecast: "KI-Vorhersage des Accord-Bedarfs für die nächsten Tage. Der Algorithmus lernt aus Fehlern und wird mit jedem Abruf präziser.",
    forecastConfidence: "Hoch = 30+ Datenpunkte. Mittel = 14–30 Tage. Niedrig = weniger als 14 Tage Historie.",
    forecastTrend: "Positive Werte = steigender Bedarf. Negative Werte = sinkender Bedarf. Einheit: g/Tag/Tag.",
    forecastHorizon: "7 Tage = kurzfristiger Bedarf für laufende Woche. 30 Tage = monatliche Planung. 90 Tage = Einkaufsplanung.",
    accordGrams: "Berechneter Verbrauch in Gramm. Basiert auf Komposition (%) × Duftvolumen (ml) × Bestellmenge.",
    mixingGuide: "Vollständige Mischungsanleitung mit genauen Gramm-Angaben pro Komponente basierend auf der Rezeptur.",
    orderQueue: "Alle bestätigten Bestellungen (status = created) die noch nicht in Produktion gegangen sind.",
  },

  // ──────────────────────────────────────────
  // Finance
  // ──────────────────────────────────────────
  finance: {
    taxEntry: "Automatisch generierter steuerlicher Eintrag. 'income' = Einnahme für Creator/Affiliate. 'expense' = Ausgabe der Plattform.",
    vatPercent: "Mehrwertsteuersatz der auf diesen Betrag anfällt. Für Provision-Einkünfte von Privatpersonen gilt 0 %.",
    payoutRequest: "Auszahlungsanfrage eines Creators. 'payable' = bereit für Transfer. Stripe-Transfer wird über /api/stripe/payout ausgeführt.",
    shareBalance: "Guthaben aus Teilen-Provisionen (10 % pro Kauf über Share-Link). Auszahlung ab 15 € möglich.",
    creatorCommission: "Creators erhalten standardmäßig 25 % des Verkaufspreises. Individuelle Sätze sind per Creator konfigurierbar.",
    revenueTotal: "Gesamteinnahmen nach Abzug von Creator-Provisionen, Affiliate-Zahlungen und Rückerstattungen.",
  },

  // ──────────────────────────────────────────
  // Creator Dashboard
  // ──────────────────────────────────────────
  creator: {
    referralLink: "Dein persönlicher Empfehlungs-Link. Wenn jemand darüber kauft erhältst du Lifetime-Provision auf alle zukünftigen Käufe.",
    shareLink: "Fragrance-spezifischer Link. Du verdienst 10 % auf jeden Kauf über diesen Link (keine Anmeldung nötig).",
    lifetimeEarnings: "Summe aller Provisionen über alle Bestellungen und Perioden.",
    pendingPayout: "Provisionen die noch nicht ausgezahlt wurden. Auszahlungen erfolgen nach Prüfung durch das Finance-Team.",
    publicSlots: "Du kannst so viele Düfte gleichzeitig öffentlich stellen. Weitere Slots können über ein höheres Abo freigeschaltet werden.",
  },

  // ──────────────────────────────────────────
  // Orders / Cart
  // ──────────────────────────────────────────
  orders: {
    trackingCode: "DHL-Sendungsnummer. Damit kannst du die Sendung auf DHL.de verfolgen.",
    loyaltyPoints: "1 Punkt pro ausgegebenem Euro. Punkte können für Rabatte oder exklusive Produkte eingelöst werden.",
    variantPicker: "Wähle Größe und Intensität. Unterschiedliche Varianten sind separat im Warenkorb.",
  },

  // ──────────────────────────────────────────
  // KI-Abo
  // ──────────────────────────────────────────
  kiAbo: {
    subscription: "Das KI-Abo sendet dir jeden Monat eine personalisierte Duft-Empfehlung basierend auf deinen Präferenzen und aktuellen Trends.",
    shippingAddress: "Lieferadresse für dein monatliches Duft-Paket. Kann jederzeit in deinem Profil geändert werden.",
  },

  // ──────────────────────────────────────────
  // Compliance / Inventory
  // ──────────────────────────────────────────
  compliance: {
    ifraLimit: "IFRA = International Fragrance Association. Das Limit gibt die maximale Einsatzkonzentration für diesen Rohstoff im jeweiligen Produkttyp an.",
    inciName: "INCI = International Nomenclature of Cosmetic Ingredients. Der standardisierte chemische Name der auf der Produktverpackung deklariert werden muss.",
    allergenDeclaration: "Allergene müssen ab 0,001 % (leave-on) bzw. 0,01 % (rinse-off) auf der Verpackung deklariert werden (EU-Kosmetikverordnung).",
    sdsDocument: "SDS = Safety Data Sheet (Sicherheitsdatenblatt). Pflichtdokument für gefährliche Stoffe nach REACH-Verordnung.",
  },

} as const;

export type HelpKey = keyof typeof HELP;
