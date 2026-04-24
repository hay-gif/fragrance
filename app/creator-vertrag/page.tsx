"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const PARAGRAPHS = [
  {
    title: "§ 1 Vertragsparteien und Gegenstand",
    text: `Diese Vereinbarung regelt die Zusammenarbeit zwischen Fragrance OS (nachfolgend \u201EPlattform\u201C) und dem registrierten Creator (nachfolgend \u201ECreator\u201C). Der Creator erhält Zugang zu erweiterten Funktionen der Plattform zur Veröffentlichung eigener Düfte und physischer Produkte sowie zur Teilnahme am Provisionsmodell.`,
  },
  {
    title: "§ 2 Provisionsvergütung",
    text: "2.1 Der Creator erhält den mit ihm individuell vereinbarten Prozentsatz des Nettoverkaufspreises (nach Abzug von Zahlungsgebühren) für jeden über die Plattform vermittelten Verkauf seiner Düfte und physischen Produkte. Der vereinbarte Prozentsatz ist im Creator Dashboard einsehbar.\n\n2.2 Die Plattform behält den verbleibenden Anteil als Servicegebühr für Hosting, Zahlungsabwicklung, Marketing und technischen Betrieb.\n\n2.3 Beim Referral-Programm erhält der Creator 5 % Lifetime-Provision auf alle Käufe geworbener Kunden.",
  },
  {
    title: "§ 3 Auszahlungen",
    text: "3.1 Auszahlungen erfolgen monatlich über Stripe Connect auf das hinterlegte Bankkonto des Creators.\n\n3.2 Sofortauszahlungen (Instant Payout) sind auf Anfrage möglich und werden mit einer Gebühr von 1,5 % des Auszahlungsbetrags belastet. Diese Gebühr wird vom Auszahlungsbetrag des Creators abgezogen.\n\n3.3 Der Creator ist verpflichtet, alle für die Stripe-Connect-Verifizierung erforderlichen Daten wahrheitsgemäß anzugeben.\n\n3.4 Mindest­auszahlungs­betrag: 10,00 EUR.",
  },
  {
    title: "§ 4 Pflichten des Creators",
    text: "4.1 Der Creator stellt sicher, dass alle veröffentlichten Inhalte (Düfte, Produkte, Beschreibungen) rechtlich zulässig sind und keine Rechte Dritter verletzen.\n\n4.2 Physische Produkte müssen den angegebenen Produktbeschreibungen entsprechen und innerhalb der angegebenen Lieferzeit versandt werden.\n\n4.3 Der Creator ist umsatzsteuerrechtlich selbst verantwortlich und hat die Plattform über seinen steuerlichen Status (Kleinunternehmer oder regelbesteuert) zu informieren.\n\n4.4 Änderungen der Bankverbindung, Unternehmensform oder des steuerlichen Status sind unverzüglich mitzuteilen.",
  },
  {
    title: "§ 5 Haftung und Gewährleistung",
    text: "5.1 Der Creator haftet für alle Schäden, die durch fehlerhafte Produktangaben, mangelhafte Waren oder Rechtsverletzungen entstehen.\n\n5.2 Die Plattform haftet nicht für Ausfälle externer Dienstleister (Stripe, DHL u. a.), höhere Gewalt oder unverschuldete technische Störungen.\n\n5.3 Die Haftung der Plattform ist auf den Wert der betroffenen Transaktion begrenzt.",
  },
  {
    title: "§ 6 Geistiges Eigentum",
    text: "6.1 Der Creator räumt der Plattform ein nicht-exklusives, weltweites, kostenloses Nutzungsrecht an hochgeladenen Inhalten (Bilder, Texte, Duftkompositionen) für Marketingzwecke ein.\n\n6.2 Das Eigentum an den Inhalten verbleibt beim Creator.",
  },
  {
    title: "§ 7 Laufzeit und Kündigung",
    text: "7.1 Diese Vereinbarung gilt auf unbestimmte Zeit und kann von beiden Seiten mit 14-tägiger Frist gekündigt werden.\n\n7.2 Bei schwerwiegenden Verstößen (Betrug, Rechtsverletzungen) kann die Plattform den Creator-Account sofort sperren.\n\n7.3 Bei Kündigung werden ausstehende Provisionen innerhalb von 30 Tagen ausgezahlt.",
  },
  {
    title: "§ 8 Datenschutz",
    text: "8.1 Die Verarbeitung personenbezogener Daten des Creators erfolgt gemäß der Datenschutzerklärung der Plattform und der DSGVO.\n\n8.2 Zur Zahlungsabwicklung werden erforderliche Daten an Stripe Inc. weitergegeben.",
  },
  {
    title: "§ 9 Änderungen dieser Vereinbarung",
    text: "Die Plattform kann diese Vereinbarung mit 30-tägiger Ankündigung ändern. Der Creator gilt als einverstanden, wenn er die Plattform nach Ablauf der Ankündigungsfrist weiterhin nutzt.",
  },
  {
    title: "§ 10 Anwendbares Recht und Gerichtsstand",
    text: "Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Streitigkeiten aus diesem Vertrag ist Berlin.",
  },
];

