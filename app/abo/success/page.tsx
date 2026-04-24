"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-5 text-center">
      {/* Check Icon */}
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-white">Abo aktiviert!</h1>

      {/* Subtext */}
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#9E9890]">
        {plan ? (
          <>
            Dein <span className="text-white capitalize">{plan}</span>-Abo ist
            jetzt aktiv. Viel Freude mit deinen exklusiven Vorteilen.
          </>
        ) : (
          "Dein Abo ist jetzt aktiv. Viel Freude mit deinen exklusiven Vorteilen."
        )}
      </p>

      {/* Divider */}
      <div className="my-8 h-px w-16 bg-[#2A2A2A]" />

      {/* CTA Buttons */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/discover"
          className="rounded-full bg-white px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-[#0A0A0A] transition-all active:scale-95 hover:bg-[#F0EDE8]"
        >
          Entdecken
        </Link>
        <Link
          href="/profil"
          className="rounded-full border border-[#2A2A2A] px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-[#9E9890] transition-all active:scale-95 hover:border-[#6E6860] hover:text-white"
        >
          Mein Profil
        </Link>
      </div>

      {/* Footnote */}
      <p className="mt-10 text-[11px] text-[#6E6860]">
        Eine Bestätigung wurde an deine E-Mail-Adresse gesendet.
      </p>
    </div>
  );
}

export default function AboSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
