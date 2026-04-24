"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrderStatus =
  | "created"
  | "in_production"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customerName: string;
  items: OrderItem[];
};

type OrderItem = {
  id: string;
  orderId: string;
  fragranceId: string;
  name: string;
  sizeMl: number;
  quantity: number;
};

type FragranceAccord = {
  fragranceId: string;
  accordId: string;
  percentage: number;
};

type Accord = {
  id: string;
  name: string;
};

type AccordComponent = {
  accordId: string;
  rawMaterialId: string;
  percentage: number;
};

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  costPerUnitCents: number;
};

type DemandRow = {
  rawMaterialId: string;
  rawMaterialName: string;
  unit: string;
  requiredQuantity: number;
  stockQuantity: number;
  remainingAfterProduction: number;
  costEstimateCents: number;
  usedInOrders: string[];
  usedInFragrances: string[];
};

type DbOrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  customer_name: string;
};

type DbOrderItemRow = {
  id: string;
  order_id: string;
  fragrance_id: string;
  name: string;
  size_ml: number;
  quantity: number;
};

type DbFragranceAccordRow = {
  fragrance_id: string;
  accord_id: string;
  percentage: number;
};

type DbAccordRow = {
  id: string;
  name: string;
};

type DbAccordComponentRow = {
  accord_id: string;
  raw_material_id: string;
  percentage: number;
};

type DbRawMaterialRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  cost_per_unit_cents: number;
};

function formatStatus(status: OrderStatus): string {
  if (status === "created") return "erstellt";
  if (status === "in_production") return "in Produktion";
  if (status === "shipped") return "versendet";
  if (status === "delivered") return "zugestellt";
  if (status === "returned") return "retourniert";
  return "storniert";
}