export default function CreatorVertragPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [alreadyAccepted, setAlreadyAccepted] = useState<string | null>(null); // accepted_at date
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("creator_business_profiles")
        .select("agreement_accepted_at")
        .eq("creator_id", user.id)
        .maybeSingle();

      if (data?.agreement_accepted_at) {
        setAlreadyAccepted(data.agreement_accepted_at);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function acceptAgreement() {
    if (!userId || !fullName.trim() || !agreed) return;
    setSubmitting(true);
    setError("");

    const { authFetch } = await import("@/lib/authFetch");
    const res = await authFetch("/api/creator/accept-agreement", {
      method: "POST",
      body: JSON.stringify({ userId, fullName: fullName.trim() }),
    });

    const data = await res.json();
    if (data.success) {
      window.location.href = "/creator-dashboard";
    } else {
      setError(data.error ?? "Fehler beim Speichern. Bitte versuche es erneut.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* Header */}
      <section className="bg-[#0A0A0A] px-5 pt-20 pb-14">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Rechtliches</p>
          <h1 className="mt-3 text-3xl font-bold text-white">Creator-Vereinbarung</h1>
          <p className="mt-3 text-sm text-white/60">
            Version 1.0 · Stand: {new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long" })}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 pt-8">
        {/* Already accepted banner */}
        {alreadyAccepted && (
          <div className="mb-8 rounded-2xl bg-green-50 border border-green-200 p-5">
            <p className="text-sm font-semibold text-green-800">Vertrag bereits angenommen</p>
            <p className="mt-1 text-xs text-green-700">
              Du hast diese Vereinbarung am {new Date(alreadyAccepted).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })} verbindlich angenommen.
            </p>
            <Link
              href="/creator-dashboard"
              className="mt-3 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all"
            >
              Creator Dashboard
            </Link>
          </div>
        )}

        {/* Contract paragraphs */}
        <div className="space-y-6">
          {PARAGRAPHS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
              <h2 className="text-sm font-bold text-[#0A0A0A]">{p.title}</h2>
              <div className="mt-3 space-y-2">
                {p.text.split("\n\n").map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-[#4A4540]">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Acceptance form */}
        {!alreadyAccepted && (
          <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Vertragsannahme</p>
            <h2 className="mt-1 text-lg font-bold text-[#0A0A0A]">Verbindlich annehmen</h2>
            <p className="mt-2 text-xs text-[#6E6860]">
              Mit deiner Unterschrift bestätigst du, dass du diese Vereinbarung gelesen und verstanden hast und ihr verbindlich zustimmst.
            </p>

            {!userId && (
              <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F5F0EA] px-4 py-3">
                <p className="text-xs text-[#6E6860]">
                  Du musst eingeloggt sein um den Vertrag anzunehmen.{" "}
                  <Link href="/auth" className="underline">Einloggen →</Link>
                </p>
              </div>
            )}

            {userId && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">
                    Vollständiger Name (rechtsgültige Unterschrift) *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E5E0D8] accent-[#0A0A0A]"
                  />
                  <span className="text-xs text-[#6E6860] leading-relaxed">
                    Ich habe die Creator-Vereinbarung vollständig gelesen und erkläre mich damit verbindlich einverstanden. Ich bestätige, dass ich befugt bin, diese Vereinbarung in meinem Namen oder im Namen meines Unternehmens einzugehen.
                  </span>
                </label>

                {error && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
                )}

                <button
                  onClick={acceptAgreement}
                  disabled={submitting || !agreed || !fullName.trim()}
                  className="rounded-full bg-[#0A0A0A] px-6 py-3 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                >
                  {submitting ? "Wird gespeichert…" : "Vertrag verbindlich annehmen"}
                </button>

                <p className="text-[10px] text-[#C5C0B8]">
                  Datum und IP-Adresse werden zur Dokumentation der Annahme gespeichert.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 border-t border-[#E5E0D8] pt-6 text-center">
          <p className="text-xs text-[#9E9890]">
            Fragen zum Vertrag?{" "}
            <Link href="/profile" className="underline text-[#6E6860]">Kontakt aufnehmen</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
