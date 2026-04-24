"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ScrollReveal from "@/components/ScrollReveal";
import AnimatedFlacon from "@/components/AnimatedFlacon";
import ScentParticles from "@/components/ScentParticles";

type OrderItem = {
  id: string;
  fragranceId: string;
  name: string;
  priceCents: number;
  sizeMl: number;
  quantity: number;
};

type Order = {
  id: string;
  createdAt: string;
  status: string;
  totalCents: number;
  customerName: string;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  items: OrderItem[];
};

type DbOrderRow = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  customer_name: string;
  shipping_address_line1: string | null;
  shipping_address_line2: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
};

type DbOrderItemRow = {
  id: string;
  order_id: string;
  fragrance_id: string;
  name: string;
  price_cents: number;
  size_ml: number;
  quantity: number;
};

const STATUS_STEPS = ["created", "in_production", "shipped", "delivered"] as const;

const STATUS_LABELS: Record<string, string> = {
  created: "Bestellt",
  in_production: "In Produktion",
  shipped: "Versendet",
  delivered: "Zugestellt",
  returned: "Retoure",
  cancelled: "Storniert",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  created: "Deine Bestellung ist eingegangen und wird bearbeitet.",
  in_production: "Dein Duft wird gerade für dich hergestellt.",
  shipped: "Dein Paket ist unterwegs.",
  delivered: "Zugestellt — viel Freude mit deinem Duft!",
  returned: "Die Bestellung wurde zurückgegeben.",
  cancelled: "Die Bestellung wurde storniert.",
};

