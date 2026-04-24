import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Datenschutzerklärung</h1>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8 space-y-5 text-sm text-[#3A3530] leading-relaxed">

        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">⚠ Betreiber-Hinweis</p>
          <p className="text-xs text-red-700">
            Alle <span className="font-bold">[PFLICHTANGABE: ...]</span>-Felder müssen vor dem Launch befüllt werden.
            Außerdem: AV-Vertrag mit Supabase und Stripe abschließen, Cookie-Consent-Banner implementieren.
            Stand dieser Erklärung: März 2026.
          </p>
        </div>

        {/* 1. Verantwortlicher */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">1. Verantwortlicher (Art. 13 Abs. 1 lit. a DSGVO)</p>
          <p className="text-[#6E6860]">Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
          <p className="mt-2 font-medium border-b border-red-400 text-red-600">
            [PFLICHTANGABE: Name / Firmenname, Straße, PLZ, Stadt, E-Mail, ggf. Telefon]
          </p>
          <p className="mt-3 text-[#6E6860]">
            Datenschutzbeauftragter: <span className="border-b border-amber-400 text-amber-700">[Falls vorhanden oder gesetzlich erforderlich: Name und Kontakt eintragen, sonst diesen Satz entfernen]</span>
          </p>
        </div>

        {/* 2. Datenverarbeitungen */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6 space-y-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">2. Datenverarbeitungen im Einzelnen (Art. 13 Abs. 1 lit. c, d DSGVO)</p>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">a) Registrierung & Account</p>
            <p className="text-[#6E6860] mt-1">
              Bei der Registrierung erheben wir E-Mail-Adresse und Passwort (verschlüsselt).
              Optional: Anzeigename, Profilbild, Bio, Social-Links.
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Speicherdauer: bis Kontolöschung, danach anonymisiert, außer Aufbewahrungspflichten nach HGB/AO.</p>
          </div>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">b) Bestellungen und Zahlungen</p>
            <p className="text-[#6E6860] mt-1">
              Zur Abwicklung von Bestellungen verarbeiten wir: Name, Lieferadresse, E-Mail, Bestellinhalt,
              Gesamtbetrag, Zahlungsstatus. Zahlungsdaten (Kreditkarte, SEPA) werden ausschließlich durch
              Stripe verarbeitet — wir speichern keine vollständigen Zahlungsdaten.
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: 10 Jahre (§ 147 AO, § 257 HGB — steuer- und handelsrechtliche Aufbewahrungspflicht).</p>
          </div>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">c) Nutzungsanalyse und Tracking</p>
            <p className="text-[#6E6860] mt-1">
              Wir erfassen anonymisierte Nutzungsereignisse (aufgerufene Seiten, angesehene Düfte,
              Suchanfragen) in unserer internen Datenbank. Dies dient der Verbesserung des Angebots.
              Eine Verknüpfung mit externen Tracking-Diensten findet nur nach Einwilligung statt.
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Produktverbesserung). Widerspruchsrecht: jederzeit per E-Mail. Speicherdauer: 90 Tage rollierend.</p>
          </div>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">d) Personalisierter Feed & KI-Empfehlungen (Art. 22 DSGVO)</p>
            <p className="text-[#6E6860] mt-1">
              Zur Personalisierung des Produkt-Feeds verwenden wir einen Algorithmus, der anhand Ihrer
              Duftstil-Präferenzen, Likes, Kaufhistorie und Nutzungsverhalten personalisierte Empfehlungen
              berechnet. Dies stellt ein <strong>Profiling</strong> im Sinne des Art. 4 Nr. 4 DSGVO dar.
            </p>
            <p className="text-[#6E6860] mt-1">
              Involvierte Logik: Scoring-Algorithmus gewichtet Präferenz-Übereinstimmungen (Duftstil,
              Inhaltsstoffe), Popularität und Creator-Reputation. Es erfolgen keine automatisierten
              Entscheidungen mit rechtlicher oder ähnlich bedeutsamer Wirkung (Art. 22 Abs. 1 DSGVO).
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an relevantem Produkterlebnis). Widerspruchsrecht: jederzeit. Sie können den personalisierten Feed in den Kontoeinstellungen deaktivieren.</p>
          </div>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">e) Creator-KYC und Auszahlungen (§ 22f UStG, DAC7)</p>
            <p className="text-[#6E6860] mt-1">
              Für Creator auf unserer Plattform erheben wir zur Erfüllung gesetzlicher Pflichten:
              vollständigen Namen (Klarname), vollständige Anschrift, Steueridentifikationsnummer oder
              USt-IdNr., Bankverbindung (IBAN), ggf. Unternehmensnachweis sowie Identitätsnachweise
              über Stripe Connect (Ausweisdaten). Diese Daten sind nach § 22f UStG zwingend erforderlich
              und werden für die jährliche DAC7-Meldung an das Bundeszentralamt für Steuern (BZSt) genutzt.
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung § 22f UStG, DAC7). Speicherdauer: 10 Jahre (§ 22f Abs. 2 UStG i.V.m. § 147 AO).</p>
          </div>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">f) Referral-System</p>
            <p className="text-[#6E6860] mt-1">
              Bei Registrierung über einen Referral-Link speichern wir die Zuordnung (welcher Creator hat
              den neuen Nutzer geworben). Diese Daten werden für die Provisionsabrechnung benötigt.
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Speicherdauer: Laufzeit des Vertragsverhältnisses + 10 Jahre.</p>
          </div>

          <div className="border-l-2 border-[#E5E0D8] pl-4">
            <p className="font-medium text-[#0A0A0A]">g) Newsletter</p>
            <p className="text-[#6E6860] mt-1">
              Falls Sie sich für unseren Newsletter angemeldet haben, verarbeiten wir Ihre E-Mail-Adresse
              zum Versand von Produktneuheiten und Angeboten. Abmeldung jederzeit über den Link im Newsletter.
            </p>
            <p className="text-xs text-[#9E9890] mt-1">Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Speicherdauer: bis Widerruf der Einwilligung.</p>
          </div>
        </div>

        {/* 3. Auftragsverarbeiter */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">3. Auftragsverarbeiter und Drittanbieter (Art. 28 DSGVO)</p>
          <p className="text-xs text-[#9E9890]">Mit allen nachfolgenden Anbietern wurden oder werden Auftragsverarbeitungsverträge (AV-Verträge) abgeschlossen.</p>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-[#0A0A0A]">Supabase, Inc. (USA)</p>
              <p className="text-[#6E6860] text-xs mt-0.5">
                Datenbankhosting, Authentifizierung, Datei-Storage. Serverstandort: EU (AWS EU-Central). Drittlandübermittlung in die USA möglich
                (Supabase Inc. ist US-Unternehmen); abgesichert durch EU-Standardvertragsklauseln (SCCs) gemäß Art. 46 Abs. 2 lit. c DSGVO.
              </p>
              <p className="text-xs text-[#C5C0B8] mt-0.5">Datenschutzinformationen: supabase.com/privacy</p>
            </div>

            <div>
              <p className="font-medium text-[#0A0A0A]">Stripe, Inc. (USA)</p>
              <p className="text-[#6E6860] text-xs mt-0.5">
                Zahlungsabwicklung, Creator-Auszahlungen (Stripe Connect), KYC-Verifizierung. Drittlandübermittlung in die USA; abgesichert durch SCCs
                und Stripe Data Processing Agreement (DPA). Stripe verarbeitet Zahlungs- und Identitätsdaten eigenverantwortlich als gemeinsamer Verantwortlicher
                für regulierte Finanzdienstleistungen.
              </p>
              <p className="text-xs text-[#C5C0B8] mt-0.5">Datenschutzinformationen: stripe.com/privacy</p>
            </div>

            <div>
              <p className="font-medium text-[#0A0A0A]">DHL Paket GmbH (Deutschland)</p>
              <p className="text-[#6E6860] text-xs mt-0.5">
                Versandabwicklung. Name und Lieferadresse werden zur Erstellung von Versandlabeln übermittelt.
              </p>
              <p className="text-xs text-[#C5C0B8] mt-0.5">Datenschutzinformationen: dhl.de/datenschutz</p>
            </div>

            <div>
              <p className="font-medium text-[#0A0A0A]">Anthropic, PBC (USA) <span className="text-xs font-normal text-[#9E9890]">(falls KI-Funktionen genutzt)</span></p>
              <p className="text-[#6E6860] text-xs mt-0.5">
                KI-gestützte Duftempfehlungen und Textgenerierung. Eingaben an die KI können personenbezogene Daten enthalten.
                Drittlandübermittlung in die USA; abgesichert durch SCCs.
              </p>
              <p className="text-xs text-[#C5C0B8] mt-0.5">Datenschutzinformationen: anthropic.com/privacy</p>
            </div>
          </div>
        </div>

        {/* 4. Cookies */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">4. Cookies und ähnliche Technologien (§ 25 TTDSG)</p>
          <p className="text-[#6E6860]">
            Wir verwenden Cookies und ähnliche Technologien. Technisch notwendige Cookies (Session-Cookies
            für die Authentifizierung) werden ohne Einwilligung gesetzt. Alle anderen Cookies — insbesondere
            für Analytics und Personalisierung — werden nur nach Ihrer ausdrücklichen Einwilligung gesetzt.
          </p>
          <div className="mt-3 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-xs">
            <div className="grid grid-cols-3 gap-2 font-medium text-[#0A0A0A] mb-2">
              <span>Cookie-Typ</span><span>Zweck</span><span>Einwilligung</span>
            </div>
            {[
              ["Supabase Auth Session", "Anmeldung / Session", "Nein (notwendig)"],
              ["Analytics-Cookies", "Nutzungsanalyse", "Ja — Einwilligung"],
              ["Personalisierung", "Feed-Algorithmus", "Ja — Einwilligung"],
              ["Stripe Payment", "Zahlungsabwicklung", "Nein (notwendig)"],
            ].map(([type, purpose, consent]) => (
              <div key={type} className="grid grid-cols-3 gap-2 py-1 border-t border-[#F0EDE8] text-[#6E6860]">
                <span>{type}</span><span>{purpose}</span>
                <span className={consent.startsWith("Ja") ? "text-amber-700" : "text-green-700"}>{consent}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#9E9890]">
            Sie können Ihre Einwilligung jederzeit widerrufen. Cookie-Einstellungen sind über den Link im Footer zugänglich.
          </p>
        </div>

        {/* 5. Betroffenenrechte */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">5. Ihre Rechte (Art. 15–21 DSGVO)</p>
          <div className="space-y-2 text-[#6E6860]">
            {[
              ["Auskunft (Art. 15)", "Welche Daten wir über Sie gespeichert haben"],
              ["Berichtigung (Art. 16)", "Korrektur unrichtiger Daten"],
              ["Löschung (Art. 17)", "Löschung Ihrer Daten (\"Recht auf Vergessenwerden\") — sofern keine Aufbewahrungspflichten entgegenstehen"],
              ["Einschränkung (Art. 18)", "Einschränkung der Verarbeitung in bestimmten Fällen"],
              ["Datenportabilität (Art. 20)", "Erhalt Ihrer Daten in maschinenlesbarem Format"],
              ["Widerspruch (Art. 21)", "Widerspruch gegen Verarbeitung auf Basis berechtigter Interessen (inkl. Profiling/Feed-Algorithmus)"],
              ["Widerruf (Art. 7 Abs. 3)", "Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft"],
            ].map(([right, desc]) => (
              <div key={right} className="flex gap-3">
                <span className="font-medium text-[#0A0A0A] shrink-0 w-40">{right}</span>
                <span className="text-xs">{desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[#6E6860]">
            Für alle Datenschutzanfragen:{" "}
            <span className="font-medium border-b border-red-400 text-red-600">[PFLICHTANGABE: datenschutz@ihre-domain.de]</span>
          </p>
        </div>

        {/* 6. Beschwerderecht */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">6. Beschwerderecht (Art. 77 DSGVO)</p>
          <p className="text-[#6E6860]">
            Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die zuständige
            Behörde richtet sich nach Ihrem Wohnort. Für Deutschland gilt primär der/die Landesbeauftragte
            für Datenschutz des jeweiligen Bundeslandes. Bundesebene:{" "}
            <span className="font-medium text-[#0A0A0A]">Bundesbeauftragter für den Datenschutz und die Informationsfreiheit (BfDI)</span>,
            Graurheindorfer Straße 153, 53117 Bonn, poststelle@bfdi.bund.de.
          </p>
        </div>

        {/* 7. Speicherdauer-Übersicht */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">7. Speicherdauer</p>
          <div className="space-y-2 text-xs text-[#6E6860]">
            {[
              ["Account-Daten", "Bis Kontolöschung; danach 30 Tage Löschfrist"],
              ["Bestelldaten", "10 Jahre (§ 147 AO, § 257 HGB)"],
              ["Creator-KYC-Daten", "10 Jahre (§ 22f Abs. 2 UStG)"],
              ["Analytics-Events", "90 Tage rollierend"],
              ["Referral-Attribution", "Laufzeit + 10 Jahre"],
              ["E-Mail-Kommunikation", "3 Jahre (Verjährungsfrist § 195 BGB) oder bis Löschanfrage"],
            ].map(([category, duration]) => (
              <div key={category} className="flex gap-3">
                <span className="font-medium text-[#0A0A0A] shrink-0 w-44">{category}</span>
                <span>{duration}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-[#9E9890]">
          <Link href="/impressum" className="hover:text-[#0A0A0A] transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/agb" className="hover:text-[#0A0A0A] transition-colors">AGB</Link>
          <span>·</span>
          <Link href="/widerruf" className="hover:text-[#0A0A0A] transition-colors">Widerruf</Link>
        </div>
      </div>
    </main>
  );
}
