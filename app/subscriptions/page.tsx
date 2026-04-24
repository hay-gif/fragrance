"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedFlacon from "@/components/AnimatedFlacon";

/* ── Types ── */
type PlatformSub = {
  id: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
};

type KiSub = {
  id: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  shippingAddress: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
};

type CreatorSub = {
  id: string;
  stripeSubscriptionId: string;
  creatorId: string;
  creatorName: string;
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
};

/* ── Helpers ── */
const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  cancelled: "Gekündigt",
  past_due: "Überfällig",
  trialing: "Testphase",
  unpaid: "Unbezahlt",
  paused: "Pausiert",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
  past_due: "bg-amber-50 text-amber-700 border-amber-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  unpaid: "bg-red-50 text-red-500 border-red-200",
  paused: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status] ?? "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

/* ── Confirm Modal ── */
function CancelModal({ name, onConfirm, onClose, loading }: { name: string; onConfirm: () => void; onClose: () => void; loading: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // onClose is a stable inline arrow fn from parent; exclude to avoid listener churn
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-[#0A0A0A]">Abo kündigen?</h3>
        <p className="mt-2 text-sm text-[#6E6860] leading-relaxed">
          Möchtest du <strong>{name}</strong> wirklich kündigen? Du behältst den Zugang bis zum Ende des Abrechnungszeitraums.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-[#E5E0D8] py-2.5 text-xs font-medium text-[#6E6860] hover:border-[#0A0A0A] transition-colors">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-full bg-red-500 py-2.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 active:scale-95 transition-all"
          >
            {loading ? "Kündige…" : "Ja, kündigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function SubscriptionsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const [platform, setPlatform] = useState<PlatformSub[]>([]);
  const [kiAbos, setKiAbos] = useState<KiSub[]>([]);
  const [creatorSubs, setCreatorSubs] = useState<CreatorSub[]>([]);
  const [shareBalance, setShareBalance] = useState(0);

  const [cancelTarget, setCancelTarget] = useState<{
    name: string;
    subscriptionId: string;
    type: "platform" | "ki_abo" | "creator";
  } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNotLoggedIn(true); setLoading(false); return; }
      setUserId(user.id);

      const [
        { data: platformData },
        { data: kiData },
        { data: creatorData },
        { data: profileData },
      ] = await Promise.all([
        supabase.from("user_subscriptions")
          .select("id, stripe_subscription_id, plan, status, current_period_end, cancelled_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("ki_subscriptions")
          .select("id, stripe_subscription_id, plan, status, shipping_address, current_period_end, cancelled_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("creator_subscriptions")
          .select("id, stripe_subscription_id, creator_id, plan, status, current_period_end, profiles!creator_subscriptions_creator_id_fkey(display_name)")
          .eq("subscriber_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("profiles")
          .select("share_balance_cents")
          .eq("id", user.id)
          .single(),
      ]);

      setPlatform((platformData ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        stripeSubscriptionId: r.stripe_subscription_id as string,
        plan: r.plan as string,
        status: r.status as string,
        currentPeriodEnd: r.current_period_end as string | null,
        cancelledAt: r.cancelled_at as string | null,
      })));

      setKiAbos((kiData ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        stripeSubscriptionId: r.stripe_subscription_id as string,
        plan: r.plan as string,
        status: r.status as string,
        shippingAddress: r.shipping_address as string | null,
        currentPeriodEnd: r.current_period_end as string | null,
        cancelledAt: r.cancelled_at as string | null,
      })));

      setCreatorSubs((creatorData ?? []).map((r: Record<string, unknown>) => {
        const profile = r.profiles as { display_name?: string } | null;
        return {
          id: r.id as string,
          stripeSubscriptionId: r.stripe_subscription_id as string,
          creatorId: r.creator_id as string,
          creatorName: profile?.display_name ?? "Creator",
          plan: r.plan as string,
          status: r.status as string,
          currentPeriodEnd: r.current_period_end as string | null,
        };
      }));

      setShareBalance((profileData as { share_balance_cents?: number } | null)?.share_balance_cents ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCancel() {
    if (!cancelTarget || !userId) return;
    setCancelLoading(true);
    try {
      const { authFetch } = await import("@/lib/authFetch");
      const res = await authFetch("/api/stripe/cancel-subscription", {
        method: "POST",
        body: JSON.stringify({ subscriptionId: cancelTarget.subscriptionId, type: cancelTarget.type, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Kündigung fehlgeschlagen: " + (data.error ?? "Unbekannter Fehler"));
        setCancelLoading(false);
        return;
      }

      // Only update local state after confirmed server success
      if (cancelTarget.type === "platform") {
        setPlatform((prev) => prev.map((s) => s.stripeSubscriptionId === cancelTarget.subscriptionId ? { ...s, status: "cancelled" } : s));
      } else if (cancelTarget.type === "ki_abo") {
        setKiAbos((prev) => prev.map((s) => s.stripeSubscriptionId === cancelTarget.subscriptionId ? { ...s, status: "cancelled" } : s));
      } else {
        setCreatorSubs((prev) => prev.map((s) => s.stripeSubscriptionId === cancelTarget.subscriptionId ? { ...s, status: "cancelled" } : s));
      }
    } catch (err) {
      console.error("Kündigung fehlgeschlagen:", err);
      alert("Netzwerkfehler – bitte erneut versuchen.");
    }

    setCancelLoading(false);
    setCancelTarget(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#C9A96E] border-t-transparent animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Lädt</p>
        </div>
      </main>
    );
  }

  if (notLoggedIn) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#0A0A0A]">Anmeldung erforderlich</h1>
          <p className="mt-2 text-sm text-[#6E6860]">Bitte logge dich ein.</p>
          <Link href="/auth" className="mt-6 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white">
            Zum Login
          </Link>
        </div>
      </main>
    );
  }

  const hasAnything = platform.length > 0 || kiAbos.length > 0 || creatorSubs.length > 0;
  const activeCount = [...platform, ...kiAbos, ...creatorSubs].filter((s) => s.status === "active" || s.status === "trialing").length;

  return (
    <>
      {cancelTarget && (
        <CancelModal
          name={cancelTarget.name}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
          loading={cancelLoading}
        />
      )}

      <main className="min-h-screen bg-[#FAFAF8] pb-16">
        {/* Dark Header */}
        <div className="relative overflow-hidden bg-[#0A0A0A] px-5 pt-20 pb-10">
          {/* Subtle background flacon */}
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-8 hidden sm:block">
            <AnimatedFlacon size={120} fillPercent={80} animated />
          </div>
          <div className="mx-auto max-w-3xl">
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
            <h1 className="text-3xl font-bold text-white">Abonnements</h1>
            <p className="mt-1 text-xs text-white/40">
              {activeCount > 0 ? (
                <>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300 mr-2">
                    {activeCount} aktiv
                  </span>
                </>
              ) : "Keine aktiven Abos"}
            </p>

            {/* Share Balance Card */}
            {shareBalance > 0 && (
              <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-4 py-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-[#C9A96E]/70">Teilen-Guthaben</p>
                  <p className="text-xl font-bold text-[#C9A96E]">{(shareBalance / 100).toFixed(2)} €</p>
                </div>
                <Link
                  href="/profile"
                  className="rounded-full border border-[#C9A96E]/40 px-3 py-1.5 text-[10px] font-medium text-[#C9A96E] hover:bg-[#C9A96E]/20 transition-colors"
                >
                  Auszahlen →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-5 py-8 space-y-8">
          {!hasAnything ? (
            <ScrollReveal animation="up">
              <div className="rounded-2xl border border-[#E5E0D8] bg-white p-10 text-center">
                <div className="flex justify-center mb-4 opacity-60">
                  <AnimatedFlacon size={80} fillPercent={30} animated />
                </div>
                <h2 className="text-base font-semibold text-[#0A0A0A]">Noch keine Abos</h2>
                <p className="mt-2 text-sm text-[#6E6860]">Entdecke unsere Abonnements und KI-Abo-Pakete.</p>
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link href="/abo" className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-[#1A1A1A] active:scale-95 transition-all">
                    Abos erkunden
                  </Link>
                  <Link href="/ki-abo" className="rounded-full border border-[#E5E0D8] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[#6E6860] hover:border-[#0A0A0A] active:scale-95 transition-all">
                    KI-Abo entdecken
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ) : (
            <>
              {/* Platform Subscriptions */}
              {platform.length > 0 && (
                <ScrollReveal animation="up" delay={0}>
                  <section>
                    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9E9890]">Plattform-Abo</h2>
                    <div className="space-y-3">
                      {platform.map((sub) => (
                        <div key={sub.id} className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
                          <div className="flex items-start justify-between gap-4 p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0A0A0A] text-white text-xs font-bold shrink-0">
                                P
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-[#0A0A0A] capitalize">{sub.plan}</span>
                                  <StatusBadge status={sub.status} />
                                </div>
                                <p className="mt-1 text-[10px] text-[#9E9890]">
                                  {sub.status === "cancelled" && sub.cancelledAt
                                    ? `Gekündigt am ${fmtDate(sub.cancelledAt)}`
                                    : sub.currentPeriodEnd
                                    ? `Verlängert am ${fmtDate(sub.currentPeriodEnd)}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            {sub.status === "active" && (
                              <button
                                type="button"
                                onClick={() => setCancelTarget({ name: `Plattform-Abo (${sub.plan})`, subscriptionId: sub.stripeSubscriptionId, type: "platform" })}
                                className="text-[10px] text-red-400 hover:text-red-600 transition-colors shrink-0"
                              >
                                Kündigen
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </ScrollReveal>
              )}

              {/* KI-Abo Subscriptions */}
              {kiAbos.length > 0 && (
                <ScrollReveal animation="up" delay={80}>
                  <section>
                    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9E9890]">KI-Abo</h2>
                    <div className="space-y-3">
                      {kiAbos.map((sub) => (
                        <div key={sub.id} className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
                          <div className="flex items-start justify-between gap-4 p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-[#C9A96E] to-[#A8803D] shrink-0">
                                <AnimatedFlacon size={24} fillPercent={70} animated />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-[#0A0A0A] capitalize">KI-Abo {sub.plan}</span>
                                  <StatusBadge status={sub.status} />
                                </div>
                                {sub.shippingAddress && (
                                  <p className="mt-1 text-[10px] text-[#9E9890] line-clamp-1">↗ {sub.shippingAddress}</p>
                                )}
                                <p className="mt-0.5 text-[10px] text-[#C5C0B8]">
                                  {sub.status === "cancelled" && sub.cancelledAt
                                    ? `Gekündigt am ${fmtDate(sub.cancelledAt)}`
                                    : sub.currentPeriodEnd
                                    ? `Nächste Lieferung ca. ${fmtDate(sub.currentPeriodEnd)}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {sub.status === "active" && (
                                <button
                                  type="button"
                                  onClick={() => setCancelTarget({ name: `KI-Abo (${sub.plan})`, subscriptionId: sub.stripeSubscriptionId, type: "ki_abo" })}
                                  className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                >
                                  Kündigen
                                </button>
                              )}
                              <Link href="/ki-abo" className="text-[10px] text-[#C9A96E] hover:underline">
                                Details →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </ScrollReveal>
              )}

              {/* Creator Subscriptions */}
              {creatorSubs.length > 0 && (
                <ScrollReveal animation="up" delay={160}>
                  <section>
                    <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9E9890]">Creator-Abos</h2>
                    <div className="space-y-3">
                      {creatorSubs.map((sub) => (
                        <div key={sub.id} className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
                          <div className="flex items-start justify-between gap-4 p-5">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E0D8] bg-[#FAFAF8] text-xs font-bold text-[#6E6860] shrink-0">
                                {sub.creatorName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-[#0A0A0A]">{sub.creatorName}</span>
                                  <StatusBadge status={sub.status} />
                                </div>
                                <p className="mt-0.5 text-[10px] text-[#9E9890] capitalize">{sub.plan}</p>
                                <p className="mt-0.5 text-[10px] text-[#C5C0B8]">
                                  {sub.currentPeriodEnd ? `Verlängert am ${fmtDate(sub.currentPeriodEnd)}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {sub.status === "active" && (
                                <button
                                  type="button"
                                  onClick={() => setCancelTarget({ name: `${sub.creatorName} (${sub.plan})`, subscriptionId: sub.stripeSubscriptionId, type: "creator" })}
                                  className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                >
                                  Kündigen
                                </button>
                              )}
                              <Link href={`/creator/${sub.creatorId}`} className="text-[10px] text-[#C9A96E] hover:underline">
                                Profil →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </ScrollReveal>
              )}
            </>
          )}

          {/* Upsell / Links */}
          <ScrollReveal animation="up" delay={240}>
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-4">Weitere Angebote</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/ki-abo" className="group flex items-center gap-3 rounded-xl border border-[#E5E0D8] px-4 py-3 hover:border-[#C9A96E] transition-colors">
                  <span className="text-xl">✦</span>
                  <div>
                    <p className="text-xs font-semibold text-[#0A0A0A] group-hover:text-[#C9A96E] transition-colors">KI-Abo</p>
                    <p className="text-[10px] text-[#9E9890]">Monatlich neue Düfte</p>
                  </div>
                </Link>
                <Link href="/abo" className="group flex items-center gap-3 rounded-xl border border-[#E5E0D8] px-4 py-3 hover:border-[#0A0A0A] transition-colors">
                  <span className="text-xl">◎</span>
                  <div>
                    <p className="text-xs font-semibold text-[#0A0A0A]">Plattform-Abo</p>
                    <p className="text-[10px] text-[#9E9890]">Exklusiver Zugang</p>
                  </div>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </main>
    </>
  );
}
