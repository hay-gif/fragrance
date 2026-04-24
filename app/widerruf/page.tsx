import Link from "next/link";

export default function WiderrufPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Widerrufsrecht</h1>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8 space-y-5 text-sm text-[#3A3530] leading-relaxed">

        {/* Hinweis: Wann gilt das Widerrufsrecht */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 mb-2 font-semibold">Wichtiger Hinweis</p>
          <p className="text-amber-900 text-sm">
            <strong>Standard-Katalog-Düfte</strong> (vorgefertigte Creator-Düfte): Widerrufsrecht gilt — 14 Tage ab Erhalt.<br /><br />
            <strong>Individuell konfigurierte Düfte</strong> (Zusammensetzung vom Kunden selbst festgelegt): Kein Widerrufsrecht gemäß{" "}
            <strong>§ 312g Abs. 2 Nr. 1 BGB</strong>, da es sich um nach Kundenspezifikation angefertigte Waren handelt. Dies wird Ihnen im Bestellprozess ausdrücklich mitgeteilt.<br /><br />
            <strong>Versiegelte Parfüm-Flakons</strong> mit Hygieneversiegelung: Kein Widerrufsrecht nach Öffnung der Versiegelung gemäß{" "}
            <strong>§ 312g Abs. 2 Nr. 5 BGB</strong>, sofern dies bei Bestellung kommuniziert wurde.
          </p>
        </div>

        {/* Widerrufsbelehrung */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-4">Widerrufsbelehrung</p>

          <h2 className="font-semibold text-[#0A0A0A] mb-3">Widerrufsrecht</h2>
          <p className="text-[#6E6860]">
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder ein von Ihnen benannter Dritter,
            der nicht der Beförderer ist, die Waren in Besitz genommen haben bzw. hat.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
          </p>
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
            <p className="text-red-700 font-semibold text-xs uppercase tracking-wider mb-2">⚠ Pflichtangaben — hier eintragen:</p>
            <p className="text-red-800">
              [FIRMENNAME / VOLLSTÄNDIGER NAME]<br />
              [STRASSE, HAUSNUMMER]<br />
              [PLZ, STADT]<br />
              E-Mail: [KONTAKT@IHRE-DOMAIN.DE]
            </p>
          </div>
          <p className="mt-3 text-[#6E6860]">
            mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über
            Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
            Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des
            Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
          </p>

          <h2 className="font-semibold text-[#0A0A0A] mt-5 mb-3">Folgen des Widerrufs</h2>
          <p className="text-[#6E6860]">
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben,
            einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie
            eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben),
            unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über
            Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe
            Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde
            ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte
            berechnet.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder bis Sie den
            Nachweis erbracht haben, dass Sie die Waren zurückgesandt haben, je nachdem, welches der frühere
            Zeitpunkt ist.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Sie haben die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem Tag, an dem
            Sie uns über den Widerruf dieses Vertrags unterrichten, an uns zurückzusenden oder zu übergeben. Die
            Frist ist gewahrt, wenn Sie die Waren vor Ablauf der Frist von vierzehn Tagen absenden.
          </p>
          <p className="mt-3 text-[#6E6860]">
            Sie tragen die unmittelbaren Kosten der Rücksendung der Waren.
          </p>

          <h2 className="font-semibold text-[#0A0A0A] mt-5 mb-3">Ausschluss des Widerrufsrechts</h2>
          <p className="text-[#6E6860]">
            Das Widerrufsrecht besteht nicht bei:
          </p>
          <ul className="mt-2 space-y-2 text-[#6E6860] list-disc list-inside">
            <li>
              Waren, die nach Kundenspezifikation angefertigt oder eindeutig auf die persönlichen Bedürfnisse
              zugeschnitten wurden (<strong>§ 312g Abs. 2 Nr. 1 BGB</strong>) — gilt für Düfte, deren Zusammensetzung
              der Kunde individuell konfiguriert hat.
            </li>
            <li>
              Versiegelten Waren, die aus Gründen des Gesundheitsschutzes oder der Hygiene nicht zur Rückgabe
              geeignet sind, wenn ihre Versiegelung nach der Lieferung entfernt wurde
              (<strong>§ 312g Abs. 2 Nr. 5 BGB</strong>) — gilt für Parfüm-Flakons, sobald die Schutzversiegelung
              geöffnet wurde (sofern im Bestellprozess darauf hingewiesen).
            </li>
          </ul>
        </div>

        {/* Muster-Widerrufsformular */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-4">Muster-Widerrufsformular</p>
          <p className="text-xs text-[#9E9890] mb-4">(Gemäß Anlage 2 zu Art. 246a § 1 Abs. 2 Satz 1 Nr. 1 und § 2 Abs. 2 Nr. 2 EGBGB — wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück)</p>

          <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-4 font-mono text-xs text-[#3A3530] leading-loose whitespace-pre-wrap">
{`An:
[FIRMENNAME / VOLLSTÄNDIGER NAME]
[STRASSE, HAUSNUMMER]
[PLZ, STADT]
E-Mail: [KONTAKT@IHRE-DOMAIN.DE]

Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
Vertrag über den Kauf der folgenden Waren (*) /
die Erbringung der folgenden Dienstleistung (*)

Bestellt am (*): ___________________________

Erhalten am (*): ___________________________

Name des/der Verbraucher(s): ___________________________

Anschrift des/der Verbraucher(s):

___________________________
___________________________
___________________________

Unterschrift des/der Verbraucher(s)
(nur bei Mitteilung auf Papier):

___________________________

Datum: ___________________________


(*) Unzutreffendes streichen.`}
          </div>
        </div>

        <div className="flex gap-3 text-[11px] text-[#9E9890]">
          <Link href="/impressum" className="hover:text-[#0A0A0A] transition-colors">Impressum</Link>
          <span>·</span>
          <Link href="/agb" className="hover:text-[#0A0A0A] transition-colors">AGB</Link>
          <span>·</span>
          <Link href="/datenschutz" className="hover:text-[#0A0A0A] transition-colors">Datenschutz</Link>
        </div>
      </div>
    </main>
  );
}
