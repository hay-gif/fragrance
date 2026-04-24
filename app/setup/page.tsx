"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SetupPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function claimAdmin() {
    setStatus("loading");
    setMessage("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setStatus("error");
      setMessage("Du musst eingeloggt sein, um dich als Admin einzurichten.");
      return;
    }

    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    const json = await res.json();
    if (res.ok) {
      setStatus("success");
      setMessage(json.message ?? "Admin-Konto eingerichtet!");
    } else {
      setStatus("error");
      setMessage(json.error ?? "Unbekannter Fehler");
    }
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Logo */}
        <p className="mb-8 text-center text-[11px] font-bold uppercase tracking-[0.3em] text-white/30">
          Fragrance OS
        </p>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <h1 className="text-2xl font-bold text-white">Admin-Setup</h1>
          <p className="mt-2 text-sm text-white/40 leading-relaxed">
            Richte den ersten Administrator-Account ein. Dieser Vorgang funktioniert
            nur einmalig — sobald ein Admin existiert, ist diese Seite gesperrt.
          </p>

          <div className="mt-6 rounded-2xl border border-[#C9A96E]/20 bg-[#C9A96E]/5 p-4">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#C9A96E] mb-1">
              Voraussetzung
            </p>
            <p className="text-xs text-white/50">
              Du musst bereits eingeloggt sein. Dein Account wird dann zum Admin befördert.
            </p>
          </div>

          {status === "success" ? (
            <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
              <p className="text-sm font-medium text-green-400">{message}</p>
              <Link
                href="/admin"
                className="mt-4 block w-full rounded-full bg-[#C9A96E] py-3 text-center text-sm font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-[#E8C99A] transition-colors"
              >
                Zum Admin-Panel →
              </Link>
            </div>
          ) : (
            <>
              {status === "error" && message && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{message}</p>
                </div>
              )}
              <button
                onClick={claimAdmin}
                disabled={status === "loading"}
                className="mt-6 w-full rounded-full bg-[#C9A96E] py-3.5 text-sm font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-[#E8C99A] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Einrichten…" : "Admin-Account einrichten"}
              </button>
              <Link
                href="/auth"
                className="mt-3 block text-center text-xs text-white/30 hover:text-white/60 transition-colors"
              >
                Zuerst einloggen →
              </Link>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[10px] text-white/20">
          Diese Seite ist nur für den initialen Setup-Prozess vorgesehen.
        </p>
      </div>
    </main>
  );
}
