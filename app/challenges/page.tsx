"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  accord_required: string | null;
  prize_amount_cents: number;
  prize_description: string | null;
  logo_url: string | null;
  rules: string | null;
  start_date: string;
  end_date: string;
  max_entries: number | null;
  status: "draft" | "active" | "judging" | "ended";
  entry_count?: number;
};

type MyEntry = {
  challenge_id: string;
  fragrance_id: string;
  submitted_at: string;
  is_winner: boolean;
};

type Fragrance = {
  id: string;
  name: string;
};

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000));
}

function statusLabel(status: string) {
  switch (status) {
    case "active": return { text: "Aktiv", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "judging": return { text: "Bewertung", cls: "bg-amber-50 text-amber-700 border-amber-200" };
    case "ended": return { text: "Beendet", cls: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" };
    default: return { text: status, cls: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" };
  }
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [myEntries, setMyEntries] = useState<MyEntry[]>([]);
  const [myFragrances, setMyFragrances] = useState<Fragrance[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<Record<string, string>>({});
  const [selectedFragrance, setSelectedFragrance] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"active" | "judging" | "ended">("active");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const profile = await getOwnProfile();
        if (profile && ["creator", "admin"].includes(profile.role)) {
          const { data: frags } = await supabase
            .from("fragrances")
            .select("id, name")
            .eq("owner_id", user.id)
            .eq("is_public", true);
          setMyFragrances(frags ?? []);

          const { data: entries } = await supabase
            .from("challenge_entries")
            .select("challenge_id, fragrance_id, submitted_at, is_winner")
            .eq("creator_id", user.id);
          setMyEntries(entries ?? []);
        }
      }

      const { data } = await supabase
        .from("challenges")
        .select("*")
        .in("status", ["active", "judging", "ended"])
        .order("start_date", { ascending: false });

      const enriched: Challenge[] = await Promise.all(
        (data ?? []).map(async (c) => {
          const { count } = await supabase
            .from("challenge_entries")
            .select("id", { count: "exact", head: true })
            .eq("challenge_id", c.id);
          return { ...c, entry_count: count ?? 0 };
        })
      );

      setChallenges(enriched);
      setLoading(false);
    }
    load();
  }, []);

  async function submitEntry(challengeId: string) {
    const fragranceId = selectedFragrance[challengeId];
    if (!fragranceId) {
      setSubmitMsg((p) => ({ ...p, [challengeId]: "Bitte wähle einen Duft aus." }));
      return;
    }
    if (!userId) {
      setSubmitMsg((p) => ({ ...p, [challengeId]: "Bitte erst anmelden." }));
      return;
    }
    setSubmitting(challengeId);
    const { error } = await supabase.from("challenge_entries").insert({
      challenge_id: challengeId,
      fragrance_id: fragranceId,
      creator_id: userId,
    });
    if (error) {
      setSubmitMsg((p) => ({ ...p, [challengeId]: error.message.includes("unique") ? "Du hast diesen Duft bereits eingereicht." : "Fehler beim Einreichen." }));
    } else {
      setMyEntries((p) => [...p, { challenge_id: challengeId, fragrance_id: fragranceId, submitted_at: new Date().toISOString(), is_winner: false }]);
      setSubmitMsg((p) => ({ ...p, [challengeId]: "Erfolgreich eingereicht!" }));
    }
    setSubmitting(null);
  }

  const filtered = challenges.filter((c) => c.status === activeTab);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Hero */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-12 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Fragrance OS</p>
        <h1 className="mt-2 text-4xl font-bold text-white">Challenges</h1>
        <p className="mt-3 text-sm text-white/50 max-w-md mx-auto">
          Tritt gegen andere Creators an, zeige deine Kreativität und gewinne Preisgelder.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E0D8] bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-5 flex gap-6">
          {(["active", "judging", "ended"] as const).map((tab) => {
            const count = challenges.filter((c) => c.status === tab).length;
            const labels = { active: "Aktiv", judging: "In Bewertung", ended: "Beendet" };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === tab ? "border-[#0A0A0A] text-[#0A0A0A]" : "border-transparent text-[#9E9890] hover:text-[#6E6860]"
                }`}
              >
                {labels[tab]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E0D8] bg-white p-12 text-center">
            <p className="text-sm text-[#9E9890]">Keine Challenges in dieser Kategorie.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((challenge) => {
              const sl = statusLabel(challenge.status);
              const days = daysLeft(challenge.end_date);
              const myEntry = myEntries.find((e) => e.challenge_id === challenge.id);
              const isActive = challenge.status === "active";

              return (
                <div key={challenge.id} className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
                  {/* Header strip */}
                  <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[#E5E0D8]">
                    <div className="flex items-center gap-4">
                      {challenge.logo_url && (
                        <img src={challenge.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                      )}
                      <div>
                        <h2 className="text-base font-semibold text-[#0A0A0A]">{challenge.title}</h2>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${sl.cls}`}>
                            {sl.text}
                          </span>
                          {challenge.accord_required && (
                            <span className="rounded-full border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#C9A96E]">
                              Accord: {challenge.accord_required}
                            </span>
                          )}
                          {isActive && days <= 7 && days > 0 && (
                            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] text-white font-medium">
                              Noch {days} Tag{days !== 1 ? "e" : ""}!
                            </span>
                          )}
                          {isActive && days === 0 && (
                            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] text-white font-medium">Endet heute!</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {challenge.prize_amount_cents > 0 && (
                        <p className="text-xl font-bold text-[#0A0A0A]">
                          {(challenge.prize_amount_cents / 100).toFixed(0)} €
                        </p>
                      )}
                      <p className="text-[10px] text-[#9E9890] mt-0.5">{challenge.entry_count} Einreichungen</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-5 grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      {challenge.description && (
                        <p className="text-sm text-[#3A3530] leading-relaxed">{challenge.description}</p>
                      )}
                      {challenge.prize_description && (
                        <div className="rounded-xl bg-[#C9A96E]/10 border border-[#C9A96E]/30 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-wider text-[#C9A96E] font-medium mb-1">Preis</p>
                          <p className="text-sm text-[#3A3530]">{challenge.prize_description}</p>
                        </div>
                      )}
                      {challenge.rules && (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-[#6E6860] font-medium uppercase tracking-wider select-none">
                            Regeln anzeigen
                          </summary>
                          <p className="mt-2 text-xs text-[#6E6860] leading-relaxed whitespace-pre-line">{challenge.rules}</p>
                        </details>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs text-[#6E6860]">
                        <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wider mb-0.5">Start</p>
                          <p className="font-medium text-[#0A0A0A]">{new Date(challenge.start_date).toLocaleDateString("de-DE")}</p>
                        </div>
                        <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-wider mb-0.5">Ende</p>
                          <p className="font-medium text-[#0A0A0A]">{new Date(challenge.end_date).toLocaleDateString("de-DE")}</p>
                        </div>
                        {challenge.max_entries && (
                          <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 col-span-2">
                            <p className="text-[10px] uppercase tracking-wider mb-0.5">Max. Einreichungen</p>
                            <p className="font-medium text-[#0A0A0A]">{challenge.max_entries}</p>
                          </div>
                        )}
                      </div>

                      {/* Submit section */}
                      {isActive && (
                        <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-4">
                          {myEntry ? (
                            <div className="text-center">
                              <span className="text-2xl">{myEntry.is_winner ? "🏆" : "✓"}</span>
                              <p className="mt-1 text-sm font-medium text-[#0A0A0A]">
                                {myEntry.is_winner ? "Du hast gewonnen!" : "Eingereicht"}
                              </p>
                              <p className="text-xs text-[#9E9890] mt-0.5">
                                {new Date(myEntry.submitted_at).toLocaleDateString("de-DE")}
                              </p>
                            </div>
                          ) : userId && myFragrances.length > 0 ? (
                            <div className="space-y-3">
                              <p className="text-[10px] uppercase tracking-wider text-[#6E6860] font-medium">Jetzt einreichen</p>
                              <select
                                value={selectedFragrance[challenge.id] ?? ""}
                                onChange={(e) => setSelectedFragrance((p) => ({ ...p, [challenge.id]: e.target.value }))}
                                className="w-full rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                              >
                                <option value="">Duft wählen …</option>
                                {myFragrances.map((f) => (
                                  <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => submitEntry(challenge.id)}
                                disabled={submitting === challenge.id}
                                className="w-full rounded-full bg-[#0A0A0A] text-white py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
                              >
                                {submitting === challenge.id ? "Einreichen..." : "Einreichen"}
                              </button>
                              {submitMsg[challenge.id] && (
                                <p className="text-xs text-center text-[#6E6860]">{submitMsg[challenge.id]}</p>
                              )}
                            </div>
                          ) : userId && myFragrances.length === 0 ? (
                            <div className="text-center">
                              <p className="text-xs text-[#9E9890]">Du hast noch keine öffentlichen Düfte.</p>
                              <Link href="/create" className="mt-2 inline-block text-xs text-[#0A0A0A] underline underline-offset-2">Duft erstellen</Link>
                            </div>
                          ) : (
                            <div className="text-center">
                              <p className="text-xs text-[#9E9890] mb-2">Anmelden um teilzunehmen</p>
                              <Link href="/auth" className="rounded-full bg-[#0A0A0A] text-white px-4 py-2 text-xs font-medium uppercase tracking-wider">
                                Anmelden
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {challenge.status === "judging" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                          <p className="text-xs text-amber-700 font-medium">Einreichungen geschlossen – Bewertung läuft</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
