"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type ShareLinkData = {
  share_code: string;
  clicks: number;
  conversions: number;
  total_commission_cents: number;
};

type Props = {
  fragranceId: string;
  fragranceName: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

const TERMS_TEXT = `TEILEN & VERDIENEN – NUTZUNGSBEDINGUNGEN

Durch die Aktivierung des Teilen-Programms akzeptierst du folgende Bedingungen:

1. PROVISION
Du erhältst 10 % des Netto-Kaufpreises, wenn jemand deinen Duft über deinen persönlichen Link kauft. Die Provision wird deinem Guthaben gutgeschrieben.

2. STEUERPFLICHT
Provisionen sind steuerpflichtige Einkünfte nach § 22 Nr. 3 EStG (sonstige Einkünfte). Du bist verpflichtet, sämtliche Einnahmen in deiner jährlichen Steuererklärung anzugeben. Die Plattform stellt keine Steuerberatung bereit.

3. MELDEPFLICHT (DAC7)
Gemäß EU-Richtlinie 2021/514 (Plattformbetreiber-Meldepflicht, DAC7) sind wir verpflichtet, deine Vergütungsdaten an das Bundeszentralamt für Steuern zu melden, sofern du im Kalenderjahr mehr als 30 Vergütungen erhältst oder einen Gesamtbetrag von 2.000 € überschreitest.

4. MINDESTAUSZAHLUNG & IDENTIFIZIERUNG
Auszahlungen sind ab einem Guthaben von 15,00 € möglich. Du musst deine Steuer-Identifikationsnummer hinterlegen.

5. ERLAUBTE NUTZUNG
Share-Links dürfen nicht durch Eigenklicks, automatisierte Systeme oder irreführende Werbung manipuliert werden. Verstöße führen zur sofortigen Sperrung und Rückforderung bereits gutgeschriebener Provisionen.

6. ÄNDERUNGEN
Die Plattform kann das Teilen-Programm jederzeit mit 14 Tagen Vorankündigung ändern oder einstellen. Bereits verdiente Provisionen werden ausgezahlt.`;

export default function ShareButton({ fragranceId, fragranceName }: Props) {
  const [showTerms, setShowTerms] = useState(false);
  const [link, setLink] = useState<ShareLinkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleShare() {
    setLoading(true);
    setError(null);
    const token = await getAuthToken();
    if (!token) { setError("Bitte einloggen"); setLoading(false); return; }

    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fragranceId }),
    });
    const json = await res.json();
    setLoading(false);

    if (json.requiresTerms) {
      setShowTerms(true);
      return;
    }
    if (!res.ok || json.error) { setError(json.error ?? "Fehler"); return; }
    setLink(json.link);
    copyLink(json.link.share_code);
  }

  async function acceptTermsAndShare() {
    setLoading(true);
    setError(null);
    const token = await getAuthToken();
    if (!token) { setError("Bitte einloggen"); setLoading(false); return; }

    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fragranceId, acceptTerms: true }),
    });
    const json = await res.json();
    setLoading(false);
    setShowTerms(false);

    if (!res.ok || json.error) { setError(json.error ?? "Fehler"); return; }
    setLink(json.link);
    copyLink(json.link.share_code);
  }

  function copyLink(code: string) {
    const url = `${BASE_URL}/fragrance/${fragranceId}?via=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback for non-HTTPS or restricted contexts
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        console.warn("Kopieren fehlgeschlagen");
      }
      document.body.removeChild(el);
    });
  }

  const shareUrl = link ? `${BASE_URL}/fragrance/${fragranceId}?via=${link.share_code}` : null;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-full border border-[#E5E0D8] px-4 py-2 text-[11px] font-medium uppercase tracking-widest text-[#6E6860] hover:border-[#C9A96E] hover:text-[#C9A96E] active:scale-95 transition-all disabled:opacity-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {copied ? "Link kopiert!" : loading ? "Lädt…" : "Teilen & 10% verdienen"}
      </button>

      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}

      {/* Stats if link exists */}
      {link && (
        <div className="mt-2 flex items-center gap-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5">
          <div className="text-center">
            <p className="text-[18px] font-bold text-[#0A0A0A]">{link.clicks}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Klicks</p>
          </div>
          <div className="h-8 w-px bg-[#E5E0D8]" />
          <div className="text-center">
            <p className="text-[18px] font-bold text-[#0A0A0A]">{link.conversions}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Käufe</p>
          </div>
          <div className="h-8 w-px bg-[#E5E0D8]" />
          <div className="text-center">
            <p className="text-[18px] font-bold text-[#C9A96E]">{(link.total_commission_cents / 100).toFixed(2)} €</p>
            <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Verdient</p>
          </div>
          <button
            onClick={() => copyLink(link.share_code)}
            className="ml-auto rounded-lg border border-[#E5E0D8] px-3 py-1.5 text-[11px] text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
          >
            {copied ? "✓ Kopiert" : "Link kopieren"}
          </button>
        </div>
      )}

      {shareUrl && (
        <p className="mt-1.5 truncate text-[11px] text-[#9E9890]">{shareUrl}</p>
      )}

      {/* Legal Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-[#E5E0D8] px-6 py-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#9E9890]">Teilen & Verdienen</p>
              <h2 className="mt-1 text-lg font-bold text-[#0A0A0A]">Nutzungsbedingungen</h2>
            </div>

            <div className="max-h-72 overflow-y-auto px-6 py-4">
              <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-[#6E6860]">
                {TERMS_TEXT}
              </pre>
            </div>

            <div className="border-t border-[#E5E0D8] px-6 py-4">
              <p className="mb-4 text-[11px] text-[#9E9890]">
                Durch Klicken auf „Akzeptieren & Teilen" bestätigst du, dass du die Nutzungsbedingungen gelesen und verstanden hast.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTerms(false)}
                  className="flex-1 rounded-full border border-[#E5E0D8] py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={acceptTermsAndShare}
                  disabled={loading}
                  className="flex-1 rounded-full bg-[#C9A96E] py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#B8944A] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Lädt…" : "Akzeptieren & Teilen"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
