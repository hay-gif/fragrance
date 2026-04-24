import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Impressum</h1>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8 space-y-5 text-sm text-[#3A3530] leading-relaxed">

        {/* Pflichtangaben-Banner */}
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">⚠ Betreiber-Hinweis</p>
          <p className="text-xs text-red-700">
            Alle mit <span className="font-bold">[PFLICHTANGABE: ...]</span> markierten Felder müssen vor dem Launch
            mit Ihren echten Unternehmensdaten befüllt werden. Ein unvollständiges Impressum ist gemäß § 5 DDG
            bußgeldbewehrt (bis 50.000 EUR) und nach UWG abmahnbar.
          </p>
        </div>

        {/* Angaben gemäß § 5 DDG */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-4">Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)</p>

          <div className="space-y-1">
            <p className="font-semibold text-[#0A0A0A]">
              <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: Vollständiger Name oder Firmenname inkl. Rechtsform, z.B. Max Mustermann oder Fragrance OS GmbH]</span>
            </p>
            <p className="text-[#6E6860]">
              <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: Straße und Hausnummer — keine Postfachadresse zulässig!]</span>
            </p>
            <p className="text-[#6E6860]">
              <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: PLZ und Stadt]</span>
            </p>
            <p className="text-[#6E6860]">Deutschland</p>
          </div>

          {/* Gesetzliche Vertreter (bei GmbH/UG etc.) */}
          <div className="mt-4 pt-4 border-t border-[#F0EDE8]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-2">Gesetzliche Vertretung</p>
            <p className="text-[#6E6860]">
              <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE bei Gesellschaft: Vertretungsberechtigte Person(en), z.B. „Geschäftsführer: Max Mustermann" — bei Einzelunternehmer nicht notwendig]</span>
            </p>
          </div>
        </div>

        {/* Kontakt */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Kontakt</p>
          <div className="space-y-1 text-[#6E6860]">
            <p>Telefon: <span className="border-b border-amber-400 text-amber-700">[EMPFOHLEN: +49 ...]</span> <span className="text-xs text-[#C5C0B8]">(seit EuGH C-649/17 nicht zwingend, aber empfohlen)</span></p>
            <p>E-Mail: <span className="font-medium border-b border-red-400 text-red-600">[PFLICHTANGABE: kontakt@ihre-domain.de]</span></p>
          </div>
        </div>

        {/* Registergericht */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Handelsregister</p>
          <p className="text-[#6E6860]">
            <span className="border-b border-amber-400 text-amber-700">[NUR EINTRAGEN falls im Handelsregister eingetragen: Amtsgericht [Ort], HRB/HRA [Nummer] — bei Einzelunternehmen ohne HR-Eintrag: diesen Abschnitt entfernen]</span>
          </p>
        </div>

        {/* USt-IdNr. */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Umsatzsteuer-Identifikationsnummer (§ 27a UStG)</p>
          <p className="text-[#6E6860]">
            USt-IdNr.: <span className="font-medium border-b border-red-400 text-red-600">[PFLICHTANGABE wenn vorhanden: DE + 9 Ziffern, z.B. DE123456789 — beim Finanzamt beantragen falls noch nicht vorhanden]</span>
          </p>
          <p className="mt-2 text-xs text-[#9E9890]">
            Die USt-IdNr. ist erforderlich, wenn grenzüberschreitende EU-Geschäfte stattfinden oder wenn gesetzlich verpflichtet.
          </p>
        </div>

        {/* Inhaltlich Verantwortlicher */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Inhaltlich verantwortlich gemäß § 55 Abs. 2 MStV</p>
          <p className="text-[#6E6860]">
            <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: Vollständiger Name der verantwortlichen Person, Anschrift wie oben]</span>
          </p>
        </div>

        {/* EU-Streitschlichtung */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Streitschlichtung (EU-ODR-Verordnung Nr. 524/2013)</p>
          <p className="text-[#6E6860]">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#0A0A0A]"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="mt-2 text-[#6E6860]">
            Unsere E-Mail-Adresse lautet:{" "}
            <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: kontakt@ihre-domain.de]</span>
          </p>
          <p className="mt-2 text-[#6E6860]">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        {/* Haftungsausschluss */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Haftungsausschluss</p>

          <div>
            <p className="font-medium text-[#0A0A0A] mb-1">Haftung für eigene Inhalte (§ 7 Abs. 1 DDG)</p>
            <p className="text-[#6E6860]">
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den
              allgemeinen Gesetzen verantwortlich. Wir übernehmen keine Haftung für Inhalte, die von Creators
              auf der Plattform eingestellt werden, sofern wir keine Kenntnis von deren Rechtswidrigkeit haben
              und nach Kenntnisnahme unverzüglich handeln.
            </p>
          </div>

          <div>
            <p className="font-medium text-[#0A0A0A] mb-1">Haftung für fremde Inhalte (§§ 8–10 DDG)</p>
            <p className="text-[#6E6860]">
              Als Plattformbetreiber sind wir nach §§ 8–10 DDG nicht verpflichtet, übermittelte oder gespeicherte
              fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
              hinweisen. Verpflichtungen zur Entfernung oder Sperrung nach den allgemeinen Gesetzen bleiben hiervon
              unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
              Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese
              Inhalte umgehend entfernen.
            </p>
          </div>

          <div>
            <p className="font-medium text-[#0A0A0A] mb-1">Haftung für Links</p>
            <p className="text-[#6E6860]">
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben.
              Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
              Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten
              wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren
              zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten
              ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </div>
        </div>

        {/* Kosmektikrecht / Verantwortliche Person */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Verantwortliche Person (EU-Kosmetikverordnung 1223/2009)</p>
          <p className="text-[#6E6860]">
            Gemäß Art. 4 der Verordnung (EG) Nr. 1223/2009 über kosmetische Mittel ist für jedes auf dem EU-Markt
            bereitgestellte Produkt eine verantwortliche Person benannt. Die verantwortliche Person für alle auf
            dieser Plattform verkauften kosmetischen Mittel ist:
          </p>
          <p className="mt-3 font-medium border-b border-red-400 text-red-600">
            [PFLICHTANGABE: Name und Anschrift der verantwortlichen Person (RP) gemäß Art. 4 Abs. 1 KVO — kann identisch mit dem Betreiber sein oder ein beauftragter Dritter mit EU-Sitz]
          </p>
          <p className="mt-2 text-xs text-[#9E9890]">
            Produktinformationsdateien (PIF) gemäß Art. 11 KVO sind bei der verantwortlichen Person archiviert.
            Zuständige Behörde für Marktüberwachung: Bundesamt für Verbraucherschutz und Lebensmittelsicherheit (BVL).
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-[#9E9890]">
          <Link href="/datenschutz" className="hover:text-[#0A0A0A] transition-colors">Datenschutz</Link>
          <span>·</span>
          <Link href="/agb" className="hover:text-[#0A0A0A] transition-colors">AGB</Link>
          <span>·</span>
          <Link href="/widerruf" className="hover:text-[#0A0A0A] transition-colors">Widerruf</Link>
        </div>
      </div>
    </main>
  );
}
