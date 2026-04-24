"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile, type Profile } from "@/lib/profile";
import InfoTooltip from "@/components/InfoTooltip";
import { HELP } from "@/lib/helpTexts";

type PayoutStatus = "pending" | "payable" | "paid";

type CreatorOrderItem = {
  id: string;
  orderId: string;
  fragranceId: string;
  fragranceName: string;
  priceCents: number;
  sizeMl: number;
  quantity: number;
  creatorCommissionCents: number;
  commissionPercent: number;
  payoutStatus: PayoutStatus;
  paidAt: string | null;
  orderCreatedAt: string;
  orderStatus: string;
  customerName: string;
};

type ReferralEntry = {
  id: string;
  referredUserId: string;
  referralCode: string | null;
  lifetimeCommissionPercent: number;
  createdAt: string;
};

type DbReferralRow = {
  id: string;
  referred_user_id: string;
  referral_code: string | null;
  lifetime_commission_percent: number;
  created_at: string;
};

type GroupedFragranceStats = {
  fragranceId: string;
  fragranceName: string;
  totalUnitsSold: number;
  totalRevenueCents: number;
  totalCommissionCents: number;
  totalOrders: number;
  averageCommissionPercent: number;
};

type DbOrderItemRow = {
  id: string;
  order_id: string;
  fragrance_id: string;
  name: string;
  price_cents: number;
  size_ml: number;
  quantity: number;
  creator_id: string | null;
  creator_commission_cents: number;
  commission_percent: number;
  payout_status: PayoutStatus;
  paid_at: string | null;
};

type DbOrderRow = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
};

type CreatorProduct = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  stock: number;
  category: string;
  image_url: string | null;
  is_published: boolean;
  weight_grams: number | null;
};

type PayoutRequest = {
  id: string;
  amount_cents: number;
  fee_cents: number;
  net_cents: number;
  type: string;
  status: string;
  requested_at: string;
};

type ConnectStatus = {
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
} | null;

type Tab = "uebersicht" | "provisionen" | "referrals" | "fanabo" | "produkte" | "auszahlung" | "wachstum" | "affiliate";

type AffiliatePayout = {
  id: string;
  orderItemId: string;
  amountCents: number;
  commissionPercent: number;
  status: "pending" | "payable" | "paid";
  createdAt: string;
  paidAt: string | null;
};

type DbAffiliatePayoutRow = {
  id: string;
  order_item_id: string;
  amount_cents: number;
  commission_percent: number;
  status: "pending" | "payable" | "paid";
  created_at: string;
  paid_at: string | null;
};

const CONTENT_IDEAS = [
  { emoji: "🎬", title: "Behind-the-Scenes", body: "Zeige den kreativen Prozess hinter deiner Duftkreation – von den Rohstoffen bis zum fertigen Produkt." },
  { emoji: "📖", title: "Die Story deines Dufts", body: "Erzähle die persönliche Geschichte und Inspiration hinter deinem Duft." },
  { emoji: "🌿", title: "Ingredient Spotlight", body: "Erkläre eine Zutat in der Tiefe – ihre Herkunft, Eigenschaften und Wirkung auf die Komposition." },
  { emoji: "✨", title: "Dry-Down Dokumentation", body: "Dokumentiere wie sich der Duft von der Kopfnote bis zur Basisnote auf der Haut entwickelt." },
  { emoji: "🎁", title: "Unboxing-Content", body: "Präsentiere das Packaging und die erste Begegnung mit deinem Duft." },
  { emoji: "💬", title: "Kundenstimmen teilen", body: "Teile authentisches Feedback – sozialer Beweis ist das stärkste Verkaufsargument." },
  { emoji: "🎯", title: "Duft-Matchmaking", body: "Erkläre welcher Persönlichkeitstyp oder welche Stimmung zu deinem Duft passt." },
  { emoji: "🔬", title: "Creator Talk", body: "Erkläre den Unterschied zwischen Eau de Parfum und Extrait anhand deiner eigenen Kreation." },
];

const PRODUCT_CATEGORIES = [
  { value: "flakon", label: "Flakon" },
  { value: "sample", label: "Sample" },
  { value: "accessoire", label: "Accessoire" },
  { value: "merch", label: "Merch" },
  { value: "other", label: "Sonstiges" },
];

function getPayoutStatusLabel(status: PayoutStatus): string {
  if (status === "pending") return "offen";
  if (status === "payable") return "auszahlbar";
  return "ausgezahlt";
}