export default function OrderMaterialDemandPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [fragranceAccords, setFragranceAccords] = useState<FragranceAccord[]>(
    [],
  );
  const [accords, setAccords] = useState<Accord[]>([]);
  const [accordComponents, setAccordComponents] = useState<AccordComponent[]>(
    [],
  );
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select("id, created_at, status, customer_name")
        .in("status", ["created", "in_production"])
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("Fehler beim Laden der Orders:", orderError);
        setLoading(false);
        return;
      }

      const orderIds = (orderRows ?? []).map((row: DbOrderRow) => row.id);

      let itemRows: DbOrderItemRow[] = [];
      if (orderIds.length > 0) {
        const { data, error } = await supabase
          .from("order_items")
          .select("id, order_id, fragrance_id, name, size_ml, quantity")
          .in("order_id", orderIds);

        if (error) {
          console.error("Fehler beim Laden der Order-Items:", error);
          setLoading(false);
          return;
        }

        itemRows = data ?? [];
      }

      const fragranceIds = Array.from(
        new Set(itemRows.map((row) => row.fragrance_id)),
      );

      let fragranceAccordRows: DbFragranceAccordRow[] = [];
      if (fragranceIds.length > 0) {
        const { data, error } = await supabase
          .from("fragrance_accords")
          .select("fragrance_id, accord_id, percentage")
          .in("fragrance_id", fragranceIds);

        if (error) {
          console.error("Fehler beim Laden der Duft-Accorde:", error);
          setLoading(false);
          return;
        }

        fragranceAccordRows = data ?? [];
      }

      const accordIds = Array.from(
        new Set(
          fragranceAccordRows.map((row: DbFragranceAccordRow) => row.accord_id),
        ),
      );

      let accordRows: DbAccordRow[] = [];
      if (accordIds.length > 0) {
        const { data, error } = await supabase
          .from("accords")
          .select("id, name")
          .in("id", accordIds);

        if (error) {
          console.error("Fehler beim Laden der Accorde:", error);
          setLoading(false);
          return;
        }

        accordRows = data ?? [];
      }

      let accordComponentRows: DbAccordComponentRow[] = [];
      if (accordIds.length > 0) {
        const { data, error } = await supabase
          .from("accord_components")
          .select("accord_id, raw_material_id, percentage")
          .in("accord_id", accordIds);

        if (error) {
          console.error("Fehler beim Laden der Accord-Komponenten:", error);
          setLoading(false);
          return;
        }

        accordComponentRows = data ?? [];
      }

      const rawMaterialIds = Array.from(
        new Set(accordComponentRows.map((row) => row.raw_material_id)),
      );

      let rawMaterialRows: DbRawMaterialRow[] = [];
      if (rawMaterialIds.length > 0) {
        const { data, error } = await supabase
          .from("raw_materials")
          .select("id, name, unit, stock_quantity, cost_per_unit_cents")
          .in("id", rawMaterialIds);

        if (error) {
          console.error("Fehler beim Laden der Rohstoffe:", error);
          setLoading(false);
          return;
        }

        rawMaterialRows = data ?? [];
      }

      const mappedOrders: Order[] = (orderRows ?? []).map((order) => ({
        id: order.id,
        createdAt: order.created_at,
        status: order.status,
        customerName: order.customer_name,
        items: itemRows
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            id: item.id,
            orderId: item.order_id,
            fragranceId: item.fragrance_id,
            name: item.name,
            sizeMl: item.size_ml,
            quantity: item.quantity,
          })),
      }));

      setOrders(mappedOrders);
      setFragranceAccords(
        fragranceAccordRows.map((row) => ({
          fragranceId: row.fragrance_id,
          accordId: row.accord_id,
          percentage: Number(row.percentage),
        })),
      );
      setAccords(
        accordRows.map((row) => ({
          id: row.id,
          name: row.name,
        })),
      );
      setAccordComponents(
        accordComponentRows.map((row) => ({
          accordId: row.accord_id,
          rawMaterialId: row.raw_material_id,
          percentage: Number(row.percentage),
        })),
      );
      setRawMaterials(
        rawMaterialRows.map((row) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          stockQuantity: Number(row.stock_quantity),
          costPerUnitCents: Number(row.cost_per_unit_cents),
        })),
      );
      setLoading(false);
    }

    loadData();
  }, []);

  const accordMap = useMemo(
    () => new Map(accords.map((accord) => [accord.id, accord.name])),
    [accords],
  );

  const rawMaterialMap = useMemo(
    () => new Map(rawMaterials.map((material) => [material.id, material])),
    [rawMaterials],
  );

  const demandRows = useMemo<DemandRow[]>(() => {
    const demandMap = new Map<
      string,
      {
        rawMaterialName: string;
        unit: string;
        requiredQuantity: number;
        stockQuantity: number;
        costEstimateCents: number;
        usedInOrders: Set<string>;
        usedInFragrances: Set<string>;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const formula = fragranceAccords.filter(
          (entry) => entry.fragranceId === item.fragranceId,
        );

        for (const fragranceAccord of formula) {
          const components = accordComponents.filter(
            (component) => component.accordId === fragranceAccord.accordId,
          );

          for (const component of components) {
            const rawMaterial = rawMaterialMap.get(component.rawMaterialId);
            if (!rawMaterial) continue;

            const requiredQuantity =
              item.sizeMl *
              item.quantity *
              (fragranceAccord.percentage / 100) *
              (component.percentage / 100);

            const costEstimateCents =
              requiredQuantity * rawMaterial.costPerUnitCents;

            const existing = demandMap.get(component.rawMaterialId);

            if (!existing) {
              demandMap.set(component.rawMaterialId, {
                rawMaterialName: rawMaterial.name,
                unit: rawMaterial.unit,
                requiredQuantity,
                stockQuantity: rawMaterial.stockQuantity,
                costEstimateCents,
                usedInOrders: new Set([order.id]),
                usedInFragrances: new Set([item.name]),
              });
              continue;
            }

            existing.requiredQuantity += requiredQuantity;
            existing.costEstimateCents += costEstimateCents;
            existing.usedInOrders.add(order.id);
            existing.usedInFragrances.add(item.name);
          }
        }
      }
    }

    return Array.from(demandMap.entries())
      .map(([rawMaterialId, value]) => ({
        rawMaterialId,
        rawMaterialName: value.rawMaterialName,
        unit: value.unit,
        requiredQuantity: value.requiredQuantity,
        stockQuantity: value.stockQuantity,
        remainingAfterProduction: value.stockQuantity - value.requiredQuantity,
        costEstimateCents: Math.round(value.costEstimateCents),
        usedInOrders: Array.from(value.usedInOrders),
        usedInFragrances: Array.from(value.usedInFragrances),
      }))
      .sort((a, b) => a.remainingAfterProduction - b.remainingAfterProduction);
  }, [orders, fragranceAccords, accordComponents, rawMaterialMap]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalItems = orders.reduce(
      (sum, order) => sum + order.items.length,
      0,
    );
    const criticalMaterials = demandRows.filter(
      (row) => row.remainingAfterProduction < 0,
    ).length;
    const lowMaterials = demandRows.filter(
      (row) =>
        row.remainingAfterProduction >= 0 && row.remainingAfterProduction < 10,
    ).length;

    return {
      totalOrders,
      totalItems,
      criticalMaterials,
      lowMaterials,
    };
  }, [orders, demandRows]);

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
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Order Material Demand</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/production" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Produktion</Link>
            <Link href="/inventory/fragrance-formulas" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Formulas</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Offene Orders</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.totalOrders}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Order-Positionen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.totalItems}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Kritische Rohstoffe</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.criticalMaterials}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Knapp werdende Rohstoffe</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.lowMaterials}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Offene Orders</h2>

          {orders.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Keine Orders im Status erstellt oder in Produktion.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        Order {order.id}
                      </h3>
                      <p className="text-xs text-[#9E9890] mt-1">Kunde: {order.customerName}</p>
                      <p className="text-xs text-[#9E9890]">Status: {formatStatus(order.status)}</p>
                      <p className="text-xs text-[#9E9890]">Erstellt: {new Date(order.createdAt).toLocaleString("de-DE")}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {order.items.map((item) => {
                      const formula = fragranceAccords.filter(
                        (entry) => entry.fragranceId === item.fragranceId,
                      );

                      return (
                        <div key={item.id} className="rounded-xl border border-[#E5E0D8] bg-white p-3">
                          <p className="text-sm font-medium text-[#0A0A0A]">{item.name}</p>
                          <p className="text-xs text-[#9E9890]">{item.sizeMl} ml · Menge: {item.quantity}</p>
                          <p className="text-xs text-[#9E9890]">
                            Accorde:{" "}
                            {formula.length > 0
                              ? formula.map((entry) => `${accordMap.get(entry.accordId) ?? "Unbekannt"} (${entry.percentage.toFixed(2)}%)`).join(", ")
                              : "Keine Formel"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Geschätzter Rohstoffbedarf</h2>

          {demandRows.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Kein Rohstoffbedarf berechenbar. Prüfe Duftformeln und Accord-Zuordnungen.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {demandRows.map((row) => {
                const isCritical = row.remainingAfterProduction < 0;
                const isLow = row.remainingAfterProduction >= 0 && row.remainingAfterProduction < 10;

                return (
                  <div key={row.rawMaterialId} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-[#0A0A0A]">{row.rawMaterialName}</h3>
                        <p className="text-xs text-[#9E9890] mt-1">Benötigt: {row.requiredQuantity.toFixed(4)} {row.unit}</p>
                        <p className="text-xs text-[#9E9890]">Bestand: {row.stockQuantity.toFixed(4)} {row.unit}</p>
                        <p className="text-xs text-[#9E9890]">Rest nach Produktion: {row.remainingAfterProduction.toFixed(4)} {row.unit}</p>
                        <p className="mt-2 text-xs text-[#6E6860]">Verwendet in Düften: {row.usedInFragrances.join(", ")}</p>
                        <p className="text-xs text-[#6E6860]">Betroffene Orders: {row.usedInOrders.join(", ")}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0A0A0A]">
                          {(row.costEstimateCents / 100).toFixed(2)} €
                        </p>
                        <p className="text-xs text-[#9E9890]">geschätzter Bedarf</p>

                        <div className="mt-3">
                          {isCritical && (
                            <span className="inline-block rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700">Kritisch</span>
                          )}
                          {!isCritical && isLow && (
                            <span className="inline-block rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700">Bald knapp</span>
                          )}
                          {!isCritical && !isLow && (
                            <span className="inline-block rounded-full border border-[#E5E0D8] px-3 py-1 text-xs text-[#6E6860]">Ausreichend</span>
                          )}
                        </div>
                      </div>
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
