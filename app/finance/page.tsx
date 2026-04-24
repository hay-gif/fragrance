"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import InfoTooltip from "@/components/InfoTooltip";
import { HELP } from "@/lib/helpTexts";

type PayoutStatus = "pending" | "payable" | "paid" | "reversed";

type FinanceOrderItem = {
  id: string;
  orderId: string;
  fragranceId: string;
  fragranceName: string;
  creatorId: string | null;
  creatorName: string;
  customerName: string;
  orderStatus: string;
  orderCreatedAt: string;
  lineRevenueCents: number;
  creatorCommissionCents: number;
  commissionPercent: number;
  payoutStatus: PayoutStatus;
  paidAt: string | null;
  payoutBatchId: string | null;
  materialCostCents: number;
  productionCostCents: number;
};

type FinanceOrderCost = {
  orderId: string;
  shippingCostCents: number;
  packagingCostCents: number;
  otherOrderCostCents: number;
};

type CreatorPayoutSummary = {
  creatorId: string;
  creatorName: string;
  pendingCents: number;
  payableCents: number;
  paidCents: number;
  reversedCents: number;
  totalCents: number;
};

type Expense = {
  id: string;
  createdAt: string;
  title: string;
  category: string;
  amountCents: number;
  notes: string;
};

type CreatorPayout = {
  id: string;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  totalCents: number;
  note: string;
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
  payout_batch_id: string | null;
  material_cost_cents: number;
  production_cost_cents: number;
};

type DbOrderRow = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  shipping_cost_cents: number;
  packaging_cost_cents: number;
  other_order_cost_cents: number;
};

type DbProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
};

type DbExpenseRow = {
  id: string;
  created_at: string;
  title: string;
  category: string;
  amount_cents: number;
  notes: string | null;
};

type DbCreatorPayoutRow = {
  id: string;
  created_at: string;
  creator_id: string;
  total_cents: number;
  note: string | null;
};

function getPayoutStatusLabel(status: PayoutStatus): string {
  if (status === "pending") return "offen";
  if (status === "payable") return "auszahlbar";
  if (status === "paid") return "ausgezahlt";
  return "reversed";
}