export default function CreatorDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<CreatorOrderItem[]>([]);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("uebersicht");
  const [connectBanner, setConnectBanner] = useState<"success" | "retry" | null>(null);

  // Fan-Abo
  const [creatorPlan, setCreatorPlan] = useState<{
    id: string;
    name: string;
    description: string;
    price_cents: number;
    active: boolean;
    subscriber_count: number;
    benefits: string[];
  } | null>(null);
  const [planName, setPlanName] = useState("Fan-Abo");
  const [planDescription, setPlanDescription] = useState("");
  const [planPrice, setPlanPrice] = useState("4.99");
  const [planBenefits, setPlanBenefits] = useState(["", "", ""]);
  const [savingPlan, setSavingPlan] = useState(false);

  // Produkte
  const [products, setProducts] = useState<CreatorProduct[]>([]);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "0",
    category: "other",
    image_url: "",
    weight_grams: "200",
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productMsg, setProductMsg] = useState("");

  // Affiliate
  const [affiliatePayouts, setAffiliatePayouts] = useState<AffiliatePayout[]>([]);

  // Auszahlung / Connect
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutType, setPayoutType] = useState<"standard" | "instant">("standard");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState("");
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);

  useEffect(() => {
    // detect ?connect=success|retry
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connect = params.get("connect");
      if (connect === "success" || connect === "retry") {
        setConnectBanner(connect);
        setActiveTab("auszahlung");
      }
    }

    async function loadDashboard() {
      const ownProfile = await getOwnProfile();

      if (!ownProfile) {
        setNotLoggedIn(true);
        setLoading(false);
        return;
      }

      setProfile(ownProfile);

      const { data: itemRows, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("creator_id", ownProfile.id)
        .order("id", { ascending: false });

      if (itemsError) {
        console.error("Fehler beim Laden der Creator-Order-Items:", itemsError);
        setLoading(false);
        return;
      }

      const orderIds = Array.from(
        new Set((itemRows ?? []).map((row: DbOrderItemRow) => row.order_id)),
      );

      let orderRows: DbOrderRow[] = [];

      if (orderIds.length > 0) {
        const { data: dbOrders, error: ordersError } = await supabase
          .from("orders")
          .select("id, created_at, status, customer_name")
          .in("id", orderIds);

        if (ordersError) {
          console.error("Fehler beim Laden der Bestellungen:", ordersError);
          setLoading(false);
          return;
        }

        orderRows = dbOrders ?? [];
      }

      const orderMap = new Map(orderRows.map((order) => [order.id, order]));

      const mappedItems: CreatorOrderItem[] = (itemRows ?? []).map(
        (item: DbOrderItemRow) => {
          const order = orderMap.get(item.order_id);
          return {
            id: item.id,
            orderId: item.order_id,
            fragranceId: item.fragrance_id,
            fragranceName: item.name,
            priceCents: item.price_cents,
            sizeMl: item.size_ml,
            quantity: item.quantity,
            creatorCommissionCents: item.creator_commission_cents,
            commissionPercent: item.commission_percent,
            payoutStatus: item.payout_status,
            paidAt: item.paid_at,
            orderCreatedAt: order?.created_at ?? "",
            orderStatus: order?.status ?? "unknown",
            customerName: order?.customer_name ?? "Unbekannt",
          };
        },
      );

      mappedItems.sort((a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime());
      setItems(mappedItems);

      const { data: referralRows, error: referralError } = await supabase
        .from("referral_attributions")
        .select("id, referred_user_id, referral_code, lifetime_commission_percent, created_at")
        .eq("creator_id", ownProfile.id)
        .order("created_at", { ascending: false });

      if (!referralError && referralRows) {
        const mappedReferrals: ReferralEntry[] = (referralRows as DbReferralRow[]).map((row) => ({
          id: row.id,
          referredUserId: row.referred_user_id,
          referralCode: row.referral_code,
          lifetimeCommissionPercent: row.lifetime_commission_percent,
          createdAt: row.created_at,
        }));
        setReferrals(mappedReferrals);
      }

      const { data: planData } = await supabase
        .from("creator_subscription_plans")
        .select("*")
        .eq("creator_id", ownProfile.id)
        .maybeSingle();

      if (planData) {
        setCreatorPlan(planData);
        setPlanName(planData.name);
        setPlanDescription(planData.description ?? "");
        setPlanPrice((planData.price_cents / 100).toFixed(2));
        setPlanBenefits([...(planData.benefits as string[] ?? []), "", "", ""].slice(0, 3));
      }

      // Produkte laden
      const { data: productData } = await supabase
        .from("creator_products")
        .select("*")
        .eq("creator_id", ownProfile.id)
        .order("created_at", { ascending: false });

      setProducts(productData ?? []);

      // Auszahlungshistorie
      const { data: payoutData } = await supabase
        .from("creator_payout_requests")
        .select("*")
        .eq("creator_id", ownProfile.id)
        .order("requested_at", { ascending: false });

      setPayoutRequests(payoutData ?? []);

      // Affiliate-Payouts laden (eigene Einnahmen als Affiliate)
      const { data: affData } = await supabase
        .from("affiliate_payouts")
        .select("id, order_item_id, amount_cents, commission_percent, status, created_at, paid_at")
        .eq("user_id", ownProfile.id)
        .order("created_at", { ascending: false });

      setAffiliatePayouts(
        ((affData ?? []) as DbAffiliatePayoutRow[]).map((r) => ({
          id: r.id,
          orderItemId: r.order_item_id,
          amountCents: r.amount_cents,
          commissionPercent: r.commission_percent,
          status: r.status,
          createdAt: r.created_at,
          paidAt: r.paid_at,
        })),
      );

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const salesCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const grossRevenueCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
    const commissionCents = items.reduce((sum, item) => sum + item.creatorCommissionCents, 0);
    const uniqueOrders = new Set(items.map((item) => item.orderId)).size;
    const pendingCommissionCents = items
      .filter((item) => item.payoutStatus === "pending")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);
    const payableCommissionCents = items
      .filter((item) => item.payoutStatus === "payable")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);
    const paidCommissionCents = items
      .filter((item) => item.payoutStatus === "paid")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);

    return { salesCount, grossRevenueCents, commissionCents, uniqueOrders, pendingCommissionCents, payableCommissionCents, paidCommissionCents };
  }, [items]);

  const groupedByFragrance = useMemo<GroupedFragranceStats[]>(() => {
    const map = new Map<string, GroupedFragranceStats & { orderIds: Set<string> }>();

    for (const item of items) {
      const existing = map.get(item.fragranceId);
      if (!existing) {
        map.set(item.fragranceId, {
          fragranceId: item.fragranceId,
          fragranceName: item.fragranceName,
          totalUnitsSold: item.quantity,
          totalRevenueCents: item.priceCents * item.quantity,
          totalCommissionCents: item.creatorCommissionCents,
          totalOrders: 1,
          averageCommissionPercent: item.commissionPercent,
          orderIds: new Set([item.orderId]),
        });
        continue;
      }
      existing.totalUnitsSold += item.quantity;
      existing.totalRevenueCents += item.priceCents * item.quantity;
      existing.totalCommissionCents += item.creatorCommissionCents;
      existing.orderIds.add(item.orderId);
    }

    const result = Array.from(map.values()).map((entry) => ({
      fragranceId: entry.fragranceId,
      fragranceName: entry.fragranceName,
      totalUnitsSold: entry.totalUnitsSold,
      totalRevenueCents: entry.totalRevenueCents,
      totalCommissionCents: entry.totalCommissionCents,
      totalOrders: entry.orderIds.size,
      averageCommissionPercent:
        entry.totalRevenueCents > 0
          ? Number(((entry.totalCommissionCents / entry.totalRevenueCents) * 100).toFixed(2))
          : 0,
    }));

    result.sort((a, b) => b.totalCommissionCents - a.totalCommissionCents);
    return result;
  }, [items]);

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      const monthItems = items.filter((item) => {
        const dt = new Date(item.orderCreatedAt);
        return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth();
      });
      return {
        label,
        revCents: monthItems.reduce((s, item) => s + item.priceCents * item.quantity, 0),
        commCents: monthItems.reduce((s, item) => s + item.creatorCommissionCents, 0),
      };
    });
  }, [items]);

  const growthTips = useMemo(() => {
    const tips: { title: string; body: string; action?: string; href?: string }[] = [];

    if (referrals.length === 0) {
      tips.push({
        title: "Aktiviere deinen Referral-Link",
        body: "Du hast noch keine Referrals. Teile deinen persönlichen Link – du erhältst eine dauerhafte Provision auf alle Käufe deiner geworbenen Nutzer.",
        action: "Zu den Referrals",
        href: "#referrals",
      });
    }

    if (groupedByFragrance.length === 0) {
      tips.push({
        title: "Erstelle deinen ersten Duft",
        body: "Dein Portfolio ist noch leer. Starte mit deinem ersten Duft und baue deine persönliche Marke auf.",
        action: "Duft erstellen",
        href: "/create",
      });
    } else if (groupedByFragrance.length < 3) {
      tips.push({
        title: "Erweitere dein Portfolio",
        body: `Du hast ${groupedByFragrance.length} Duft${groupedByFragrance.length > 1 ? "e" : ""}. Creator mit 3+ Düften erzielen durchschnittlich 2,5× mehr Gesamtumsatz.`,
        action: "Neuen Duft erstellen",
        href: "/create",
      });
    }

    if (stats.salesCount > 0) {
      tips.push({
        title: "Käufer als Multiplikatoren nutzen",
        body: "Bitte Käufer, dein Profil oder Referral-Link zu teilen. Mundpropaganda ist der effektivste Kanal für Creator-Wachstum.",
      });
    }

    tips.push({
      title: "Produktbeschreibungen optimieren",
      body: "Detaillierte Noten-Profile, Geschichten und Tragebeschreibungen steigern die Conversion nachweislich um bis zu 40%.",
    });

    const month = new Date().getMonth();
    const season = month >= 2 && month <= 4 ? "Frühling" : month >= 5 && month <= 7 ? "Sommer" : month >= 8 && month <= 10 ? "Herbst" : "Winter";
    const seasonTip = season === "Frühling" || season === "Sommer"
      ? "frische, aquatische und florale Noten"
      : "warme, holzige und orientalische Noten";
    tips.push({
      title: `${season}-Saison nutzen`,
      body: `Es ist ${season}. Positioniere passende Düfte saisonal – ${seasonTip} performen jetzt besonders gut.`,
    });

    return tips.slice(0, 4);
  }, [referrals.length, groupedByFragrance, stats.salesCount]);

  async function saveCreatorPlan() {
    if (!profile?.id) return;
    setSavingPlan(true);
    const priceCents = Math.round(parseFloat(planPrice) * 100);
    const benefits = planBenefits.filter((b) => b.trim());
    const payload = { creator_id: profile.id, name: planName, description: planDescription, price_cents: priceCents, benefits, active: true };

    if (creatorPlan) {
      await supabase.from("creator_subscription_plans").update(payload).eq("id", creatorPlan.id);
    } else {
      const { data: inserted } = await supabase.from("creator_subscription_plans").insert(payload).select().maybeSingle();
      if (inserted) setCreatorPlan(inserted);
    }
    setSavingPlan(false);
  }

  async function saveProduct() {
    if (!profile?.id) return;
    setSavingProduct(true);
    setProductMsg("");

    const payload = {
      creator_id: profile.id,
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      price_cents: Math.round(parseFloat(productForm.price) * 100),
      stock: parseInt(productForm.stock, 10),
      category: productForm.category,
      image_url: productForm.image_url.trim() || null,
      weight_grams: parseInt(productForm.weight_grams, 10) || 200,
    };

    if (editingProductId) {
      const { error } = await supabase.from("creator_products").update(payload).eq("id", editingProductId);
      if (!error) {
        setProducts((prev) => prev.map((p) => p.id === editingProductId ? { ...p, ...payload } : p));
        setProductMsg("Produkt aktualisiert.");
      }
    } else {
      const { data, error } = await supabase.from("creator_products").insert(payload).select().maybeSingle();
      if (!error && data) {
        setProducts((prev) => [data, ...prev]);
        setProductMsg("Produkt erstellt.");
      }
    }

    setEditingProductId(null);
    setProductForm({ name: "", description: "", price: "", stock: "0", category: "other", image_url: "", weight_grams: "200" });
    setSavingProduct(false);
  }

  async function toggleProductPublish(product: CreatorProduct) {
    const { error } = await supabase
      .from("creator_products")
      .update({ is_published: !product.is_published })
      .eq("id", product.id);
    if (!error) {
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, is_published: !p.is_published } : p));
    }
  }

  function startEditProduct(product: CreatorProduct) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description ?? "",
      price: (product.price_cents / 100).toFixed(2),
      stock: String(product.stock),
      category: product.category,
      image_url: product.image_url ?? "",
      weight_grams: String(product.weight_grams ?? 200),
    });
    setProductMsg("");
  }

  async function loadConnectStatus() {
    if (!profile?.id || connectLoading) return;
    setConnectLoading(true);
    try {
      const { authFetch } = await import("@/lib/authFetch");
      const res = await authFetch(`/api/stripe/connect/status?userId=${profile.id}`);
      const data = await res.json();
      setConnectStatus(data);
    } catch {
      setConnectStatus({ connected: false, payoutsEnabled: false, detailsSubmitted: false });
    }
    setConnectLoading(false);
  }

  async function startConnectOnboarding() {
    if (!profile?.id) return;
    setConnectLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { authFetch } = await import("@/lib/authFetch");
    const res = await authFetch("/api/stripe/connect/onboard", {
      method: "POST",
      body: JSON.stringify({ userId: profile.id, email: user?.email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    setConnectLoading(false);
  }

  async function openStripeDashboard() {
    if (!profile?.id) return;
    const { authFetch } = await import("@/lib/authFetch");
    const res = await authFetch("/api/stripe/connect/dashboard", {
      method: "POST",
      body: JSON.stringify({ userId: profile.id }),
    });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
  }

  async function requestPayout() {
    if (!profile?.id || !payoutAmount) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount < 10) return;

    // For instant payouts, the net amount after 1.5% fee must also be ≥ 10€
    if (payoutType === "instant") {
      const netAmount = amount * (1 - 0.015);
      if (netAmount < 10) {
        setPayoutMsg("Fehler: Bei Sofortauszahlung muss der Nettobetrag mind. 10,00 € sein. Mindestanfrage: 10,15 €");
        return;
      }
    }

    setPayoutLoading(true);
    setPayoutMsg("");
    const amountCents = Math.round(amount * 100);

    const { authFetch } = await import("@/lib/authFetch");
    const res = await authFetch("/api/stripe/connect/payout", {
      method: "POST",
      body: JSON.stringify({ userId: profile.id, amountCents, type: payoutType }),
    });
    const data = await res.json();

    if (data.success) {
      const feeEur = (data.feeCents / 100).toFixed(2);
      const netEur = (data.netCents / 100).toFixed(2);
      setPayoutMsg(`Auszahlung beantragt. Nettobetrag: ${netEur} €${data.feeCents > 0 ? ` (Gebühr: ${feeEur} €)` : ""}.`);
      setPayoutAmount("");
      // Reload payout history
      const { data: pd } = await supabase.from("creator_payout_requests").select("*").eq("creator_id", profile.id).order("requested_at", { ascending: false });
      setPayoutRequests(pd ?? []);
    } else {
      setPayoutMsg(`Fehler: ${data.error}`);
    }
    setPayoutLoading(false);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "uebersicht", label: "Übersicht" },
    { key: "provisionen", label: "Provisionen" },
    { key: "referrals", label: "Referrals" },
    { key: "fanabo", label: "Fan-Abo" },
    { key: "produkte", label: "Produkte" },
    { key: "auszahlung", label: "Auszahlung" },
    { key: "wachstum", label: "Wachstum" },
    { key: "affiliate", label: `Affiliate${affiliatePayouts.length > 0 ? ` (${affiliatePayouts.length})` : ""}` },
  ];

  const instantFeeAmt = payoutAmount
    ? ((parseFloat(payoutAmount) * 0.015)).toFixed(2)
    : "0.00";
  const instantNetAmt = payoutAmount
    ? (parseFloat(payoutAmount) - parseFloat(payoutAmount) * 0.015).toFixed(2)
    : "0.00";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Lädt</p>
        </div>
      </main>
    );
  }

  if (notLoggedIn || !profile) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="mt-3 text-[#6E6860]">Bitte logge dich ein, um dein Dashboard zu sehen.</p>
          <Link href="/auth" className="mt-4 inline-block underline">Zum Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
        <p className="mt-2 text-sm text-white/50">
          Provision: <span className="text-white/80">{profile.commission_percent ?? 25}%</span> deines Umsatzes
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-5">
        {/* Connect Banner */}
        {connectBanner === "success" && (
          <div className="mt-4 rounded-2xl bg-green-50 border border-green-200 px-5 py-3 text-sm text-green-800">
            ✓ Stripe Connect erfolgreich eingerichtet! Du kannst jetzt Auszahlungen empfangen.
          </div>
        )}
        {connectBanner === "retry" && (
          <div className="mt-4 rounded-2xl bg-yellow-50 border border-yellow-200 px-5 py-3 text-sm text-yellow-800">
            Stripe Connect Einrichtung nicht abgeschlossen. Bitte versuche es erneut.
          </div>
        )}

        {/* Tab Bar */}
        <div className="mt-6 flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === "auszahlung" && !connectStatus) loadConnectStatus();
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                activeTab === tab.key
                  ? "bg-[#0A0A0A] text-white shadow-sm"
                  : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A] hover:text-[#0A0A0A]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick links */}
        <div className="mt-4 flex gap-2">
          <Link href="/my-fragrances" className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors">
            Meine Düfte
          </Link>
          <Link href="/profile" className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors">
            Mein Profil
          </Link>
        </div>

        {/* ── ÜBERSICHT ── */}
        {activeTab === "uebersicht" && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Verkaufte Einheiten", value: stats.salesCount },
                { label: "Bestellungen", value: stats.uniqueOrders },
                { label: "Bruttoumsatz", value: `${(stats.grossRevenueCents / 100).toFixed(2)} €` },
                { label: "Provision gesamt", value: `${(stats.commissionCents / 100).toFixed(2)} €` },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white border border-[#E5E0D8] p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <p className="text-sm text-[#9E9890]">{s.label}</p>
                  <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Offene Provision", value: `${(stats.pendingCommissionCents / 100).toFixed(2)} €`, accent: "border-l-amber-400" },
                { label: "Auszahlbare Provision", value: `${(stats.payableCommissionCents / 100).toFixed(2)} €`, accent: "border-l-[#B09050]" },
                { label: "Bereits ausgezahlt", value: `${(stats.paidCommissionCents / 100).toFixed(2)} €`, accent: "border-l-emerald-500" },
              ].map((s) => (
                <div key={s.label} className={`rounded-2xl bg-white border border-[#E5E0D8] border-l-4 ${s.accent} p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}>
                  <p className="text-sm text-[#9E9890]">{s.label}</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-[#B09050]">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <div className="flex items-center gap-1"><p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Deine Provisionsrate</p><InfoTooltip text={HELP.creator.pendingPayout} compact /></div>
              <p className="mt-2 text-4xl font-bold text-[#B09050]">{profile.commission_percent ?? 25}%</p>
              <p className="mt-1 text-xs text-[#9E9890]">
                Pro Verkauf erhältst du {profile.commission_percent ?? 25}% des Nettopreises automatisch über Stripe Connect ausgezahlt.
                Bei Fragen zur Anpassung wende dich an das Team.
              </p>
            </div>
          </div>
        )}

        {/* ── PROVISIONEN ── */}
        {activeTab === "provisionen" && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Performance pro Duft</h2>
              {groupedByFragrance.length === 0 ? (
                <p className="mt-4 text-sm text-[#6E6860]">Noch keine Duft-Performance-Daten vorhanden.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {groupedByFragrance.map((fragrance) => (
                    <div key={fragrance.fragranceId} className="rounded-xl border border-[#E5E0D8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-[#0A0A0A]">{fragrance.fragranceName}</h3>
                          <p className="mt-0.5 text-xs text-[#9E9890]">
                            {fragrance.totalUnitsSold} Einheiten · {fragrance.totalOrders} Bestellungen · {fragrance.averageCommissionPercent}% Provision
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#0A0A0A]">{(fragrance.totalRevenueCents / 100).toFixed(2)} €</p>
                          <p className="text-xs text-[#9E9890]">{(fragrance.totalCommissionCents / 100).toFixed(2)} € Provision</p>
                        </div>
                      </div>
                      <Link href={`/fragrance/${fragrance.fragranceId}`} className="mt-2 block text-[10px] uppercase tracking-wider text-[#9E9890] hover:text-[#0A0A0A]">
                        Duft ansehen →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Alle Verkaufspositionen</h2>
              {items.length === 0 ? (
                <p className="mt-4 text-sm text-[#6E6860]">Noch keine Verkaufsdaten vorhanden.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#E5E0D8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#0A0A0A]">{item.fragranceName}</p>
                          <p className="mt-0.5 text-xs text-[#9E9890]">
                            {item.sizeMl} ml · ×{item.quantity} · {item.customerName}
                          </p>
                          <p className="text-xs text-[#9E9890]">
                            {item.orderCreatedAt ? new Date(item.orderCreatedAt).toLocaleDateString("de-DE") : "–"} · Status: {item.orderStatus}
                          </p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.payoutStatus === "paid" ? "bg-green-100 text-green-700" :
                            item.payoutStatus === "payable" ? "bg-blue-100 text-blue-700" :
                            "bg-[#F5F0EA] text-[#9E9890]"
                          }`}>
                            {getPayoutStatusLabel(item.payoutStatus)}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#0A0A0A]">{((item.priceCents * item.quantity) / 100).toFixed(2)} €</p>
                          <p className="text-xs text-[#9E9890]">{(item.creatorCommissionCents / 100).toFixed(2)} € ({item.commissionPercent}%)</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REFERRALS ── */}
        {activeTab === "referrals" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Dein Referral-Link</h2>
                <InfoTooltip text={HELP.creator.referralLink} />
              </div>
              <p className="mt-1 text-xs text-[#9E9890]">Teile diesen Link — geworbene Nutzer werden dir dauerhaft zugeordnet (Lifetime-Provision).</p>
              {profile.referral_code ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3">
                    <span className="flex-1 truncate font-mono text-sm text-[#0A0A0A]">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/auth?ref=${profile.referral_code}`
                        : `/auth?ref=${profile.referral_code}`}
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.referral_code}`)}
                      className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-xs hover:border-[#0A0A0A] transition-colors"
                    >
                      Kopieren
                    </button>
                  </div>
                  <p className="text-xs text-[#9E9890]">Code: <span className="font-mono font-semibold">{profile.referral_code}</span></p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#9E9890]">Kein Referral-Code vorhanden.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Geworbene Nutzer</h2>
              {referrals.length === 0 ? (
                <p className="mt-4 text-sm text-[#6E6860]">Noch keine Referrals vorhanden.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between rounded-xl border border-[#E5E0D8] px-4 py-3">
                      <p className="text-xs text-[#9E9890]">{new Date(ref.createdAt).toLocaleDateString("de-DE")}</p>
                      <span className="rounded-full bg-[#F5F0EA] px-3 py-1 text-xs text-[#6E6860]">
                        {ref.lifetimeCommissionPercent}% Lifetime
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── FAN-ABO ── */}
        {activeTab === "fanabo" && (
          <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-lg font-semibold text-[#0A0A0A]">Fan-Abo</h2>
            <p className="mt-1 text-xs text-[#9E9890]">Richte ein monatliches Abonnement für deine Fans ein.</p>

            {creatorPlan && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#F0EDE8] p-4">
                  <p className="text-xs text-[#9E9890]">Abonnenten</p>
                  <p className="mt-1 text-2xl font-light text-[#0A0A0A]">{creatorPlan.subscriber_count ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-[#F0EDE8] p-4">
                  <p className="text-xs text-[#9E9890]">Monatlicher Umsatz</p>
                  <p className="mt-1 text-2xl font-light text-[#0A0A0A]">
                    {(((creatorPlan.subscriber_count ?? 0) * creatorPlan.price_cents) / 100).toFixed(2)} €
                  </p>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {[
                { label: "Plan-Name", type: "text", value: planName, onChange: (v: string) => setPlanName(v) },
                { label: "Preis (€/Monat)", type: "number", value: planPrice, onChange: (v: string) => setPlanPrice(v) },
              ].map((field) => (
                <div key={field.label}>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">{field.label}</label>
                  <input
                    type={field.type}
                    step={field.type === "number" ? "0.01" : undefined}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  />
                </div>
              ))}

              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Beschreibung</label>
                <textarea
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  rows={3}
                  placeholder="Was erhalten deine Abonnenten?"
                  className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Vorteile (bis zu 3)</label>
                <div className="space-y-2">
                  {planBenefits.map((benefit, i) => (
                    <input
                      key={i}
                      type="text"
                      value={benefit}
                      onChange={(e) => setPlanBenefits((prev) => prev.map((b, idx) => idx === i ? e.target.value : b))}
                      placeholder={`Vorteil ${i + 1}`}
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={saveCreatorPlan}
                disabled={savingPlan}
                className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
              >
                {savingPlan ? "…" : creatorPlan ? "Aktualisieren" : "Aktivieren"}
              </button>
            </div>
          </div>
        )}

        {/* ── PRODUKTE ── */}
        {activeTab === "produkte" && (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">
                {editingProductId ? "Produkt bearbeiten" : "Neues Produkt"}
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="z.B. Flakon 10ml Leergut"
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Kategorie</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Preis (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.price}
                    onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="9.90"
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Lagerbestand</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stock}
                    onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Gewicht (g)</label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.weight_grams}
                    onChange={(e) => setProductForm((f) => ({ ...f, weight_grams: e.target.value }))}
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Bild-URL (optional)</label>
                  <input
                    type="url"
                    value={productForm.image_url}
                    onChange={(e) => setProductForm((f) => ({ ...f, image_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Beschreibung</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Kurze Produktbeschreibung…"
                    className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none resize-none"
                  />
                </div>
              </div>

              {productMsg && (
                <p className="mt-3 rounded-xl bg-[#F5F0EA] px-3 py-2 text-xs text-[#6E6860]">{productMsg}</p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveProduct}
                  disabled={savingProduct || !productForm.name || !productForm.price}
                  className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                >
                  {savingProduct ? "…" : editingProductId ? "Aktualisieren" : "Erstellen"}
                </button>
                {editingProductId && (
                  <button
                    onClick={() => {
                      setEditingProductId(null);
                      setProductForm({ name: "", description: "", price: "", stock: "0", category: "other", image_url: "", weight_grams: "200" });
                      setProductMsg("");
                    }}
                    className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>

            {/* Product list */}
            {products.length > 0 && (
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Meine Produkte</h2>
                <div className="mt-4 space-y-2">
                  {products.map((product) => (
                    <div key={product.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E0D8] p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A0A0A] truncate">{product.name}</p>
                        <p className="text-xs text-[#9E9890]">
                          {PRODUCT_CATEGORIES.find((c) => c.value === product.category)?.label} ·{" "}
                          {(product.price_cents / 100).toFixed(2)} € · {product.stock} Stück
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleProductPublish(product)}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider transition-all ${
                            product.is_published
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-[#F5F0EA] text-[#9E9890] hover:bg-[#E5E0D8]"
                          }`}
                        >
                          {product.is_published ? "Veröffentlicht" : "Entwurf"}
                        </button>
                        <button
                          onClick={() => startEditProduct(product)}
                          className="rounded-full border border-[#E5E0D8] px-3 py-1.5 text-[10px] hover:border-[#0A0A0A] transition-colors"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {products.length === 0 && (
              <p className="text-sm text-[#9E9890]">Noch keine Produkte erstellt.</p>
            )}
          </div>
        )}

        {/* ── AUSZAHLUNG ── */}
        {activeTab === "auszahlung" && (
          <div className="mt-6 space-y-5">
            {/* Connect Status */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Stripe Connect</h2>
              <p className="mt-1 text-xs text-[#9E9890]">
                Verbinde dein Bankkonto um Auszahlungen zu empfangen. Deine Provision beträgt {profile.commission_percent ?? 25}%.
              </p>

              {connectLoading && !connectStatus ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#9E9890]">
                  <div className="h-4 w-4 rounded-full border-2 border-[#9E9890] border-t-transparent animate-spin" />
                  Verbindungsstatus wird geladen…
                </div>
              ) : !connectStatus?.connected ? (
                <div className="mt-4 rounded-2xl bg-[#0A0A0A] p-5">
                  <p className="text-sm font-semibold text-white">Stripe Connect einrichten</p>
                  <p className="mt-1.5 text-xs text-white/60">
                    Richte dein Stripe Express Konto ein, um automatische Auszahlungen zu erhalten. Stripe übernimmt die Verifizierung.
                  </p>
                  <button
                    onClick={startConnectOnboarding}
                    disabled={connectLoading}
                    className="mt-4 rounded-full bg-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-[#0A0A0A] active:scale-95 transition-all disabled:opacity-60"
                  >
                    {connectLoading ? "Wird geladen…" : "Jetzt einrichten →"}
                  </button>
                  <p className="mt-3 text-[10px] text-white/40">
                    Du wirst zu Stripe weitergeleitet. Deine Bankdaten werden sicher von Stripe gespeichert.
                  </p>
                </div>
              ) : !connectStatus.payoutsEnabled ? (
                <div className="mt-4 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                  <p className="text-sm font-semibold text-yellow-800">Einrichtung unvollständig</p>
                  <p className="mt-1 text-xs text-yellow-700">
                    Dein Stripe Konto ist erstellt, aber Auszahlungen sind noch nicht aktiviert. Bitte vervollständige die Einrichtung.
                  </p>
                  <button
                    onClick={startConnectOnboarding}
                    disabled={connectLoading}
                    className="mt-3 rounded-full bg-yellow-800 px-4 py-2 text-xs font-medium text-white active:scale-95 transition-all disabled:opacity-60"
                  >
                    Einrichtung fortsetzen
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">✓ Verbunden & aktiv</span>
                  </div>
                  <button
                    onClick={openStripeDashboard}
                    className="rounded-full border border-[#E5E0D8] px-4 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A] transition-colors"
                  >
                    Stripe Dashboard öffnen ↗
                  </button>
                </div>
              )}
            </div>

            {/* Payout form */}
            {connectStatus?.payoutsEnabled && (
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Auszahlung beantragen</h2>
                <p className="mt-1 text-xs text-[#9E9890]">Mindestbetrag: 10,00 €. Sofortauszahlung: +1,5% Gebühr (auf dich umgelegt).</p>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Betrag (€)</label>
                    <input
                      type="number"
                      min="10"
                      step="0.01"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="50.00"
                      className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:border-[#0A0A0A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Art</label>
                    <div className="flex gap-2">
                      {(["standard", "instant"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPayoutType(t)}
                          className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                            payoutType === t
                              ? "bg-[#0A0A0A] text-white"
                              : "border border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"
                          }`}
                        >
                          {t === "standard" ? "Standard (1–3 Tage, kostenlos)" : "Sofort (1,5% Gebühr)"}
                        </button>
                      ))}
                    </div>
                    {payoutType === "instant" && payoutAmount && (
                      <p className="mt-2 rounded-xl bg-[#F5F0EA] px-3 py-2 text-xs text-[#6E6860]">
                        Gebühr: {instantFeeAmt} € — Du erhältst: {instantNetAmt} €
                      </p>
                    )}
                  </div>

                  {payoutMsg && (
                    <p className={`rounded-xl px-3 py-2 text-xs ${payoutMsg.startsWith("Fehler") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                      {payoutMsg}
                    </p>
                  )}

                  <button
                    onClick={requestPayout}
                    disabled={payoutLoading || !payoutAmount || parseFloat(payoutAmount) < 10 || (payoutType === "instant" && parseFloat(payoutAmount) * 0.985 < 10)}
                    className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                  >
                    {payoutLoading ? "Wird bearbeitet…" : "Auszahlung beantragen"}
                  </button>
                </div>
              </div>
            )}

            {/* Payout history */}
            {payoutRequests.length > 0 && (
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Auszahlungshistorie</h2>
                <div className="mt-4 space-y-2">
                  {payoutRequests.map((req) => (
                    <div key={req.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E5E0D8] px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#9E9890]">{new Date(req.requested_at).toLocaleDateString("de-DE")}</p>
                        <p className="text-sm font-semibold text-[#0A0A0A]">{(req.net_cents / 100).toFixed(2)} € netto</p>
                        {req.fee_cents > 0 && (
                          <p className="text-xs text-[#9E9890]">Gebühr: {(req.fee_cents / 100).toFixed(2)} €</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[#F5F0EA] px-2 py-0.5 text-[10px] text-[#9E9890]">
                          {req.type === "instant" ? "Sofort" : "Standard"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          req.status === "completed" ? "bg-green-100 text-green-700" :
                          req.status === "processing" ? "bg-blue-100 text-blue-700" :
                          req.status === "failed" ? "bg-red-100 text-red-700" :
                          "bg-[#F5F0EA] text-[#9E9890]"
                        }`}>
                          {req.status === "completed" ? "Ausgezahlt" : req.status === "processing" ? "In Bearbeitung" : req.status === "failed" ? "Fehlgeschlagen" : "Ausstehend"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WACHSTUM ── */}
        {activeTab === "wachstum" && (
          <div className="mt-6 space-y-5">

            {/* Umsatz-Trend */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Umsatz-Trend</h2>
              <p className="mt-0.5 text-xs text-[#9E9890]">Letzte 6 Monate</p>
              <div className="mt-5 rounded-xl border border-[#F0EDE8] bg-[#FAFAF8] p-4 flex items-end gap-1.5 h-36">
                {(() => {
                  const maxRev = Math.max(...monthlyRevenue.map((m) => m.revCents), 1);
                  return monthlyRevenue.map((m, i) => {
                    const barPct = Math.max((m.revCents / maxRev) * 100, m.revCents > 0 ? 4 : 2);
                    const commPct = m.revCents > 0 ? (m.commCents / m.revCents) * 100 : 0;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div className="relative w-full" style={{ height: `${barPct}%` }}>
                          <div className="absolute inset-0 rounded-t-md bg-[#C9A96E]/15" />
                          <div
                            className="absolute bottom-0 w-full rounded-t-md bg-[#C9A96E]"
                            style={{ height: `${commPct}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-[#9E9890] whitespace-nowrap">{m.label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#9E9890]">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-[#C9A96E]/20 border border-[#C9A96E]/30" />
                  Umsatz
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-sm bg-[#C9A96E]" />
                  Deine Provision
                </span>
                <span className="ml-auto font-medium text-[#0A0A0A]">
                  Gesamt: {(stats.grossRevenueCents / 100).toFixed(2)} € · Provision: {(stats.commissionCents / 100).toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Top Performer */}
            {groupedByFragrance.length > 0 && (
              <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                <h2 className="text-lg font-semibold text-[#0A0A0A]">Top Performer</h2>
                <p className="mt-0.5 text-xs text-[#9E9890]">Deine umsatzstärksten Düfte</p>
                <div className="mt-4 space-y-2">
                  {groupedByFragrance.slice(0, 5).map((f, i) => {
                    const maxComm = groupedByFragrance[0].totalCommissionCents;
                    const barWidth = maxComm > 0 ? (f.totalCommissionCents / maxComm) * 100 : 0;
                    return (
                      <div key={f.fragranceId} className="flex items-center gap-3">
                        <span className="w-5 text-xs font-mono text-[#9E9890] text-right shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[#0A0A0A] truncate">{f.fragranceName}</p>
                            <p className="shrink-0 text-xs font-semibold text-[#0A0A0A]">
                              {(f.totalCommissionCents / 100).toFixed(2)} €
                            </p>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-[#F5F0EA]">
                            <div
                              className="h-full rounded-full bg-[#C9A96E]"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <p className="mt-0.5 text-[10px] text-[#9E9890]">
                            {f.totalUnitsSold} Einheiten · {f.totalOrders} Bestellungen
                          </p>
                        </div>
                        <Link href={`/fragrance/${f.fragranceId}`} className="shrink-0 text-[10px] text-[#9E9890] hover:text-[#0A0A0A] transition-colors">
                          →
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Wachstums-Tipps */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Persönliche Wachstums-Tipps</h2>
              <p className="mt-0.5 text-xs text-[#9E9890]">Basierend auf deinen aktuellen Daten</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {growthTips.map((tip, i) => (
                  <div key={i} className="rounded-xl border border-[#E5E0D8] p-4">
                    <p className="text-sm font-semibold text-[#0A0A0A]">{tip.title}</p>
                    <p className="mt-1 text-xs text-[#6E6860] leading-relaxed">{tip.body}</p>
                    {tip.action && tip.href && (
                      <button
                        onClick={() => tip.href === "#referrals" ? setActiveTab("referrals") : undefined}
                        className="mt-2 text-[10px] uppercase tracking-wider text-[#C9A96E] hover:text-[#0A0A0A] transition-colors"
                      >
                        {tip.href !== "#referrals" ? (
                          <Link href={tip.href}>{tip.action} →</Link>
                        ) : (
                          <span>{tip.action} →</span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content-Ideen */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Content-Ideen</h2>
              <p className="mt-0.5 text-xs text-[#9E9890]">Inspirationen für deine nächsten Posts</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {CONTENT_IDEAS.map((idea, i) => (
                  <div key={i} className="rounded-xl bg-[#FAFAF8] border border-[#E5E0D8] p-3">
                    <p className="text-xl">{idea.emoji}</p>
                    <p className="mt-1.5 text-xs font-semibold text-[#0A0A0A]">{idea.title}</p>
                    <p className="mt-1 text-[11px] text-[#6E6860] leading-relaxed">{idea.body}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Teilen & Referral Tools */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-lg font-semibold text-[#0A0A0A]">Teilen & Empfehlen</h2>
              <p className="mt-0.5 text-xs text-[#9E9890]">Dein persönlicher Empfehlungslink · {referrals.length} Referral{referrals.length !== 1 ? "s" : ""}</p>
              {profile.referral_code ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate rounded-lg bg-[#FAFAF8] border border-[#E5E0D8] px-3 py-2 text-xs font-mono text-[#0A0A0A]">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/auth?ref=${profile.referral_code}`
                        : `/auth?ref=${profile.referral_code}`}
                    </code>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${window.location.origin}/auth?ref=${profile.referral_code}`
                        )
                      }
                      className="shrink-0 rounded-lg border border-[#E5E0D8] px-3 py-2 text-xs hover:bg-[#F5F0EA] transition-colors"
                    >
                      Kopieren
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#9E9890]">
                    Lifetime-Provision: {referrals[0]?.lifetimeCommissionPercent ?? 3}% auf alle Käufe deiner Referrals
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-[#9E9890]">Kein Referral-Code vorhanden.</p>
              )}

              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-[#0A0A0A]">Vorlagen zum Kopieren</p>
                {[
                  {
                    title: "Instagram Bio",
                    text: `Meine Duft-Kollektion ✨ → ${typeof window !== "undefined" && profile.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "[Dein Link]"}`,
                  },
                  {
                    title: "WhatsApp / Story",
                    text: `Ich habe meinen eigenen Duft kreiert ✨\n\nEntdecke meine Parfum-Kollektion:\n${typeof window !== "undefined" && profile.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "[Dein Link]"}\n\nJeder Kauf über meinen Link unterstützt mich direkt 🙏`,
                  },
                  {
                    title: "TikTok / Reel Caption",
                    text: `POV: Ich habe meinen eigenen Parfum entworfen 🌸✨\nLink in der Bio → ${typeof window !== "undefined" && profile.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "[Dein Link]"}`,
                  },
                  {
                    title: "Neue Kollektion ankündigen",
                    text: `Mein neues Parfum ist live 🎉\n\nJetzt entdecken auf Fragrance OS:\n${typeof window !== "undefined" && profile.referral_code ? `${window.location.origin}/auth?ref=${profile.referral_code}` : "[Dein Link]"}`,
                  },
                ].map((tpl, i) => (
                  <div key={i} className="rounded-xl border border-[#E5E0D8] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-medium text-[#0A0A0A]">{tpl.title}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(tpl.text)}
                        className="shrink-0 rounded-md bg-[#F5F0EA] px-2 py-0.5 text-[10px] hover:bg-[#E5E0D8] transition-colors"
                      >
                        Kopieren
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-[#9E9890] whitespace-pre-line leading-relaxed">{tpl.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB: AFFILIATE */}
        {activeTab === "affiliate" && (
          <div className="mt-6 space-y-5">

            {/* KPIs */}
            {(() => {
              const totalEarned = affiliatePayouts.reduce((s, p) => s + p.amountCents, 0);
              const payable = affiliatePayouts.filter((p) => p.status === "payable").reduce((s, p) => s + p.amountCents, 0);
              const paid = affiliatePayouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountCents, 0);
              return (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white border border-[#E5E0D8] border-l-4 border-l-[#B09050] p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Gesamt verdient</p>
                    <p className="mt-2 text-2xl font-bold text-[#B09050]">{(totalEarned / 100).toFixed(2)} €</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-500 p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-700">Auszahlbar</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{(payable / 100).toFixed(2)} €</p>
                  </div>
                  <div className="rounded-2xl bg-white border border-[#E5E0D8] border-l-4 border-l-[#9E9890] p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Ausgezahlt</p>
                    <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{(paid / 100).toFixed(2)} €</p>
                  </div>
                </div>
              );
            })()}

            {/* Wie funktioniert es */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] mb-3">Wie funktioniert Affiliate?</h2>
              <div className="grid gap-3 sm:grid-cols-3 text-xs text-[#6E6860]">
                <div className="rounded-xl bg-[#FAFAF8] border border-[#E5E0D8] p-3">
                  <p className="font-semibold text-[#0A0A0A] mb-1">1. Profil teilen</p>
                  <p>Teile dein Creator-Profil ({typeof window !== "undefined" ? `${window.location.origin}/creator/${profile?.username ?? ""}` : "/creator/..."}) auf Social Media.</p>
                </div>
                <div className="rounded-xl bg-[#FAFAF8] border border-[#E5E0D8] p-3">
                  <p className="font-semibold text-[#0A0A0A] mb-1">2. Jemand kauft</p>
                  <p>Wenn ein Besucher innerhalb von 30 Tagen nach dem Profilbesuch einen Duft kauft, wird der Kauf dir zugerechnet.</p>
                </div>
                <div className="rounded-xl bg-[#FAFAF8] border border-[#E5E0D8] p-3">
                  <p className="font-semibold text-[#0A0A0A] mb-1">3. Provision erhalten</p>
                  <p>Du erhältst {profile?.affiliate_commission_percent ?? 10} % des Kaufwerts als Provision — auch für Düfte anderer Creators.</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 rounded-xl bg-[#F5F0EA] px-4 py-2.5 text-xs text-[#6E6860] font-mono truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}/creator/${profile?.username ?? ""}` : ""}
                </div>
                <button
                  onClick={() => {
                    if (typeof window !== "undefined" && profile?.username) {
                      navigator.clipboard.writeText(`${window.location.origin}/creator/${profile.username}`);
                    }
                  }}
                  className="shrink-0 rounded-full bg-[#0A0A0A] text-white px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
                >
                  Kopieren
                </button>
              </div>
            </div>

            {/* Aktueller Satz */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#9E9890]">Dein Affiliate-Satz</p>
                  <p className="mt-1 text-3xl font-bold text-[#0A0A0A]">{profile?.affiliate_commission_percent ?? 10} %</p>
                  <p className="text-xs text-[#9E9890] mt-1">Individuell anpassbar per Vertrag · Admin kann deinen Satz ändern</p>
                </div>
                <div className="text-right text-xs text-[#9E9890]">
                  <p>Standard: 10 %</p>
                  <p className="mt-1">Creators mit Vertrag: bis 25 %</p>
                </div>
              </div>
            </div>

            {/* Transaktionen */}
            <div className="rounded-2xl bg-white border border-[#E5E0D8] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E0D8]">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A]">Transaktionen</h2>
              </div>
              {affiliatePayouts.length === 0 ? (
                <p className="px-5 py-8 text-sm text-[#9E9890]">Noch keine Affiliate-Einnahmen. Teile dein Profil um loszulegen.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E0D8] bg-[#FAFAF8]">
                        <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-[#9E9890]">Datum</th>
                        <th className="px-4 py-3 text-right font-medium uppercase tracking-wider text-[#9E9890]">Betrag</th>
                        <th className="px-4 py-3 text-right font-medium uppercase tracking-wider text-[#9E9890]">Satz</th>
                        <th className="px-4 py-3 text-center font-medium uppercase tracking-wider text-[#9E9890]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliatePayouts.map((p, i) => (
                        <tr key={p.id} className={`border-b border-[#E5E0D8] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}>
                          <td className="px-4 py-3 text-[#6E6860]">{new Date(p.createdAt).toLocaleDateString("de-DE")}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#0A0A0A] tabular-nums">
                            {(p.amountCents / 100).toFixed(2)} €
                          </td>
                          <td className="px-4 py-3 text-right text-[#6E6860]">{p.commissionPercent} %</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                              p.status === "paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : p.status === "payable" ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-[#F0EDE8] border-[#E5E0D8] text-[#9E9890]"
                            }`}>
                              {p.status === "paid" ? "Ausgezahlt" : p.status === "payable" ? "Auszahlbar" : "Ausstehend"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
