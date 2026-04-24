"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";
import { trackEvent } from "@/lib/tracking";
import { authFetch } from "@/lib/authFetch";

type CartItem = {
  id: string;
  fragranceId: string; // kann "realId__variantId" sein
  variantId: string | null;
  name: string;
  priceCents: number;
  sizeMl: number;
  quantity: number;
  shareCode?: string;
};

type DbFragranceRow = {
  id: string;
  owner_id: string | null;
};

type DbProfileRow = {
  id: string;
  commission_percent: number;
};

type DbFragranceAccordRow = {
  fragrance_id: string;
  accord_id: string;
  percentage: number;
};

type DbAccordComponentRow = {
  accord_id: string;
  raw_material_id: string;
  percentage: number;
};

type DbRawMaterialCostRow = {
  id: string;
  cost_per_unit_cents: number;
};

type DbReferralRow = {
  creator_id: string;
  lifetime_commission_percent: number;
};

type DbAffiliateProfileRow = {
  id: string;
  affiliate_commission_percent: number;
};

const AFFILIATE_REF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

function readAffiliateRef(): string | null {
  try {
    const ref = localStorage.getItem("fos_affiliate_ref");
    const ts = Number(localStorage.getItem("fos_affiliate_ref_ts") ?? "0");
    if (!ref) return null;
    if (Date.now() - ts > AFFILIATE_REF_TTL_MS) {
      localStorage.removeItem("fos_affiliate_ref");
      localStorage.removeItem("fos_affiliate_ref_ts");
      return null;
    }
    return ref;
  } catch {
    return null;
  }
}

const CART_STORAGE_KEY = "fragrance-os-cart";

// Extrahiert die echte Fragrance-UUID aus einem möglicherweise zusammengesetzten Key
function extractFragranceId(cartFragranceId: string): string {
  return cartFragranceId.split("__")[0];
}

function normalizeCommissionPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 25;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function calculateMaterialCostForFragrance(
  fragranceId: string,
  fragranceAccords: DbFragranceAccordRow[],
  accordComponents: DbAccordComponentRow[],
  rawMaterialCostMap: Map<string, number>,
): number {
  const accordsForFragrance = fragranceAccords.filter(
    (entry) => entry.fragrance_id === fragranceId,
  );

  let totalCostCents = 0;

  for (const fragranceAccord of accordsForFragrance) {
    const componentsForAccord = accordComponents.filter(
      (component) => component.accord_id === fragranceAccord.accord_id,
    );

    for (const component of componentsForAccord) {
      const rawMaterialCostCents =
        rawMaterialCostMap.get(component.raw_material_id) ?? 0;

      const effectivePercentage =
        (fragranceAccord.percentage * component.percentage) / 100;

      totalCostCents += (rawMaterialCostCents * effectivePercentage) / 100;
    }
  }

  return Math.round(totalCostCents);
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddressLine1, setShippingAddressLine1] = useState("");
  const [shippingAddressLine2, setShippingAddressLine2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("DE");
  const [orderSuccessMessage, setOrderSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      try {
        const parsed: CartItem[] = JSON.parse(raw);
        setItems(parsed);
      } catch {
        // ignore
      }
    }

    // Profil laden → Felder vorausfüllen
    async function prefillFromProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const profile = await getOwnProfile();
      if (!profile) return;

      setCustomerName(profile.display_name ?? profile.username ?? "");
      setCustomerEmail(profile.email ?? user.email ?? "");
      setShippingPhone(profile.phone ?? "");
      setShippingAddressLine1(profile.address_line1 ?? "");
      setShippingAddressLine2(profile.address_line2 ?? "");
      setShippingCity(profile.city ?? "");
      setShippingPostalCode(profile.postal_code ?? "");
      setShippingCountry(profile.country ?? "DE");
    }

    prefillFromProfile();
  }, []);

  const totalCents = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );
  }, [items]);

  function removeItem(id: string) {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  }

  function updateQuantity(id: string, quantity: number) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, quantity || 1) } : item,
    );
    setItems(updated);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
  }

  async function createOrder() {
    if (items.length === 0) {
      alert("Dein Warenkorb ist leer.");
      return;
    }

    if (!customerName.trim()) {
      alert("Bitte gib deinen Namen ein.");
      return;
    }

    if (!customerEmail.trim()) {
      alert("Bitte gib deine E-Mail ein.");
      return;
    }

    if (!shippingAddressLine1.trim() || !shippingCity.trim() || !shippingPostalCode.trim()) {
      alert("Bitte gib eine vollständige Lieferadresse ein.");
      return;
    }

    setLoading(true);
    setOrderSuccessMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Bitte logge dich ein, um eine Bestellung zu erstellen.");
      setLoading(false);
      return;
    }

    // Echte Fragrance-IDs (ohne Variant-Suffix)
    const realFragranceIds = Array.from(
      new Set(items.map((item) => extractFragranceId(item.fragranceId))),
    );

    // Lifetime-Provision: prüfen ob Käufer über Referral registriert wurde
    const { data: referralRows } = await supabase
      .from("referral_attributions")
      .select("creator_id, lifetime_commission_percent")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    const referral = referralRows as DbReferralRow | null;

    // Affiliate: Wer hat diesen Kauf vermittelt? (Profilbesuch in letzten 30 Tagen)
    const affiliateUsername = readAffiliateRef();
    let affiliateUser: DbAffiliateProfileRow | null = null;

    if (affiliateUsername) {
      const { data: affData } = await supabase
        .from("profiles")
        .select("id, affiliate_commission_percent")
        .eq("username", affiliateUsername)
        .neq("id", user.id)   // kein Selbst-Affiliate
        .maybeSingle();
      affiliateUser = affData as DbAffiliateProfileRow | null;
    }

    const orderId = crypto.randomUUID();

    const { error: orderError } = await supabase.from("orders").insert({
      id: orderId,
      total_cents: totalCents,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      user_id: user.id,
      status: "pending_payment",
      shipping_address_line1: shippingAddressLine1.trim(),
      shipping_address_line2: shippingAddressLine2.trim() || null,
      shipping_city: shippingCity.trim(),
      shipping_postal_code: shippingPostalCode.trim(),
      shipping_country: shippingCountry,
      shipping_phone: shippingPhone.trim() || null,
    });

    if (orderError) {
      console.error("Fehler beim Erstellen der Order:", orderError);
      alert("Bestellung konnte nicht erstellt werden.");
      setLoading(false);
      return;
    }

    const { data: fragranceRows, error: fragrancesError } = await supabase
      .from("fragrances")
      .select("id, owner_id")
      .in("id", realFragranceIds);

    if (fragrancesError) {
      console.error("Fehler beim Laden der Duftdaten:", fragrancesError);
      alert("Bestellung konnte nicht vollständig vorbereitet werden.");
      setLoading(false);
      return;
    }

    const fragranceMap = new Map(
      (fragranceRows ?? []).map((row: DbFragranceRow) => [row.id, row]),
    );

    const creatorIds = Array.from(
      new Set(
        (fragranceRows ?? [])
          .map((row: DbFragranceRow) => row.owner_id)
          .filter(Boolean),
      ),
    ) as string[];

    let profileMap = new Map<string, DbProfileRow>();

    if (creatorIds.length > 0) {
      const { data: profileRows, error: profilesError } = await supabase
        .from("profiles")
        .select("id, commission_percent")
        .in("id", creatorIds);

      if (profilesError) {
        console.error("Fehler beim Laden der Creator-Profile:", profilesError);
        alert("Creator-Provisionen konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      profileMap = new Map(
        (profileRows ?? []).map((row: DbProfileRow) => [row.id, row]),
      );
    }

    const { data: fragranceAccordRows, error: fragranceAccordsError } =
      await supabase
        .from("fragrance_accords")
        .select("fragrance_id, accord_id, percentage")
        .in("fragrance_id", realFragranceIds);

    if (fragranceAccordsError) {
      console.error("Fehler beim Laden der Duft-Accord-Zuordnungen:", fragranceAccordsError);
      alert("Duftformeln konnten nicht geladen werden.");
      setLoading(false);
      return;
    }

    const accordIds = Array.from(
      new Set(
        (fragranceAccordRows ?? []).map(
          (row: DbFragranceAccordRow) => row.accord_id,
        ),
      ),
    );

    let accordComponentRows: DbAccordComponentRow[] = [];

    if (accordIds.length > 0) {
      const { data, error } = await supabase
        .from("accord_components")
        .select("accord_id, raw_material_id, percentage")
        .in("accord_id", accordIds);

      if (error) {
        console.error("Fehler beim Laden der Accord-Bestandteile:", error);
        alert("Accord-Bestandteile konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      accordComponentRows = data ?? [];
    }

    const rawMaterialIds = Array.from(
      new Set(
        accordComponentRows.map(
          (row: DbAccordComponentRow) => row.raw_material_id,
        ),
      ),
    );

    let rawMaterialCostMap = new Map<string, number>();

    if (rawMaterialIds.length > 0) {
      const { data, error } = await supabase
        .from("raw_materials")
        .select("id, cost_per_unit_cents")
        .in("id", rawMaterialIds);

      if (error) {
        console.error("Fehler beim Laden der Rohstoffkosten:", error);
        alert("Rohstoffkosten konnten nicht geladen werden.");
        setLoading(false);
        return;
      }

      rawMaterialCostMap = new Map(
        (data ?? []).map((row: DbRawMaterialCostRow) => [
          row.id,
          Number(row.cost_per_unit_cents),
        ]),
      );
    }

    const orderItems = items.map((item) => {
      const realId = extractFragranceId(item.fragranceId);
      const fragrance = fragranceMap.get(realId);
      const creatorId = fragrance?.owner_id ?? null;

      const creatorProfile = creatorId ? (profileMap.get(creatorId) ?? null) : null;
      const commissionPercent = creatorId
        ? normalizeCommissionPercent(creatorProfile?.commission_percent)
        : 0;

      const lineTotalCents = item.priceCents * item.quantity;
      let creatorCommissionCents = creatorId
        ? Math.round((lineTotalCents * commissionPercent) / 100)
        : 0;

      // Lifetime-Provision: wenn Käufer über Creator X geworben wurde und
      // der Duft von Creator X stammt → zusätzliche Provision addieren
      if (referral && creatorId && referral.creator_id === creatorId) {
        const lifetimeBonus = Math.round(
          (lineTotalCents * referral.lifetime_commission_percent) / 100,
        );
        creatorCommissionCents += lifetimeBonus;
      }

      // Affiliate-Provision: Profilbesucher der den Kauf vermittelt hat
      // Affiliate darf nicht gleichzeitig der Creator des Dufts sein (keine Doppelzählung)
      const affiliateCommissionPercent =
        affiliateUser && affiliateUser.id !== creatorId
          ? affiliateUser.affiliate_commission_percent
          : 0;
      const affiliateCommissionCents = affiliateCommissionPercent > 0
        ? Math.round((lineTotalCents * affiliateCommissionPercent) / 100)
        : 0;

      const materialCostPerUnitCents = calculateMaterialCostForFragrance(
        realId,
        fragranceAccordRows ?? [],
        accordComponentRows,
        rawMaterialCostMap,
      );

      return {
        id: crypto.randomUUID(),
        order_id: orderId,
        fragrance_id: realId,
        name: item.name,
        price_cents: item.priceCents,
        size_ml: item.sizeMl,
        quantity: item.quantity,
        creator_id: creatorId,
        creator_commission_cents: creatorCommissionCents,
        commission_percent: commissionPercent,
        material_cost_cents: materialCostPerUnitCents * item.quantity,
        production_cost_cents: 0,
        affiliate_user_id: affiliateCommissionCents > 0 ? affiliateUser!.id : null,
        affiliate_commission_cents: affiliateCommissionCents,
        affiliate_commission_percent: affiliateCommissionPercent,
        affiliate_payout_status: affiliateCommissionCents > 0 ? "pending" : "none",
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Fehler beim Erstellen der Order-Items:", itemsError);
      alert("Bestellung wurde angelegt, aber Positionen konnten nicht gespeichert werden.");
      setLoading(false);
      return;
    }

    localStorage.removeItem(CART_STORAGE_KEY);
    setItems([]);
    setCustomerName("");
    setCustomerEmail("");

    trackEvent({
      eventType: "order_placed",
      metadata: {
        order_id: orderId,
        total_cents: totalCents,
        item_count: items.length,
        fragrance_ids: items.map((i) => extractFragranceId(i.fragranceId)),
      },
    });

    // Stripe Checkout starten
    const shareCode = items.find((i) => i.shareCode)?.shareCode ?? null;
    const stripeRes = await authFetch("/api/stripe/create-checkout", {
      method: "POST",
      body: JSON.stringify({
        orderId,
        customerEmail: customerEmail.trim(),
        shareCode,
        // items and prices are read from DB server-side — no client values trusted
      }),
    });

    const stripeData = await stripeRes.json();

    if (!stripeRes.ok || !stripeData.url) {
      console.error("Stripe-Fehler:", stripeData);
      setOrderSuccessMessage(`Bestellung ${orderId.slice(0, 8).toUpperCase()} angelegt — Zahlung konnte nicht gestartet werden. Bitte kontaktiere uns.`);
      setLoading(false);
      return;
    }

    window.location.href = stripeData.url;
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      {/* Dark Header */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Warenkorb</h1>
        <p className="mt-1 text-xs text-white/40">
          {items.length === 0
            ? "Keine Artikel"
            : `${items.length} ${items.length === 1 ? "Artikel" : "Artikel"}`}
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6">
        {orderSuccessMessage && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">{orderSuccessMessage}</p>
            <Link
              href="/orders"
              className="mt-2 inline-block text-xs text-green-700 underline"
            >
              Zu den Bestellungen
            </Link>
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-white border border-[#E5E0D8] p-14 text-center mx-auto">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="text-[#E5E0D8]">
              <circle cx="28" cy="28" r="27" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M16 20h3l4 14h14l4-10H20" stroke="#C5C0B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="24" cy="38" r="2" fill="#C5C0B8"/>
              <circle cx="34" cy="38" r="2" fill="#C5C0B8"/>
            </svg>
            <div>
              <p className="text-base font-semibold text-[#0A0A0A]">Dein Warenkorb ist leer</p>
              <p className="mt-1 text-sm text-[#9E9890]">Entdecke unsere einzigartigen Düfte.</p>
            </div>
            <Link
              href="/discover"
              className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-[#1a1a1a] active:scale-95 transition-all"
            >
              Düfte entdecken
            </Link>
          </div>
        ) : (
          <>
            <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-8 lg:items-start">
            {/* Cart Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-white border border-[#E5E0D8] p-5 hover:bg-[#F5F3F0] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-[#0A0A0A]">{item.name}</h2>
                      <p className="mt-0.5 text-xs text-[#9E9890]">{item.sizeMl} ml</p>
                      <p className="text-xs text-[#9E9890]">
                        Einzelpreis: {(item.priceCents / 100).toFixed(2)} €
                      </p>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-full border border-red-200 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Entfernen
                    </button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Menge</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E0D8] text-sm text-[#6E6860] hover:border-[#0A0A0A] hover:bg-[#F5F0EA] active:scale-90 transition-all"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium text-[#0A0A0A]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E0D8] text-sm text-[#6E6860] hover:border-[#0A0A0A] hover:bg-[#F5F0EA] active:scale-90 transition-all"
                      >
                        +
                      </button>
                    </div>
                    <span className="ml-auto text-sm font-semibold text-[#0A0A0A]">
                      {((item.priceCents * item.quantity) / 100).toFixed(2)} €
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Section */}
            <div className="mt-6 lg:mt-0 rounded-2xl bg-white border border-[#E5E0D8] shadow-sm p-5 lg:sticky lg:top-24">
              <h2 className="text-sm font-semibold text-[#0A0A0A]">Checkout</h2>
              <p className="mt-1 text-xs text-[#9E9890]">
                Felder werden aus deinem Profil vorausgefüllt.
              </p>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Name *</p>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                      placeholder="Max Mustermann"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">E-Mail *</p>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                      placeholder="max@email.de"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Telefon</p>
                  <input
                    type="tel"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                    placeholder="+49 ..."
                  />
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                    Straße + Hausnummer *
                  </p>
                  <input
                    type="text"
                    value={shippingAddressLine1}
                    onChange={(e) => setShippingAddressLine1(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                    placeholder="Musterstraße 42"
                  />
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">
                    Adresszusatz (optional)
                  </p>
                  <input
                    type="text"
                    value={shippingAddressLine2}
                    onChange={(e) => setShippingAddressLine2(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                    placeholder="Apartment, Etage etc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">PLZ *</p>
                    <input
                      type="text"
                      value={shippingPostalCode}
                      onChange={(e) => setShippingPostalCode(e.target.value)}
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Stadt *</p>
                    <input
                      type="text"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                      placeholder="Berlin"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Land</p>
                  <select
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm text-[#6E6860] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                  >
                    <option value="DE">Deutschland</option>
                    <option value="AT">Österreich</option>
                    <option value="CH">Schweiz</option>
                    <option value="FR">Frankreich</option>
                    <option value="NL">Niederlande</option>
                    <option value="BE">Belgien</option>
                    <option value="LU">Luxemburg</option>
                    <option value="IT">Italien</option>
                    <option value="ES">Spanien</option>
                    <option value="GB">Vereinigtes Königreich</option>
                    <option value="US">USA</option>
                  </select>
                </div>
              </div>

              {/* Summary + CTA */}
              <div className="mt-6 border-t border-[#E5E0D8] pt-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-[#9E9890] uppercase tracking-[0.2em]">Gesamt</span>
                  <span className="text-lg font-semibold text-[#0A0A0A]">
                    {(totalCents / 100).toFixed(2)} €
                  </span>
                </div>
                <button
                  onClick={createOrder}
                  disabled={loading}
                  className="w-full rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                >
                  {loading ? "Bitte warten..." : "Jetzt bestellen"}
                </button>
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
