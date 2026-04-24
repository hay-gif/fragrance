"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#0A0A0A]">
          <span className="text-2xl text-white">✓</span>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Fragrance OS</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A0A0A]">Zahlung erfolgreich</h1>
        <p className="mt-3 text-sm text-[#6E6860]">
          Deine Bestellung wird jetzt bearbeitet. Du erhältst eine Benachrichtigung, sobald dein Duft in Produktion geht.
        </p>

        {orderId && (
          <p className="mt-3 text-[11px] text-[#C5C0B8]">
            Bestellnummer: <span className="font-mono">{orderId.slice(0, 8).toUpperCase()}</span>
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/orders"
            className="rounded-full bg-[#0A0A0A] px-6 py-3 text-xs font-medium uppercase tracking-wider text-white transition-all active:scale-95"
          >
            Bestellungen ansehen
          </Link>
          <Link
            href="/discover"
            className="rounded-full border border-[#E5E0D8] px-6 py-3 text-xs font-medium text-[#6E6860] transition-all hover:border-[#0A0A0A]"
          >
            Weiter entdecken
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function StripSuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