const STATUS_ICON: Record<string, string> = {
  created: "📋",
  in_production: "⚗️",
  shipped: "📦",
  delivered: "✓",
  cancelled: "✕",
  returned: "↩",
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    created: "bg-amber-50 text-amber-700 border-amber-200",
    in_production: "bg-blue-50 text-blue-700 border-blue-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-500 border-red-200",
    returned: "bg-red-50 text-red-500 border-red-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${colors[status] ?? "bg-[#F0EDE8] text-[#6E6860] border-[#E5E0D8]"}`}>
      {STATUS_ICON[status] ?? ""} {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatusTimeline({ status }: { status: string }) {
  if (status === "cancelled" || status === "returned") {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <span className="text-[10px] text-[#9E9890]">{STATUS_DESCRIPTIONS[status]}</span>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);
  // Unknown status — fall back to showing just the badge
  if (currentIndex === -1) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <span className="text-[10px] text-[#9E9890]">{STATUS_DESCRIPTIONS[status] ?? status}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start">
        {STATUS_STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;
          const isLast = i === STATUS_STEPS.length - 1;
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-500 ${
                  active
                    ? "border-2 border-[#C9A96E] bg-[#C9A96E] text-white shadow-[0_0_12px_rgba(201,169,110,0.5)]"
                    : done
                    ? "border-2 border-[#0A0A0A] bg-[#0A0A0A] text-white"
                    : "border border-[#E5E0D8] text-[#C5C0B8]"
                }`}>
                  {done ? (active ? STATUS_ICON[step] : "✓") : i + 1}
                  {active && (
                    <span className="absolute inset-0 rounded-full border-2 border-[#C9A96E] animate-ping opacity-40" />
                  )}
                </div>
                <span className={`mt-1.5 max-w-15 text-center text-[9px] leading-tight ${
                  active ? "font-semibold text-[#C9A96E]" : done ? "font-medium text-[#0A0A0A]" : "text-[#C5C0B8]"
                }`}>
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {!isLast && (
                <div className={`mb-5 h-px flex-1 transition-all duration-700 ${
                  i < currentIndex ? "bg-[#0A0A0A]" : "bg-[#E5E0D8]"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[#9E9890]">{STATUS_DESCRIPTIONS[status] ?? ""}</p>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNotLoggedIn(true); setLoading(false); return; }

      const { data: orderRows, error } = await supabase
        .from("orders")
        .select("id, created_at, status, total_cents, customer_name, shipping_address_line1, shipping_address_line2, shipping_city, shipping_postal_code, shipping_country")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !orderRows) { setLoading(false); return; }

      const orderIds = (orderRows as DbOrderRow[]).map((o) => o.id);
      const itemsByOrder: Record<string, DbOrderItemRow[]> = {};

      if (orderIds.length > 0) {
        const { data: itemRows } = await supabase
          .from("order_items")
          .select("id, order_id, fragrance_id, name, price_cents, size_ml, quantity")
          .in("order_id", orderIds);

        for (const item of (itemRows ?? []) as DbOrderItemRow[]) {
          if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
          itemsByOrder[item.order_id].push(item);
        }
      }

      const mapped: Order[] = (orderRows as DbOrderRow[]).map((o) => ({
        id: o.id,
        createdAt: o.created_at,
        status: o.status,
        totalCents: o.total_cents,
        customerName: o.customer_name,
        shippingAddressLine1: o.shipping_address_line1,
        shippingAddressLine2: o.shipping_address_line2,
        shippingCity: o.shipping_city,
        shippingPostalCode: o.shipping_postal_code,
        shippingCountry: o.shipping_country,
        items: (itemsByOrder[o.id] ?? []).map((item) => ({
          id: item.id,
          fragranceId: item.fragrance_id,
          name: item.name,
          priceCents: item.price_cents,
          sizeMl: item.size_ml,
          quantity: item.quantity,
        })),
      }));

      setOrders(mapped);
      if (mapped.length > 0) setExpandedId(mapped[0].id);
      setLoading(false);
    }
    load();
  }, []);

  async function reorder(order: Order) {
    // Validate fragrances still exist and are public before adding to cart
    const fragranceIds = order.items.map((i) => i.fragranceId).filter(Boolean);
    const { data: activeFragrances } = await supabase
      .from("fragrances")
      .select("id")
      .in("id", fragranceIds)
      .eq("is_public", true)
      .eq("status", "active");

    const availableIds = new Set((activeFragrances ?? []).map((f: { id: string }) => f.id));
    const availableItems = order.items.filter((i) => availableIds.has(i.fragranceId));

    if (availableItems.length === 0) {
      alert("Diese Produkte sind leider nicht mehr verfügbar.");
      return;
    }

    const raw = localStorage.getItem("fragrance-os-cart");
    let cart: { id: string; fragranceId: string; variantId: string | null; name: string; priceCents: number; sizeMl: number; quantity: number }[] = [];
    try { if (raw) cart = JSON.parse(raw); } catch { /* ignore */ }

    for (const item of availableItems) {
      const existing = cart.find((c) => c.fragranceId === item.fragranceId);
      if (existing) {
        cart = cart.map((c) => c.fragranceId === item.fragranceId ? { ...c, quantity: c.quantity + item.quantity } : c);
      } else {
        cart.push({ id: crypto.randomUUID(), fragranceId: item.fragranceId, variantId: null, name: item.name, priceCents: item.priceCents, sizeMl: item.sizeMl, quantity: item.quantity });
      }
    }

    if (availableItems.length < order.items.length) {
      alert(`${order.items.length - availableItems.length} Artikel sind nicht mehr verfügbar und wurden nicht hinzugefügt.`);
    }

    localStorage.setItem("fragrance-os-cart", JSON.stringify(cart));
    window.location.href = "/cart";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AnimatedFlacon size={60} fillPercent={50} animated />
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Lädt Bestellungen</p>
        </div>
      </main>
    );
  }

  if (notLoggedIn) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#0A0A0A]">Anmeldung erforderlich</h1>
          <p className="mt-2 text-sm text-[#6E6860]">Bitte logge dich ein, um deine Bestellungen zu sehen.</p>
          <Link href="/auth" className="mt-6 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all">
            Zum Login
          </Link>
        </div>
      </main>
    );
  }

  const activeCount = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "returned").length;

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* Dark Header with particles */}
      <div className="relative overflow-hidden bg-[#0A0A0A] px-5 pt-20 pb-10">
        <ScentParticles count={10} color="rgba(201,169,110," className="opacity-40" />
        <div className="pointer-events-none absolute right-4 bottom-0 opacity-10 hidden sm:block">
          <AnimatedFlacon size={100} fillPercent={60} animated />
        </div>
        <div className="mx-auto max-w-3xl relative flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
            <h1 className="text-3xl font-bold text-white">Bestellungen</h1>
            <p className="mt-1.5 flex items-center gap-2 text-xs text-white/40">
              <span>{orders.length} {orders.length === 1 ? "Bestellung" : "Bestellungen"}</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#C9A96E]/20 border border-[#C9A96E]/30 px-2 py-0.5 text-[10px] font-medium text-[#C9A96E]">
                  {activeCount} aktiv
                </span>
              )}
            </p>
          </div>
          <Link href="/discover" className="mb-1 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:border-white/40 transition-colors">
            Discover
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        {orders.length === 0 ? (
          <ScrollReveal animation="scale">
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-10 text-center">
              <div className="flex justify-center mb-4 opacity-60">
                <AnimatedFlacon size={70} fillPercent={20} animated />
              </div>
              <h2 className="text-base font-semibold text-[#0A0A0A]">Noch keine Bestellungen</h2>
              <p className="mt-2 text-sm text-[#6E6860]">Du hast noch keine Bestellungen aufgegeben.</p>
              <Link href="/discover" className="mt-5 inline-block rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all">
                Düfte entdecken
              </Link>
            </div>
          </ScrollReveal>
        ) : (
          <div className="space-y-3">
            {orders.map((order, idx) => {
              const isExpanded = expandedId === order.id;
              const isActive = order.status !== "cancelled" && order.status !== "returned" && order.status !== "delivered";

              return (
                <ScrollReveal key={order.id} animation="up" delay={Math.min(idx * 50, 500)} once>
                  <div className={`overflow-hidden rounded-2xl border bg-white transition-all duration-300 ${
                    isActive ? "border-[#C9A96E]/40 shadow-[0_0_0_1px_rgba(201,169,110,0.15)]" : "border-[#E5E0D8]"
                  }`}>
                    {/* Clickable header */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="w-full p-5 text-left hover:bg-[#FAFAF8] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-semibold text-[#0A0A0A]">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <StatusBadge status={order.status} />
                            {isActive && (
                              <span className="rounded-full bg-[#C9A96E]/10 border border-[#C9A96E]/30 px-2 py-0.5 text-[10px] font-medium text-[#C9A96E]">
                                Aktiv
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-[#C5C0B8]">
                            {new Date(order.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                            {" · "}
                            {order.items.length} {order.items.length === 1 ? "Artikel" : "Artikel"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#0A0A0A]">
                            {(order.totalCents / 100).toFixed(2)} €
                          </span>
                          <span className={`text-xs text-[#C5C0B8] transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Status Timeline */}
                      <div className="mt-4">
                        <StatusTimeline status={order.status} />
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="border-t border-[#E5E0D8] px-5 py-5 space-y-5">
                        {/* Items */}
                        <div>
                          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Artikel</p>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 group hover:border-[#C9A96E]/40 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A0A0A] opacity-70">
                                    <AnimatedFlacon size={20} fillPercent={60} animated={false} />
                                  </div>
                                  <div>
                                    <Link href={`/fragrance/${item.fragranceId}`} className="text-sm font-medium text-[#0A0A0A] hover:text-[#C9A96E] transition-colors">
                                      {item.name}
                                    </Link>
                                    <p className="mt-0.5 text-[10px] text-[#C5C0B8]">{item.sizeMl} ml · {item.quantity}×</p>
                                  </div>
                                </div>
                                <span className="text-sm font-medium text-[#0A0A0A]">
                                  {((item.priceCents * item.quantity) / 100).toFixed(2)} €
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping address */}
                        {order.shippingAddressLine1 && (
                          <div>
                            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Lieferadresse</p>
                            <div className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3">
                              <address className="not-italic text-sm text-[#3A3530] leading-relaxed">
                                {order.customerName}<br />
                                {order.shippingAddressLine1}
                                {order.shippingAddressLine2 && <><br />{order.shippingAddressLine2}</>}
                                <br />
                                {order.shippingPostalCode} {order.shippingCity}
                                {order.shippingCountry && `, ${order.shippingCountry}`}
                              </address>
                            </div>
                          </div>
                        )}

                        {/* Total + Reorder */}
                        <div className="border-t border-[#E5E0D8] pt-4">
                          <div className="flex items-center justify-between text-sm mb-4">
                            <span className="text-[#6E6860]">Gesamtbetrag</span>
                            <span className="font-semibold text-[#0A0A0A]">{(order.totalCents / 100).toFixed(2)} €</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => reorder(order)}
                            className="w-full rounded-full border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[#6E6860] hover:border-[#C9A96E] hover:text-[#C9A96E] active:scale-95 transition-all"
                          >
                            ↻ Wieder bestellen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
