"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Subscription = {
  id: string;
  status: "active" | "paused" | "cancelled" | "past_due";
  price_cents_monthly: number;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  shipping_address: {
    line1?: string;
    city?: string;
    postal_code?: string;
    country?: string;
  } | null;
  created_at: string;
};

type Delivery = {
  id: string;
  delivery_month: string;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  recommendation_reason: string | null;
  tracking_number: string | null;
  fragrance: { name: string; image_url: string | null } | null;
};

const FEATURES = [
  { icon: "◈", title: "KI-Auswahl", desc: "Unsere KI analysiert deine Duft-Vorlieben und wählt jeden Monat den perfekten Duft aus dem Creator-Katalog." },
  { icon: "◉", title: "Handverlesen", desc: "Nur die besten Düfte unabhängiger Creators — limitiert, authentisch, einzigartig." },
  { icon: "◎", title: "Personalisiert", desc: "Je mehr du nutzt und bewertest, desto besser wird die monatliche Empfehlung." },
  { icon: "◆", title: "Flexibel", desc: "Pause oder kündige jederzeit. Keine Bindung, keine versteckten Gebühren." },
];

const STATUS_LABELS: Record<string, { text: string; cls: string }> = {
  active: { text: "Aktiv", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { text: "Pausiert", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { text: "Gekündigt", cls: "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]" },
  past_due: { text: "Zahlung offen", cls: "bg-red-50 text-red-700 border-red-200" },
};

const DELIVERY_STATUS: Record<string, { text: string; icon: string }> = {
  pending: { text: "Vorbereitung", icon: "○" },
  confirmed: { text: "Bestätigt", icon: "●" },
  shipped: { text: "Versandt", icon: "◆" },
  delivered: { text: "Zugestellt", icon: "✓" },
};

export default function KiAboPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [msg, setMsg] = useState("");

  // Shipping address form
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("DE");
  const [savingAddress, setSavingAddress] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data: sub } = await supabase
        .from("ki_subscriptions")
        .select("id, status, price_cents_monthly, current_period_end, stripe_subscription_id, shipping_address, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub) {
        setSubscription(sub);
        if (sub.shipping_address) {
          setLine1(sub.shipping_address.line1 ?? "");
          setCity(sub.shipping_address.city ?? "");
          setPostalCode(sub.shipping_address.postal_code ?? "");
          setCountry(sub.shipping_address.country ?? "DE");
        }

        const { data: dels } = await supabase
          .from("ki_subscription_deliveries")
          .select("id, delivery_month, status, recommendation_reason, tracking_number, fragrance:fragrances(name, image_url)")
          .eq("user_id", user.id)
          .order("delivery_month", { ascending: false });
        setDeliveries((dels as unknown as Delivery[]) ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function subscribe() {
    if (!userId || !userEmail) return;
    setSubscribing(true);
    setMsg("");
    const shippingAddress = line1 ? { line1, city, postal_code: postalCode, country } : null;
    try {
      const res = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ki_abo", userId, userEmail, shippingAddress }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMsg("Fehler beim Weiterleiten zu Stripe.");
        setSubscribing(false);
      }
    } catch {
      setMsg("Verbindungsfehler. Bitte erneut versuchen.");
      setSubscribing(false);
    }
  }

  async function cancelSubscription() {
    if (!subscription?.stripe_subscription_id || !userId) return;
    if (!confirm("Wirklich kündigen? Das Abo endet zum Monatsende.")) return;
    setCancelling(true);
    try {
      const { authFetch } = await import("@/lib/authFetch");
      await authFetch("/api/stripe/cancel-subscription", {
        method: "POST",
        body: JSON.stringify({
          type: "ki_abo",
          subscriptionId: subscription.stripe_subscription_id,
          userId,
        }),
      });
      setSubscription((p) => p ? { ...p, status: "cancelled" } : p);
      setMsg("Abo erfolgreich gekündigt.");
    } catch {
      setMsg("Fehler beim Kündigen. Bitte erneut versuchen.");
    }
    setCancelling(false);
  }

  async function saveAddress() {
    if (!subscription) return;
    setSavingAddress(true);
    const { error } = await supabase
      .from("ki_subscriptions")
      .update({ shipping_address: { line1, city, postal_code: postalCode, country } })
      .eq("id", subscription.id);
    if (!error) {
      setSubscription((p) => p ? { ...p, shipping_address: { line1, city, postal_code: postalCode, country } } : p);
      setShowAddressForm(false);
      setMsg("Adresse gespeichert.");
    }
    setSavingAddress(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
      </main>
    );
  }

  // ── Active subscription view ───────────────────────────────────────────────
  if (subscription && subscription.status !== "cancelled") {
    const sl = STATUS_LABELS[subscription.status] ?? STATUS_LABELS.active;
    return (
      <main className="min-h-screen bg-[#FAFAF8]">
        <div className="bg-[#0A0A0A] px-5 pt-20 pb-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">KI-Abo</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Dein KI-Duft-Abo</h1>
          <p className="mt-2 text-sm text-white/50">Jeden Monat ein neuer Duft — von der KI für dich ausgewählt.</p>
        </div>

        <div className="mx-auto max-w-3xl px-5 py-8 space-y-6">
          {msg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">{msg}</div>
          )}

          {/* Status card */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-white p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Status</p>
                <span className={`mt-1 inline-block rounded-full border px-3 py-1 text-xs font-medium ${sl.cls}`}>{sl.text}</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Monatlich</p>
                <p className="text-2xl font-bold text-[#0A0A0A]">
                  {(subscription.price_cents_monthly / 100).toFixed(2).replace(".", ",")} €
                </p>
              </div>
            </div>
            {subscription.current_period_end && (
              <p className="mt-4 text-xs text-[#9E9890]">
                Nächste Abrechnung: {new Date(subscription.current_period_end).toLocaleDateString("de-DE")}
              </p>
            )}
            <p className="mt-1 text-xs text-[#9E9890]">
              Aktiv seit: {new Date(subscription.created_at).toLocaleDateString("de-DE")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {subscription.status === "active" && (
                <button
                  onClick={cancelSubscription}
                  disabled={cancelling}
                  className="rounded-full border border-red-200 text-red-600 px-4 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-red-50 disabled:opacity-40"
                >
                  {cancelling ? "Kündige..." : "Kündigen"}
                </button>
              )}
              <button
                onClick={() => setShowAddressForm((p) => !p)}
                className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-[#F0EDE8]"
              >
                Lieferadresse {showAddressForm ? "ausblenden" : "bearbeiten"}
              </button>
            </div>
          </div>

          {/* Address form */}
          {showAddressForm && (
            <div className="rounded-2xl border border-[#E5E0D8] bg-white p-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">Lieferadresse</h3>
              <div className="grid gap-3">
                <input
                  type="text"
                  placeholder="Straße und Hausnummer"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="PLZ"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                  <input
                    type="text"
                    placeholder="Stadt"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                </div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                </select>
              </div>
              <button
                onClick={saveAddress}
                disabled={savingAddress}
                className="rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
              >
                {savingAddress ? "Speichert..." : "Adresse speichern"}
              </button>
            </div>
          )}

          {/* Deliveries */}
          <div className="rounded-2xl border border-[#E5E0D8] bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] mb-4">Lieferungen</h3>
            {deliveries.length === 0 ? (
              <p className="text-sm text-[#9E9890]">Deine erste Lieferung wird in Kürze vorbereitet.</p>
            ) : (
              <div className="space-y-4">
                {deliveries.map((del) => {
                  const ds = DELIVERY_STATUS[del.status] ?? DELIVERY_STATUS.pending;
                  return (
                    <div key={del.id} className="flex items-start gap-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                      {del.fragrance?.image_url ? (
                        <img src={del.fragrance.image_url} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-[#E5E0D8] flex items-center justify-center text-xl shrink-0">◈</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#0A0A0A]">
                            {del.fragrance?.name ?? "Duft wird ausgewählt..."}
                          </p>
                          <span className="text-[10px] uppercase tracking-wider text-[#9E9890]">
                            {ds.icon} {ds.text}
                          </span>
                        </div>
                        <p className="text-xs text-[#9E9890] mt-0.5">{del.delivery_month}</p>
                        {del.recommendation_reason && (
                          <p className="mt-1 text-xs text-[#6E6860] italic">"{del.recommendation_reason}"</p>
                        )}
                        {del.tracking_number && (
                          <p className="mt-1 text-xs text-[#6E6860]">Tracking: {del.tracking_number}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ── Landing / Sign-up view ─────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      {/* Hero */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-16 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">Fragrance OS · KI-Abo</p>
        <h1 className="mt-3 text-4xl font-bold text-white leading-tight">
          Jeden Monat<br />dein perfekter Duft
        </h1>
        <p className="mt-4 text-sm text-white/60 max-w-sm mx-auto">
          Unsere KI wählt monatlich einen Duft aus dem Creator-Katalog — abgestimmt auf deine Vorlieben und aktuelle Trends.
        </p>
        <p className="mt-6 text-3xl font-bold text-white">
          19,90 €<span className="text-base font-normal text-white/50"> / Monat</span>
        </p>
        <p className="mt-1 text-xs text-white/40">Inkl. Versand · Jederzeit kündbar</p>
      </div>

      {/* Feature grid */}
      <div className="mx-auto max-w-4xl px-5 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.icon} className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-semibold text-[#0A0A0A]">{f.title}</h3>
              <p className="mt-1.5 text-xs text-[#6E6860] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Subscribe form */}
        <div className="mt-10 rounded-2xl border border-[#E5E0D8] bg-white p-8 max-w-lg mx-auto">
          {!userId ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-[#6E6860]">Melde dich an, um das KI-Abo zu aktivieren.</p>
              <Link href="/auth" className="inline-block rounded-full bg-[#0A0A0A] text-white px-6 py-3 text-xs font-medium uppercase tracking-wider">
                Anmelden / Registrieren
              </Link>
            </div>
          ) : subscription?.status === "cancelled" ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-[#6E6860]">Du hattest bereits ein KI-Abo. Reaktiviere es hier.</p>
              <button
                onClick={subscribe}
                disabled={subscribing}
                className="rounded-full bg-[#0A0A0A] text-white px-6 py-3 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
              >
                {subscribing ? "Aktiviere..." : "Abo reaktivieren – 19,90 €/Monat"}
              </button>
              {msg && <p className="text-xs text-[#6E6860]">{msg}</p>}
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-base font-semibold uppercase tracking-wider text-[#0A0A0A]">KI-Abo starten</h2>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Straße und Hausnummer"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="PLZ"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                  <input
                    type="text"
                    placeholder="Stadt"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  />
                </div>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                >
                  <option value="DE">Deutschland</option>
                  <option value="AT">Österreich</option>
                  <option value="CH">Schweiz</option>
                </select>
              </div>

              <button
                onClick={subscribe}
                disabled={subscribing}
                className="w-full rounded-full bg-[#0A0A0A] text-white py-3 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
              >
                {subscribing ? "Aktiviere..." : "KI-Abo aktivieren – 19,90 €/Monat"}
              </button>

              <p className="text-[10px] text-[#9E9890] text-center leading-relaxed">
                Jederzeit zum Monatsende kündbar. Kein Risiko.
                Die Lieferadresse kann jederzeit geändert werden.
              </p>

              {msg && (
                <p className={`text-xs text-center ${msg.includes("Fehler") ? "text-red-600" : "text-emerald-600"}`}>{msg}</p>
              )}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="mt-10 space-y-3">
          {[
            { q: "Wie wählt die KI meinen Duft aus?", a: "Die KI analysiert deine Favoriten, Bewertungen und Kategorie-Vorlieben. Kombiniert mit aktuellen Trend-Daten wählt sie den Duft aus, der am besten zu dir passt." },
            { q: "Wann wird der Duft geliefert?", a: "Die KI wählt deinen Duft bis zum 5. eines Monats aus. Die Lieferung erfolgt typischerweise in der zweiten Monatswoche." },
            { q: "Kann ich den Duft zurückgeben?", a: "Ja, ungeöffnete Düfte können innerhalb von 14 Tagen nach Erhalt zurückgegeben werden." },
            { q: "Was kostet der Versand?", a: "Der Versand ist im Preis enthalten (19,90 € / Monat)." },
          ].map((item) => (
            <details key={item.q} className="rounded-2xl border border-[#E5E0D8] bg-white">
              <summary className="cursor-pointer px-6 py-4 text-sm font-medium text-[#0A0A0A] select-none">
                {item.q}
              </summary>
              <p className="px-6 pb-4 text-sm text-[#6E6860] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
