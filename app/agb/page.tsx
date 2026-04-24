import Link from "next/link";

export default function AgbPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Allgemeine Geschäftsbedingungen</h1>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8 space-y-4 text-sm text-[#3A3530] leading-relaxed">

        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">⚠ Betreiber-Hinweis</p>
          <p className="text-xs text-red-700">
            Alle <span className="font-bold">[PFLICHTANGABE: ...]</span>-Felder müssen vor dem Launch befüllt werden.
            Die AGB sind maßgeblich für Ihre Haftung gegenüber Kunden und Creators. Stand: März 2026.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 1 Geltungsbereich und Anbieter</p>
          <p className="text-[#6E6860]">
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle über die Plattform <strong>Fragrance OS</strong>{" "}
            abgeschlossenen Kaufverträge zwischen dem Betreiber:
          </p>
          <p className="mt-2 font-medium border-b border-red-400 text-red-600">
            [PFLICHTANGABE: Firmenname, Adresse, E-Mail — identisch mit Impressum]
          </p>
          <p className="mt-3 text-[#6E6860]">
            (nachfolgend <strong>„Anbieter"</strong>) und Käufern (nachfolgend <strong>„Kunde"</strong>).
            Abweichende AGB des Kunden werden nicht anerkannt, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich zu.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Die Plattform betreibt ein Marketplace-Modell: Unabhängige Creator stellen Duftformeln zur Verfügung,
            der Anbieter fungiert als Verkäufer und Hersteller gegenüber dem Kunden (<strong>Kommissionsmodell</strong>).
            Vertragspartner des Kunden ist stets der Anbieter, nicht der Creator.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 2 Vertragsschluss</p>
          <p className="text-[#6E6860]">
            Die Darstellung der Produkte auf der Plattform stellt kein rechtlich bindendes Angebot, sondern
            eine Aufforderung zur Bestellung (<em>invitatio ad offerendum</em>) dar. Durch das Absenden
            der Bestellung gibt der Kunde ein verbindliches Kaufangebot ab.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Der Vertrag kommt zustande, wenn der Anbieter die Bestellung per E-Mail (Auftragsbestätigung)
            annimmt oder die Ware zur Herstellung freigibt. Der Anbieter ist berechtigt, Bestellungen
            ohne Angabe von Gründen abzulehnen (z. B. bei fehlerhafter Preisanzeige oder Kapazitätsengpässen).
          </p>
          <p className="mt-3 text-[#6E6860]">
            Vor Absenden der Bestellung muss der Kunde die AGB, die Datenschutzerklärung und
            — bei Standardprodukten — die Widerrufsbelehrung durch Setzen eines Häkchens bestätigen.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 3 Preise, Steuern und Grundpreisangabe</p>
          <p className="text-[#6E6860]">
            Alle Preise sind Endpreise in Euro und enthalten die gesetzliche Mehrwertsteuer (derzeit 19 %).
            Zusätzliche Versandkosten werden im Bestellprozess gesondert ausgewiesen.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Gemäß § 4 Preisangabenverordnung (PAngV) wird bei Parfüm ein <strong>Grundpreis pro 100 ml</strong>{" "}
            auf der Produktseite angegeben.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Etwaige Preisnachlässe beziehen sich gemäß § 11 PAngV (Umsetzung der Omnibus-Richtlinie) auf
            den <strong>niedrigsten Preis der letzten 30 Tage</strong> vor der Preisreduzierung.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 4 Zahlung</p>
          <p className="text-[#6E6860]">
            Die Zahlung erfolgt über den Zahlungsdienstleister <strong>Stripe</strong> (Kreditkarte, SEPA-Lastschrift,
            weitere Methoden nach Verfügbarkeit). Die Abbuchung erfolgt nach Absenden der Bestellung.
            Der Anbieter speichert keine vollständigen Zahlungsdaten.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Bei Nichtzahlung oder Rückbuchung behält sich der Anbieter vor, die Bestellung zu stornieren
            und etwaige Inkassokosten geltend zu machen.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 5 Lieferung</p>
          <p className="text-[#6E6860]">
            Die Lieferung erfolgt ausschließlich per Versand (Standard: DHL) innerhalb Deutschlands sowie
            in weitere EU-Länder nach Verfügbarkeit. Die Lieferzeit beträgt in der Regel{" "}
            <span className="border-b border-amber-400 text-amber-700">[EINTRAGEN: z.B. 7–14]</span>{" "}
            Werktage ab Zahlungseingang, da jedes Produkt individuell hergestellt wird. Eine verbindliche
            Lieferzeitgarantie ist aufgrund des handwerklichen Herstellungsprozesses ausgeschlossen.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Das Eigentum an der Ware geht erst mit vollständiger Bezahlung auf den Kunden über
            (<strong>erweiterter Eigentumsvorbehalt</strong>).
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 6 Widerrufsrecht</p>
          <p className="text-[#6E6860]">
            Verbrauchern steht grundsätzlich ein <strong>14-tägiges Widerrufsrecht</strong> ab Warenerhalt zu
            (§ 312g BGB). Die vollständige Widerrufsbelehrung sowie das Muster-Widerrufsformular sind
            unter{" "}
            <Link href="/widerruf" className="underline text-[#0A0A0A]">fragrance-os.de/widerruf</Link>{" "}
            abrufbar und werden mit jeder Bestellbestätigung übermittelt.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900 text-xs uppercase tracking-wider mb-2">Ausnahmen vom Widerrufsrecht</p>
            <ul className="space-y-2 text-amber-900 text-xs">
              <li>
                <strong>§ 312g Abs. 2 Nr. 1 BGB — Maßanfertigung:</strong> Bei Düften, deren Zusammensetzung
                der Kunde individuell konfiguriert hat (eigene Rezeptur, Accord-Auswahl etc.), besteht
                <strong> kein Widerrufsrecht</strong>. Dies wird im Bestellprozess vor Abschluss ausdrücklich
                kommuniziert.
              </li>
              <li>
                <strong>§ 312g Abs. 2 Nr. 5 BGB — Versiegelung aus Hygienegründen:</strong> Bei versiegelten
                Parfüm-Flakons erlischt das Widerrufsrecht, sobald die Schutzversiegelung nach Lieferung entfernt
                wurde, sofern der Hinweis hierauf im Bestellprozess erfolgte.
              </li>
            </ul>
          </div>

          <p className="mt-3 text-[#6E6860] text-xs">
            Standard-Katalog-Düfte (vorgefertigte Creator-Düfte, die nicht individuell konfiguriert wurden)
            unterliegen dem vollen 14-tägigen Widerrufsrecht.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 7 Mängelhaftung / Gewährleistung</p>
          <p className="text-[#6E6860]">
            Es gelten die gesetzlichen Gewährleistungsrechte. Bei Sachmängeln kann der Kunde zunächst
            Nacherfüllung (Nachlieferung oder Nachbesserung) verlangen; schlägt dies zweimal fehl, kann er
            vom Vertrag zurücktreten oder den Kaufpreis mindern. Die Gewährleistungsfrist beträgt 2 Jahre
            ab Warenerhalt (§§ 434 ff. BGB i.V.m. der Warenkauf-Richtlinie 2019/771/EU).
          </p>
          <p className="mt-3 text-[#6E6860]">
            <strong>Hinweis zu kosmetischen Mitteln:</strong> Da Düfte auf natürlichen Rohstoffen basieren,
            können leichte Chargenunterschiede im Duftbild auftreten. Diese stellen keinen Sachmangel dar,
            sofern die Hauptcharaktereigenschaften der Zusammensetzung erhalten bleiben.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 8 Haftungsbeschränkung</p>
          <p className="text-[#6E6860]">
            Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder
            der Gesundheit, für vorsätzliche oder grob fahrlässige Pflichtverletzungen sowie nach dem
            Produkthaftungsgesetz (ProdHaftG).
          </p>
          <p className="mt-3 text-[#6E6860]">
            Für leicht fahrlässige Verletzungen wesentlicher Vertragspflichten (Kardinalpflichten) ist die
            Haftung auf den vertragstypisch vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung
            für leichte Fahrlässigkeit ausgeschlossen.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6 space-y-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">§ 9 Creator-Programm</p>
          <p className="text-[#6E6860]">
            Creator können eigene Duftformeln auf der Plattform einstellen. Die Creator-Vereinbarung
            (Creator-Vertrag) ist Bestandteil des Vertragsverhältnisses zwischen Creator und Anbieter
            und regelt Provisionen, Pflichten und Haftungsfragen.
          </p>

          <div className="space-y-3 text-xs text-[#6E6860]">
            <div className="flex gap-2">
              <span className="font-medium text-[#0A0A0A] shrink-0 w-36">Compliance-Pflicht:</span>
              <span>Jedes Creator-Produkt muss vor der Veröffentlichung das vollständige Compliance-Verfahren
              (PIF gemäß Art. 11 EU-KVO 1223/2009, CPSR durch qualifizierte Sicherheitsperson, CPNP-Notifizierung)
              durchlaufen haben. Kein Produkt darf ohne <em>compliance_status = approved_for_sale</em> veröffentlicht werden.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-[#0A0A0A] shrink-0 w-36">Verantwortliche Person:</span>
              <span>Der Anbieter übernimmt die Rolle der verantwortlichen Person (RP) gemäß Art. 4 EU-KVO 1223/2009
              für alle auf der Plattform verkauften kosmetischen Mittel. Creator erklären sich damit einverstanden,
              dass Produktinformationsdateien (PIF) beim Anbieter hinterlegt werden.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-[#0A0A0A] shrink-0 w-36">Auszahlungsvoraussetzung:</span>
              <span>Provisionsauszahlungen erfolgen ausschließlich nach vollständiger KYC-Verifikation,
              Angabe der Steueridentifikationsnummer (oder USt-IdNr. bei regelbesteuerten Unternehmern),
              Akzeptanz der Creator-Vereinbarung und aktiver Stripe-Connect-Einrichtung. Pflicht gemäß § 22f UStG.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-[#0A0A0A] shrink-0 w-36">Provision:</span>
              <span>Der Provisionssatz wird im Creator-Vertrag individuell festgelegt. Bei Storno, Widerruf oder
              Rückbuchung einer Bestellung verfällt der Provisionsanspruch für den jeweiligen Artikel.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-[#0A0A0A] shrink-0 w-36">Lifetime-Provision:</span>
              <span>Die Lifetime-Provision (Provision auf Käufe geworbener Nutzer) ist ein Dauerschuldverhältnis
              im Sinne des § 314 BGB und kann mit einer Frist von 3 Monaten zum Monatsende gekündigt werden.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-[#0A0A0A] shrink-0 w-36">DAC7-Pflicht:</span>
              <span>Der Anbieter ist nach § 22 DAC7UmsG verpflichtet, Creator-Einkünfte ab 30 Transaktionen
              oder 2.000 EUR/Jahr jährlich an das Bundeszentralamt für Steuern (BZSt) zu melden.</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 10 Referral-Programm</p>
          <p className="text-[#6E6860]">
            Creator können durch persönliche Referral-Links neue Nutzer werben. Die Lifetime-Provision auf
            Einkäufe geworbener Nutzer beträgt den im Creator-Vertrag festgelegten Prozentsatz.
            Voraussetzung: Registrierung des Neukunden über den Referral-Link und erste abgeschlossene Bestellung.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Missbrauch des Referral-Systems (Eigenregistrierung, künstliche Transaktionen, Betrug) führt zur
            sofortigen Sperrung des Creator-Accounts und zur Rückforderung bereits ausgezahlter Provisionen.
          </p>
          <p className="mt-3 text-[#6E6860] text-xs">
            Hinweis: Creator, die über Social Media für ihre Produkte werben und dabei Referral-Links verwenden,
            sind nach § 5a Abs. 4 UWG zur Kennzeichnung als kommerzielle Kommunikation verpflichtet
            («Werbung» / «Anzeige»).
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 11 Geistiges Eigentum und Formeln</p>
          <p className="text-[#6E6860]">
            Duftformeln sind nach herrschender Rechtsprechung nicht urheberrechtlich schutzfähig (EuGH,
            Rs. C-310/17 <em>Levola Hengelo</em>). Schutz besteht allein über Geheimhaltung (Betriebsgeheimnis).
            Creator räumen dem Anbieter das Recht ein, die hinterlegte Formel zur Herstellung und zum
            Versand der bestellten Produkte zu nutzen.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Markenrechte an Creator-Duftnamen liegen beim Creator. Der Creator versichert, dass die
            verwendeten Namen keine Rechte Dritter verletzen und stellt den Anbieter von entsprechenden
            Ansprüchen frei.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 12 Plattformverantwortung und DSA</p>
          <p className="text-[#6E6860]">
            Der Anbieter ist als Plattform-Host nach §§ 8–10 DDG und Art. 6 der Verordnung (EU) 2022/2065
            (Digital Services Act) für fremde Creator-Inhalte nicht verantwortlich, solange er keine
            Kenntnis von Rechtsverstößen hat. Nach Kenntnisnahme werden rechtswidrige Inhalte unverzüglich
            entfernt. Zur Meldung rechtswidriger Inhalte steht ein Beschwerdeverfahren unter{" "}
            <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: Link zum Meldeformular eintragen]</span>{" "}
            zur Verfügung.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 13 Verpackungsentsorgung (VerpackG)</p>
          <p className="text-[#6E6860]">
            Der Anbieter ist als Erstinverkehrbringer von Verpackungen im deutschen LUCID-Register
            registriert und nimmt an einem dualen Entsorgungssystem teil. Creator-Produkte, die der
            Anbieter versendet, sind über den Anbieter systembeteiligt.
          </p>
          <p className="mt-2 text-xs text-[#9E9890]">
            LUCID-Registrierungsnummer:{" "}
            <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: LUCID-Registrierungsnummer nach Registrierung unter lucid.verpackungsregister.org eintragen]</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 14 Online-Streitbeilegung</p>
          <p className="text-[#6E6860]">
            Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-[#0A0A0A]"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Der Anbieter ist nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
            einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">§ 15 Schlussbestimmungen</p>
          <p className="text-[#6E6860]">
            Es gilt das Recht der Bundesrepublik Deutschland. Für Kaufverträge mit Verbrauchern gilt
            ergänzend das Recht des Wohnsitzstaats des Verbrauchers, soweit durch zwingende Vorschriften
            der EU-Verbraucherrechterichtlinie geboten.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Gerichtsstand für Kaufleute und juristische Personen des öffentlichen Rechts ist{" "}
            <span className="border-b border-red-400 text-red-600">[PFLICHTANGABE: Sitz des Anbieters/Stadt]</span>.
            Für Verbraucher gilt der gesetzliche Gerichtsstand (§ 29c ZPO).
          </p>
          <p className="mt-3 text-[#6E6860]">
            Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit
            der übrigen Bestimmungen unberührt (Salvatorische Klausel).
          </p>
          <p className="mt-3 text-xs text-[#9E9890]">Stand: März 2026</p>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-[#9E9890]">
          <Link href="/impressum" className="hover:text-[#0A0A0A] transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:text-[#0A0A0A] transition-colors">Datenschutz</Link>
          <span>·</span>
          <Link href="/widerruf" className="hover:text-[#0A0A0A] transition-colors">Widerruf</Link>
        </div>
      </div>
    </main>
  );
}
