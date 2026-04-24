"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.capture(error, { boundary: "app/error" });
  }, [error]);

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-[#9E9890]">Fehler</p>
        <h1 className="mb-3 text-2xl font-bold text-[#0A0A0A]">Etwas ist schiefgelaufen</h1>
        <p className="mb-8 text-sm text-[#6E6860]">
          {error.message || "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut."}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#2A2A2A] transition-colors"
          >
            Erneut versuchen
          </button>
          <a
            href="/"
            className="rounded-full border border-[#E5E0D8] px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#6E6860] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors"
          >
            Startseite
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-[10px] text-[#C5C0B8]">Fehler-ID: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