function eurosToCents(value: string): number | null {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function centsToEuroString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function FinancePage() {
  const [items, setItems] = useState<FinanceOrderItem[]>([]);
  const [orderCosts, setOrderCosts] = useState<
    Record<string, FinanceOrderCost>
  >({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payouts, setPayouts] = useState<CreatorPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [updatingCostOrderId, setUpdatingCostOrderId] = useState<string | null>(
    null,
  );
  const [payingCreatorId, setPayingCreatorId] = useState<string | null>(null);

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("general");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const [editingItemCosts, setEditingItemCosts] = useState<
    Record<string, { material: string; production: string }>
  >({});

  const [editingOrderCosts, setEditingOrderCosts] = useState<
    Record<string, { shipping: string; packaging: string; other: string }>
  >({});

  useEffect(() => {
    async function loadFinanceData() {
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .order("id", { ascending: false });

      if (itemsError) {
        console.error("Fehler beim Laden der Order-Items:", itemsError);
        setLoading(false);
        return;
      }

      const orderIds = Array.from(
        new Set(
          (orderItems ?? []).map((item: DbOrderItemRow) => item.order_id),
        ),
      );

      const creatorIds = Array.from(
        new Set(
          (orderItems ?? [])
            .map((item: DbOrderItemRow) => item.creator_id)
            .filter(Boolean),
        ),
      ) as string[];

      let orders: DbOrderRow[] = [];
      let profiles: DbProfileRow[] = [];

      if (orderIds.length > 0) {
        const { data: orderRows, error: ordersError } = await supabase
          .from("orders")
          .select(
            "id, created_at, status, customer_name, shipping_cost_cents, packaging_cost_cents, other_order_cost_cents",
          )
          .in("id", orderIds);

        if (ordersError) {
          console.error("Fehler beim Laden der Orders:", ordersError);
          setLoading(false);
          return;
        }

        orders = orderRows ?? [];
      }

      if (creatorIds.length > 0) {
        const { data: profileRows, error: profilesError } = await supabase
          .from("profiles")
          .select("id, display_name, username, email")
          .in("id", creatorIds);

        if (profilesError) {
          console.error(
            "Fehler beim Laden der Creator-Profile:",
            profilesError,
          );
          setLoading(false);
          return;
        }

        profiles = profileRows ?? [];
      }

      const { data: expenseRows, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (expensesError) {
        console.error("Fehler beim Laden der Ausgaben:", expensesError);
        setLoading(false);
        return;
      }

      const { data: payoutRows, error: payoutsError } = await supabase
        .from("creator_payouts")
        .select("*")
        .order("created_at", { ascending: false });

      if (payoutsError) {
        console.error(
          "Fehler beim Laden der Auszahlungshistorie:",
          payoutsError,
        );
        setLoading(false);
        return;
      }

      const orderMap = new Map(orders.map((order) => [order.id, order]));
      const profileMap = new Map(
        profiles.map((profile) => [
          profile.id,
          profile.display_name ||
            profile.username ||
            profile.email ||
            "Creator",
        ]),
      );

      const mappedItems: FinanceOrderItem[] = (orderItems ?? []).map(
        (item: DbOrderItemRow) => {
          const order = orderMap.get(item.order_id);

          return {
            id: item.id,
            orderId: item.order_id,
            fragranceId: item.fragrance_id,
            fragranceName: item.name,
            creatorId: item.creator_id,
            creatorName: item.creator_id
              ? profileMap.get(item.creator_id) || "Creator"
              : "Kein Creator",
            customerName: order?.customer_name ?? "Unbekannt",
            orderStatus: order?.status ?? "unknown",
            orderCreatedAt: order?.created_at ?? "",
            lineRevenueCents: item.price_cents * item.quantity,
            creatorCommissionCents: item.creator_commission_cents,
            commissionPercent: item.commission_percent,
            payoutStatus: item.payout_status,
            paidAt: item.paid_at,
            payoutBatchId: item.payout_batch_id,
            materialCostCents: item.material_cost_cents ?? 0,
            productionCostCents: item.production_cost_cents ?? 0,
          };
        },
      );

      const mappedOrderCosts: Record<string, FinanceOrderCost> = {};
      for (const order of orders) {
        mappedOrderCosts[order.id] = {
          orderId: order.id,
          shippingCostCents: order.shipping_cost_cents ?? 0,
          packagingCostCents: order.packaging_cost_cents ?? 0,
          otherOrderCostCents: order.other_order_cost_cents ?? 0,
        };
      }

      const mappedExpenses: Expense[] = (expenseRows ?? []).map(
        (row: DbExpenseRow) => ({
          id: row.id,
          createdAt: row.created_at,
          title: row.title,
          category: row.category,
          amountCents: row.amount_cents,
          notes: row.notes ?? "",
        }),
      );

      const mappedPayouts: CreatorPayout[] = (payoutRows ?? []).map(
        (row: DbCreatorPayoutRow) => ({
          id: row.id,
          createdAt: row.created_at,
          creatorId: row.creator_id,
          creatorName: profileMap.get(row.creator_id) || "Creator",
          totalCents: row.total_cents,
          note: row.note ?? "",
        }),
      );

      const initialItemCosts: Record<
        string,
        { material: string; production: string }
      > = {};
      for (const item of mappedItems) {
        initialItemCosts[item.id] = {
          material: centsToEuroString(item.materialCostCents),
          production: centsToEuroString(item.productionCostCents),
        };
      }

      const initialOrderCosts: Record<
        string,
        { shipping: string; packaging: string; other: string }
      > = {};
      for (const order of orders) {
        initialOrderCosts[order.id] = {
          shipping: centsToEuroString(order.shipping_cost_cents ?? 0),
          packaging: centsToEuroString(order.packaging_cost_cents ?? 0),
          other: centsToEuroString(order.other_order_cost_cents ?? 0),
        };
      }

      setItems(mappedItems);
      setOrderCosts(mappedOrderCosts);
      setExpenses(mappedExpenses);
      setPayouts(mappedPayouts);
      setEditingItemCosts(initialItemCosts);
      setEditingOrderCosts(initialOrderCosts);
      setLoading(false);
    }

    loadFinanceData();
  }, []);

  async function updatePayoutStatus(itemId: string, nextStatus: PayoutStatus) {
    setUpdatingItemId(itemId);

    const payload: {
      payout_status: PayoutStatus;
      paid_at?: string | null;
      payout_batch_id?: string | null;
    } = {
      payout_status: nextStatus,
    };

    if (nextStatus === "paid") {
      payload.paid_at = new Date().toISOString();
    } else {
      payload.paid_at = null;
      payload.payout_batch_id = null;
    }

    const { error } = await supabase
      .from("order_items")
      .update(payload)
      .eq("id", itemId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Payout-Status:", error);
      alert("Payout-Status konnte nicht aktualisiert werden.");
      setUpdatingItemId(null);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              payoutStatus: nextStatus,
              paidAt: nextStatus === "paid" ? (payload.paid_at ?? null) : null,
              payoutBatchId: nextStatus === "paid" ? item.payoutBatchId : null,
            }
          : item,
      ),
    );

    setUpdatingItemId(null);
  }

  async function saveItemCosts(itemId: string) {
    const current = editingItemCosts[itemId];
    if (!current) return;

    const materialCostCents = eurosToCents(current.material);
    const productionCostCents = eurosToCents(current.production);

    if (materialCostCents === null || productionCostCents === null) {
      alert("Bitte gib gültige Kosten ein.");
      return;
    }

    const { error } = await supabase
      .from("order_items")
      .update({
        material_cost_cents: materialCostCents,
        production_cost_cents: productionCostCents,
      })
      .eq("id", itemId);

    if (error) {
      console.error("Fehler beim Speichern der Item-Kosten:", error);
      alert("Item-Kosten konnten nicht gespeichert werden.");
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              materialCostCents,
              productionCostCents,
            }
          : item,
      ),
    );
  }

  async function saveOrderCosts(orderId: string) {
    const current = editingOrderCosts[orderId];
    if (!current) return;

    const shippingCostCents = eurosToCents(current.shipping);
    const packagingCostCents = eurosToCents(current.packaging);
    const otherOrderCostCents = eurosToCents(current.other);

    if (
      shippingCostCents === null ||
      packagingCostCents === null ||
      otherOrderCostCents === null
    ) {
      alert("Bitte gib gültige Order-Kosten ein.");
      return;
    }

    setUpdatingCostOrderId(orderId);

    const { error } = await supabase
      .from("orders")
      .update({
        shipping_cost_cents: shippingCostCents,
        packaging_cost_cents: packagingCostCents,
        other_order_cost_cents: otherOrderCostCents,
      })
      .eq("id", orderId);

    if (error) {
      console.error("Fehler beim Speichern der Order-Kosten:", error);
      alert("Order-Kosten konnten nicht gespeichert werden.");
      setUpdatingCostOrderId(null);
      return;
    }

    setOrderCosts((prev) => ({
      ...prev,
      [orderId]: {
        orderId,
        shippingCostCents,
        packagingCostCents,
        otherOrderCostCents,
      },
    }));

    setUpdatingCostOrderId(null);
  }

  async function addExpense() {
    const parsedAmount = Number(expenseAmount);

    if (!expenseTitle.trim()) {
      alert("Bitte gib einen Titel für die Ausgabe ein.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Bitte gib einen gültigen Betrag ein.");
      return;
    }

    setSavingExpense(true);

    const newExpenseId = crypto.randomUUID();
    const amountCents = Math.round(parsedAmount * 100);

    const { error } = await supabase.from("expenses").insert({
      id: newExpenseId,
      title: expenseTitle.trim(),
      category: expenseCategory.trim() || "general",
      amount_cents: amountCents,
      notes: expenseNotes.trim(),
    });

    if (error) {
      console.error("Fehler beim Speichern der Ausgabe:", error);
      alert("Ausgabe konnte nicht gespeichert werden.");
      setSavingExpense(false);
      return;
    }

    setExpenses((prev) => [
      {
        id: newExpenseId,
        createdAt: new Date().toISOString(),
        title: expenseTitle.trim(),
        category: expenseCategory.trim() || "general",
        amountCents,
        notes: expenseNotes.trim(),
      },
      ...prev,
    ]);

    setExpenseTitle("");
    setExpenseCategory("general");
    setExpenseAmount("");
    setExpenseNotes("");
    setSavingExpense(false);
  }

  async function createCreatorPayout(creatorId: string, creatorName: string) {
    setPayingCreatorId(creatorId);

    const payableItems = items.filter(
      (item) => item.creatorId === creatorId && item.payoutStatus === "payable",
    );

    if (payableItems.length === 0) {
      alert(
        "Für diesen Creator gibt es aktuell keine auszahlbaren Positionen.",
      );
      setPayingCreatorId(null);
      return;
    }

    const totalCents = payableItems.reduce(
      (sum, item) => sum + item.creatorCommissionCents,
      0,
    );

    const payoutId = crypto.randomUUID();
    const paidAt = new Date().toISOString();

    const { error: payoutError } = await supabase
      .from("creator_payouts")
      .insert({
        id: payoutId,
        creator_id: creatorId,
        total_cents: totalCents,
        note: `Auszahlung an ${creatorName}`,
      });

    if (payoutError) {
      console.error(
        "Fehler beim Erstellen des Auszahlungsvorgangs:",
        payoutError,
      );
      alert("Auszahlungsvorgang konnte nicht erstellt werden.");
      setPayingCreatorId(null);
      return;
    }

    const payableItemIds = payableItems.map((item) => item.id);

    const { error: itemsError } = await supabase
      .from("order_items")
      .update({
        payout_status: "paid",
        paid_at: paidAt,
        payout_batch_id: payoutId,
      })
      .in("id", payableItemIds);

    if (itemsError) {
      console.error(
        "Fehler beim Markieren der Payout-Items als bezahlt:",
        itemsError,
      );
      alert(
        "Auszahlungsvorgang wurde angelegt, aber Positionen konnten nicht aktualisiert werden.",
      );
      setPayingCreatorId(null);
      return;
    }

    setPayouts((prev) => [
      {
        id: payoutId,
        createdAt: paidAt,
        creatorId,
        creatorName,
        totalCents,
        note: `Auszahlung an ${creatorName}`,
      },
      ...prev,
    ]);

    setItems((prev) =>
      prev.map((item) =>
        payableItemIds.includes(item.id)
          ? {
              ...item,
              payoutStatus: "paid",
              paidAt,
              payoutBatchId: payoutId,
            }
          : item,
      ),
    );

    setPayingCreatorId(null);
  }

  const stats = useMemo(() => {
    const grossRevenueCents = items.reduce(
      (sum, item) => sum + item.lineRevenueCents,
      0,
    );

    const creatorCommissionCents = items.reduce(
      (sum, item) => sum + item.creatorCommissionCents,
      0,
    );

    const totalMaterialCostCents = items.reduce(
      (sum, item) => sum + item.materialCostCents,
      0,
    );

    const totalProductionCostCents = items.reduce(
      (sum, item) => sum + item.productionCostCents,
      0,
    );

    const totalOrderLevelCostsCents = Object.values(orderCosts).reduce(
      (sum, order) =>
        sum +
        order.shippingCostCents +
        order.packagingCostCents +
        order.otherOrderCostCents,
      0,
    );

    const pendingCommissionCents = items
      .filter((item) => item.payoutStatus === "pending")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);

    const payableCommissionCents = items
      .filter((item) => item.payoutStatus === "payable")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);

    const paidCommissionCents = items
      .filter((item) => item.payoutStatus === "paid")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);

    const reversedCommissionCents = items
      .filter((item) => item.payoutStatus === "reversed")
      .reduce((sum, item) => sum + item.creatorCommissionCents, 0);

    const totalExpensesCents = expenses.reduce(
      (sum, expense) => sum + expense.amountCents,
      0,
    );

    const platformGrossProfitBeforeOverheadCents =
      grossRevenueCents -
      creatorCommissionCents -
      totalMaterialCostCents -
      totalProductionCostCents -
      totalOrderLevelCostsCents;

    const platformNetAfterExpensesCents =
      platformGrossProfitBeforeOverheadCents - totalExpensesCents;

    return {
      grossRevenueCents,
      creatorCommissionCents,
      totalMaterialCostCents,
      totalProductionCostCents,
      totalOrderLevelCostsCents,
      pendingCommissionCents,
      payableCommissionCents,
      paidCommissionCents,
      reversedCommissionCents,
      totalExpensesCents,
      platformGrossProfitBeforeOverheadCents,
      platformNetAfterExpensesCents,
    };
  }, [items, expenses, orderCosts]);

  const creatorPayouts = useMemo<CreatorPayoutSummary[]>(() => {
    const map = new Map<string, CreatorPayoutSummary>();

    for (const item of items) {
      if (!item.creatorId) continue;

      const existing = map.get(item.creatorId);

      if (!existing) {
        map.set(item.creatorId, {
          creatorId: item.creatorId,
          creatorName: item.creatorName,
          pendingCents:
            item.payoutStatus === "pending" ? item.creatorCommissionCents : 0,
          payableCents:
            item.payoutStatus === "payable" ? item.creatorCommissionCents : 0,
          paidCents:
            item.payoutStatus === "paid" ? item.creatorCommissionCents : 0,
          reversedCents:
            item.payoutStatus === "reversed" ? item.creatorCommissionCents : 0,
          totalCents: item.creatorCommissionCents,
        });
        continue;
      }

      existing.totalCents += item.creatorCommissionCents;
      if (item.payoutStatus === "pending")
        existing.pendingCents += item.creatorCommissionCents;
      if (item.payoutStatus === "payable")
        existing.payableCents += item.creatorCommissionCents;
      if (item.payoutStatus === "paid")
        existing.paidCents += item.creatorCommissionCents;
      if (item.payoutStatus === "reversed")
        existing.reversedCents += item.creatorCommissionCents;
    }

    return Array.from(map.values()).sort(
      (a, b) => b.payableCents - a.payableCents,
    );
  }, [items]);

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

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Finanzen</h1>
            <p className="mt-1 text-xs text-white/40">Provisionen · Kosten · Auszahlungen</p>
          </div>
          <div className="flex gap-2">
            <Link href="/production" className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/50 transition-colors">
              Produktion
            </Link>
            <Link href="/creator-dashboard" className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 hover:border-white/50 transition-colors">
              Creator
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <div className="flex items-center gap-1"><p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Gesamtumsatz</p><InfoTooltip text={HELP.finance.revenueTotal} compact /></div>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.grossRevenueCents / 100).toFixed(2)} €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <div className="flex items-center gap-1"><p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890]">Creator-Provision</p><InfoTooltip text={HELP.finance.creatorCommission} compact /></div>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.creatorCommissionCents / 100).toFixed(2)} €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">
              Deckungsbeitrag vor Overhead
            </p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.platformGrossProfitBeforeOverheadCents / 100).toFixed(2)}{" "}
              €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Netto nach Ausgaben</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.platformNetAfterExpensesCents / 100).toFixed(2)} €
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Materialkosten</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.totalMaterialCostCents / 100).toFixed(2)} €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Produktionskosten</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.totalProductionCostCents / 100).toFixed(2)} €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Order-Kosten</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.totalOrderLevelCostsCents / 100).toFixed(2)} €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Reversed Provision</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.reversedCommissionCents / 100).toFixed(2)} €
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-sm text-[#9E9890]">Ausgaben gesamt</p>
            <p className="mt-2 text-2xl font-light tracking-tight text-[#0A0A0A]">
              {(stats.totalExpensesCents / 100).toFixed(2)} €
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Auszahlungsübersicht pro Creator</h2>
            <InfoTooltip text={HELP.finance.payoutRequest} />
          </div>

          {creatorPayouts.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Creator-Provisionen vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {creatorPayouts.map((creator) => (
                <div key={creator.creatorId} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {creator.creatorName}
                      </h3>
                      <p className="text-sm text-[#9E9890]">
                        Offen: {(creator.pendingCents / 100).toFixed(2)} €
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Auszahlbar: {(creator.payableCents / 100).toFixed(2)} €
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Gezahlt: {(creator.paidCents / 100).toFixed(2)} €
                      </p>
                      <p className="text-sm text-[#9E9890]">
                        Reversed: {(creator.reversedCents / 100).toFixed(2)} €
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        Gesamt: {(creator.totalCents / 100).toFixed(2)} €
                      </p>

                      {creator.payableCents > 0 && (
                        <button
                          onClick={() =>
                            createCreatorPayout(
                              creator.creatorId,
                              creator.creatorName,
                            )
                          }
                          disabled={payingCreatorId === creator.creatorId}
                          className="mt-3 rounded-xl bg-black px-4 py-2 text-sm text-white disabled:bg-gray-400"
                        >
                          {payingCreatorId === creator.creatorId
                            ? "Bitte warten..."
                            : "Jetzt auszahlen"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-xl font-semibold">Auszahlungshistorie</h2>

          {payouts.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Auszahlungsvorgänge vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {payouts.map((payout) => (
                <div key={payout.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {payout.creatorName}
                      </h3>
                      <p className="text-sm text-[#9E9890]">
                        Ausgezahlt am:{" "}
                        {new Date(payout.createdAt).toLocaleString("de-DE")}
                      </p>
                      {payout.note && (
                        <p className="text-sm text-[#9E9890]">{payout.note}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {(payout.totalCents / 100).toFixed(2)} €
                      </p>
                      <p className="text-sm text-[#9E9890]">{payout.id}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-xl font-semibold">Payout-Positionen</h2>

            {items.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Provisionspositionen vorhanden.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {item.fragranceName}
                        </h3>
                        <p className="text-sm text-[#9E9890]">
                          Creator: {item.creatorName}
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          Kunde: {item.customerName}
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          Auszahlung: {getPayoutStatusLabel(item.payoutStatus)}
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          Order-Status: {item.orderStatus}
                        </p>
                        {item.payoutBatchId && (
                          <p className="text-sm text-[#9E9890]">
                            Auszahlungsvorgang: {item.payoutBatchId}
                          </p>
                        )}
                        {item.paidAt && (
                          <p className="text-sm text-[#9E9890]">
                            Gezahlt am:{" "}
                            {new Date(item.paidAt).toLocaleString("de-DE")}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">
                          {(item.creatorCommissionCents / 100).toFixed(2)} €
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          {item.commissionPercent}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Materialkosten €
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              editingItemCosts[item.id]?.material ?? "0.00"
                            }
                            onChange={(e) =>
                              setEditingItemCosts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  material: e.target.value,
                                  production:
                                    prev[item.id]?.production ?? "0.00",
                                },
                              }))
                            }
                            className="w-full rounded-xl border px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Produktionskosten €
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              editingItemCosts[item.id]?.production ?? "0.00"
                            }
                            onChange={(e) =>
                              setEditingItemCosts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  material: prev[item.id]?.material ?? "0.00",
                                  production: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-xl border px-3 py-2"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => saveItemCosts(item.id)}
                        className="rounded-xl border px-3 py-2 text-sm"
                      >
                        Item-Kosten speichern
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => updatePayoutStatus(item.id, "pending")}
                          disabled={updatingItemId === item.id}
                          className="rounded-xl border px-3 py-2 text-sm"
                        >
                          Offen
                        </button>
                        <button
                          onClick={() => updatePayoutStatus(item.id, "payable")}
                          disabled={updatingItemId === item.id}
                          className="rounded-xl border px-3 py-2 text-sm"
                        >
                          Auszahlbar
                        </button>
                        <button
                          onClick={() => updatePayoutStatus(item.id, "paid")}
                          disabled={updatingItemId === item.id}
                          className="rounded-xl border px-3 py-2 text-sm"
                        >
                          Als gezahlt markieren
                        </button>
                        <button
                          onClick={() =>
                            updatePayoutStatus(item.id, "reversed")
                          }
                          disabled={updatingItemId === item.id}
                          className="rounded-xl border px-3 py-2 text-sm"
                        >
                          Reversed
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-xl font-semibold">Order-Kosten</h2>

              <div className="mt-4 space-y-4">
                {Object.values(orderCosts).length === 0 ? (
                  <p className="text-sm text-[#6E6860]">
                    Noch keine Order-Kosten vorhanden.
                  </p>
                ) : (
                  Object.values(orderCosts).map((order) => (
                    <div key={order.orderId} className="rounded-xl border p-4">
                      <p className="font-medium">Order {order.orderId}</p>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Versand €
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              editingOrderCosts[order.orderId]?.shipping ??
                              "0.00"
                            }
                            onChange={(e) =>
                              setEditingOrderCosts((prev) => ({
                                ...prev,
                                [order.orderId]: {
                                  shipping: e.target.value,
                                  packaging:
                                    prev[order.orderId]?.packaging ?? "0.00",
                                  other: prev[order.orderId]?.other ?? "0.00",
                                },
                              }))
                            }
                            className="w-full rounded-xl border px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Verpackung €
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              editingOrderCosts[order.orderId]?.packaging ??
                              "0.00"
                            }
                            onChange={(e) =>
                              setEditingOrderCosts((prev) => ({
                                ...prev,
                                [order.orderId]: {
                                  shipping:
                                    prev[order.orderId]?.shipping ?? "0.00",
                                  packaging: e.target.value,
                                  other: prev[order.orderId]?.other ?? "0.00",
                                },
                              }))
                            }
                            className="w-full rounded-xl border px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            Sonstiges €
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={
                              editingOrderCosts[order.orderId]?.other ?? "0.00"
                            }
                            onChange={(e) =>
                              setEditingOrderCosts((prev) => ({
                                ...prev,
                                [order.orderId]: {
                                  shipping:
                                    prev[order.orderId]?.shipping ?? "0.00",
                                  packaging:
                                    prev[order.orderId]?.packaging ?? "0.00",
                                  other: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-xl border px-3 py-2"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => saveOrderCosts(order.orderId)}
                        disabled={updatingCostOrderId === order.orderId}
                        className="mt-3 rounded-xl border px-3 py-2 text-sm"
                      >
                        {updatingCostOrderId === order.orderId
                          ? "Bitte warten..."
                          : "Order-Kosten speichern"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-xl font-semibold">Ausgaben</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Titel
                  </label>
                  <input
                    type="text"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="z. B. Rohstoffeinkauf"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Kategorie
                  </label>
                  <input
                    type="text"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="general / shipping / packaging / materials"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Betrag in €
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="19.99"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Notiz
                  </label>
                  <textarea
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    rows={3}
                  />
                </div>

                <button
                  onClick={addExpense}
                  disabled={savingExpense}
                  className="rounded-full bg-[#0A0A0A] px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-40"
                >
                  {savingExpense ? "Bitte warten..." : "Ausgabe speichern"}
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-sm text-[#6E6860]">
                    Noch keine Ausgaben erfasst.
                  </p>
                ) : (
                  expenses.map((expense) => (
                    <div key={expense.id} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          <p className="text-sm text-[#9E9890]">
                            {expense.category} ·{" "}
                            {new Date(expense.createdAt).toLocaleString(
                              "de-DE",
                            )}
                          </p>
                          {expense.notes && (
                            <p className="mt-1 text-sm text-[#6E6860]">
                              {expense.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-right font-semibold">
                          {(expense.amountCents / 100).toFixed(2)} €
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
