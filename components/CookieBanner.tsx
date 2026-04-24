"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-5">
      <div className="mx-auto max-w-2xl rounded-2xl bg-[#0A0A0A] p-5 shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Fragrance OS</p>
        <p className="text-sm text-white leading-relaxed">
          Wir verwenden technisch notwendige Cookies sowie optionale Analyse-Cookies zur Verbesserung deines Erlebnisses.
          Mehr dazu in unserer{" "}
          <Link href="/datenschutz" className="underline text-white/70 hover:text-white transition-colors">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={accept}
            className="rounded-full bg-white px-5 py-2 text-xs font-medium text-[#0A0A0A] transition-all active:scale-95"
          >
            Alle akzeptieren
          </button>
          <button
            onClick={decline}
            className="rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/70 hover:border-white/50 transition-all active:scale-95"
          >
            Nur notwendige
          </button>
          <Link
            href="/datenschutz"
            className="rounded-full border border-white/20 px-5 py-2 text-xs font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            Mehr erfahren
          </Link>
        </div>
      </div>
    </div>
  );
}
