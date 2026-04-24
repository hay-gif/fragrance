"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLANS = [
  {
    id: "explorer",
    name: "Explorer",
    price: 9.99,
    tagline: "Dein monatlicher KI-Duft",
    features: [
      "Monatliche KI-Duft-Empfehlung",
      "Early Access zu neuen Drops",
      "Erweitertes Review-System",
      "Personalisierter Feed Priority",
    ],
    accent: "#3A3530",
    popular: false,
  },
  {
    id: "collector",
    name: "Collector",
    price: 24.99,
    tagline: "Erlebe Düfte physisch",
    features: [
      "Alles aus Explorer",
      "Monatliches 30ml Sample (versandt)",
      "2× Loyalty-Punkte",
      "Exklusive Creator-Drops",
    ],
    accent: "#6E6860",
    popular: true,
  },
  {
    id: "connoisseur",
    name: "Connoisseur",
    price: 49.99,
    tagline: "Das vollständige Erlebnis",
    features: [
      "Alles aus Collector",
      "50ml Creator-kuratierter Duft / Monat",
      "Exklusive Community",
      "Priorisierter Support",
      "Loyalty-Punkte 3×",
    ],
    accent: "#B09050",
    popular: false,
  },
];

const FAQ = [
  {
    q: "Kann ich mein Abo jederzeit kündigen?",
    a: "Ja, du kannst dein Abonnement jederzeit zum Ende der Laufzeit kündigen. Es entstehen keine weiteren Kosten.",
  },
  {
    q: "Wie funktioniert der Versand der Samples?",
    a: "Beim Collector- und Connoisseur-Abo versenden wir dein monatliches Sample innerhalb von 3–5 Werktagen nach Abrechnungsdatum.",
  },
  {
    q: "Kann ich zwischen Plänen wechseln?",
    a: "Ja, ein Upgrade ist sofort möglich. Bei einem Downgrade greift die Änderung zum nächsten Abrechnungszeitraum.",
  },
  {
    q: "Was passiert mit meinen Loyalty-Punkten bei einer Kündigung?",
    a: "Deine gesammelten Punkte bleiben erhalten und können weiterhin eingelöst werden – auch nach einer Kündigung.",
  },
];

interface ActiveSub {
  planId: string;
  planName: string;
  renewsAt: string | null;
}

export default function AboPage() {
  const router = useRouter();
  const [currentSub, setCurrentSub] = useState<ActiveSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);
        setUserEmail(user.email ?? null);

        const { data: subData } = await supabase
          .from("user_subscriptions")
          .select(
            `
            id,
            current_period_end,
            subscription_plans (
              id,
              name
            )
          `
          )
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (subData && subData.subscription_plans) {
          const plan = Array.isArray(subData.subscription_plans)
            ? subData.subscription_plans[0]
            : subData.subscription_plans;
          setCurrentSub({
            planId: plan.id,
            planName: plan.name,
            renewsAt: subData.current_period_end ?? null,
          });
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    if (!userId || !userEmail) {
      router.push("/login");
      return;
    }

    setSubscribing(planId);
    try {
      const res = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "platform",
          planId,
          userEmail,
          userId,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Subscription error:", err);
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Möchtest du dein Abo wirklich kündigen?")) return;
    // Cancellation handled via Stripe portal or dedicated endpoint
    router.push("/profil?tab=subscription");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "–";
    return new Date(dateStr).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Dark Header */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-xs uppercase tracking-widest text-[#6E6860]">
          Fragrance OS
        </p>
        <h1 className="text-3xl font-bold text-white">Abonnements</h1>
        <p className="mt-2 text-sm text-[#9E9890]">Wähle dein Erlebnis</p>
      </div>

      <div className="px-5 py-8 max-w-5xl mx-auto">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0A0A0A] border-t-transparent" />
          </div>
        )}

        {!loading && (
          <>
            {/* Active Subscription Banner */}
            {currentSub && (
              <div className="mb-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-[#9E9890] mb-1">
                      Dein aktuelles Abo
                    </p>
                    <p className="text-lg font-bold text-[#0A0A0A]">
                      {currentSub.planName}
                    </p>
                    {currentSub.renewsAt && (
                      <p className="mt-0.5 text-sm text-[#6E6860]">
                        Verlängert sich am {formatDate(currentSub.renewsAt)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleCancel}
                    className="rounded-full border border-[#E5E0D8] bg-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[#6E6860] transition-all active:scale-95 hover:border-[#C5C0B8]"
                  >
                    Kündigen
                  </button>
                </div>
              </div>
            )}

            {/* Plan Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const isActive =
                  currentSub?.planId.toLowerCase() === plan.id.toLowerCase();
                const isSubscribing = subscribing === plan.id;

                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl bg-white border border-[#E5E0D8] p-6 relative"
                  >
                    {/* Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0A0A0A] px-4 py-1 text-[10px] uppercase tracking-wider text-white whitespace-nowrap">
                        Beliebteste Wahl
                      </div>
                    )}

                    {/* Plan Name */}
                    <h2 className="text-2xl font-bold text-[#0A0A0A]">
                      {plan.name}
                    </h2>

                    {/* Price */}
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-light text-[#0A0A0A]">
                        €{plan.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-[#9E9890]">/Monat</span>
                    </div>

                    {/* Tagline */}
                    <p className="mt-1 text-sm text-[#9E9890]">{plan.tagline}</p>

                    {/* Divider */}
                    <div className="my-5 border-t border-[#E5E0D8]" />

                    {/* Features */}
                    <ul className="space-y-2.5">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2.5 text-sm text-[#6E6860]"
                        >
                          <span
                            className="mt-0.5 shrink-0 text-[10px]"
                            style={{ color: plan.accent }}
                          >
                            ◆
                          </span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Subscribe Button */}
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isActive || isSubscribing}
                      className={`mt-6 w-full rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-wider transition-all active:scale-95
                        ${
                          isActive
                            ? "bg-[#F0EDE8] text-[#9E9890] cursor-default"
                            : "bg-[#0A0A0A] text-white hover:bg-[#2A2A2A] disabled:opacity-60 disabled:cursor-not-allowed"
                        }`}
                    >
                      {isActive ? (
                        "Aktiv"
                      ) : isSubscribing ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Laden…
                        </span>
                      ) : (
                        "Jetzt abonnieren"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* FAQ Section */}
            <div className="mt-12">
              <h2 className="mb-6 text-lg font-bold text-[#0A0A0A]">
                Häufige Fragen
              </h2>
              <div className="space-y-3">
                {FAQ.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl bg-white border border-[#E5E0D8]"
                  >
                    <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-medium text-[#0A0A0A] list-none">
                      <span>{item.q}</span>
                      <span className="ml-4 shrink-0 text-[#C5C0B8] transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="px-5 pb-5 text-sm leading-relaxed text-[#6E6860]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            {/* Footer Links */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[#E5E0D8] pt-8">
              <Link
                href="/datenschutz"
                className="text-xs text-[#9E9890] hover:text-[#6E6860] transition-colors"
              >
                Datenschutz
              </Link>
              <Link
                href="/agb"
                className="text-xs text-[#9E9890] hover:text-[#6E6860] transition-colors"
              >
                AGB
              </Link>
              <Link
                href="/impressum"
                className="text-xs text-[#9E9890] hover:text-[#6E6860] transition-colors"
              >
                Impressum
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
