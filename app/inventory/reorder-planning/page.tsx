"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  minimumStockQuantity: number;
  costPerUnitCents: number;
};

type Resource = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  minimumStockQuantity: number;
  costPerUnitCents: number;
};

type DemandRow = {
  rawMaterialId: string;
  requiredQuantity: number;
};

type ReorderRow = {
  itemType: "raw_material" | "resource";
  itemId: string;
  name: string;
  unit: string;
  stockQuantity: number;
  minimumStockQuantity: number;
  openDemandQuantity: number;
  projectedAfterDemand: number;
  recommendedReorderQuantity: number;
  estimatedReorderCostCents: number;
  priority: "critical" | "low" | "ok";
};

type DbRawMaterialRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  minimum_stock_quantity: number;
  cost_per_unit_cents: number;
};

type DbResourceRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  minimum_stock_quantity: number;
  cost_per_unit_cents: number;
};

type OrderStatus =
  | "created"
  | "in_production"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

type DbOrderRow = {
  id: string;
  status: OrderStatus;
};

type DbOrderItemRow = {
  order_id: string;
  fragrance_id: string;
  size_ml: number;
  quantity: number;
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

export default function ReorderPlanningPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [rawMaterialDemand, setRawMaterialDemand] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [rawMaterialsResult, resourcesResult, ordersResult] =
        await Promise.all([
          supabase
            .from("raw_materials")
            .select(
              "id, name, unit, stock_quantity, minimum_stock_quantity, cost_per_unit_cents",
            ),
          supabase
            .from("resources")
            .select(
              "id, name, unit, stock_quantity, minimum_stock_quantity, cost_per_unit_cents",
            ),
          supabase
            .from("orders")
            .select("id, status")
            .in("status", ["created", "in_production"]),
        ]);

      if (rawMaterialsResult.error) {
        console.error(
          "Fehler beim Laden der Rohstoffe:",
          rawMaterialsResult.error,
        );
        setLoading(false);
        return;
      }
      if (resourcesResult.error) {
        console.error(
          "Fehler beim Laden der Ressourcen:",
          resourcesResult.error,
        );
        setLoading(false);
        return;
      }
      if (ordersResult.error) {
        console.error("Fehler beim Laden der Orders:", ordersResult.error);
        setLoading(false);
        return;
      }

      const openOrderIds = (ordersResult.data ?? []).map(
        (order: DbOrderRow) => order.id,
      );

      let orderItems: DbOrderItemRow[] = [];
      if (openOrderIds.length > 0) {
        const { data, error } = await supabase
          .from("order_items")
          .select("order_id, fragrance_id, size_ml, quantity")
          .in("order_id", openOrderIds);

        if (error) {
          console.error("Fehler beim Laden der Order-Items:", error);
          setLoading(false);
          return;
        }

        orderItems = data ?? [];
      }

      const fragranceIds = Array.from(
        new Set(orderItems.map((item) => item.fragrance_id)),
      );

      let fragranceAccords: DbFragranceAccordRow[] = [];
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

        fragranceAccords = data ?? [];
      }

      const accordIds = Array.from(
        new Set(fragranceAccords.map((entry) => entry.accord_id)),
      );

      let accordComponents: DbAccordComponentRow[] = [];
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

        accordComponents = data ?? [];
      }

      const rawDemandMap = new Map<string, number>();

      for (const item of orderItems) {
        const formula = fragranceAccords.filter(
          (entry) => entry.fragrance_id === item.fragrance_id,
        );

        for (const fragranceAccord of formula) {
          const components = accordComponents.filter(
            (component) => component.accord_id === fragranceAccord.accord_id,
          );

          for (const component of components) {
            const requiredQuantity =
              item.size_ml *
              item.quantity *
              (fragranceAccord.percentage / 100) *
              (component.percentage / 100);

            rawDemandMap.set(
              component.raw_material_id,
              (rawDemandMap.get(component.raw_material_id) ?? 0) +
                requiredQuantity,
            );
          }
        }
      }

      setRawMaterials(
        (rawMaterialsResult.data ?? []).map((row: DbRawMaterialRow) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          stockQuantity: Number(row.stock_quantity),
          minimumStockQuantity: Number(row.minimum_stock_quantity ?? 0),
          costPerUnitCents: Number(row.cost_per_unit_cents),
        })),
      );

      setResources(
        (resourcesResult.data ?? []).map((row: DbResourceRow) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          stockQuantity: Number(row.stock_quantity),
          minimumStockQuantity: Number(row.minimum_stock_quantity ?? 0),
          costPerUnitCents: Number(row.cost_per_unit_cents),
        })),
      );

      setRawMaterialDemand(
        Array.from(rawDemandMap.entries()).map(
          ([rawMaterialId, requiredQuantity]) => ({
            rawMaterialId,
            requiredQuantity,
          }),
        ),
      );

      setLoading(false);
    }

    loadData();
  }, []);

  const reorderRows = useMemo<ReorderRow[]>(() => {
    const demandMap = new Map(
      rawMaterialDemand.map((row) => [row.rawMaterialId, row.requiredQuantity]),
    );

    const rawRows: ReorderRow[] = rawMaterials.map((item) => {
      const openDemandQuantity = demandMap.get(item.id) ?? 0;
      const projectedAfterDemand = item.stockQuantity - openDemandQuantity;

      const deficitToMinimum = item.minimumStockQuantity - projectedAfterDemand;
      const recommendedReorderQuantity =
        deficitToMinimum > 0 ? deficitToMinimum : 0;

      let priority: "critical" | "low" | "ok" = "ok";
      if (projectedAfterDemand < item.minimumStockQuantity)
        priority = "critical";
      else if (
        item.minimumStockQuantity > 0 &&
        projectedAfterDemand <= item.minimumStockQuantity * 1.2
      ) {
        priority = "low";
      }

      return {
        itemType: "raw_material",
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        stockQuantity: item.stockQuantity,
        minimumStockQuantity: item.minimumStockQuantity,
        openDemandQuantity,
        projectedAfterDemand,
        recommendedReorderQuantity,
        estimatedReorderCostCents: Math.round(
          recommendedReorderQuantity * item.costPerUnitCents,
        ),
        priority,
      };
    });

    const resourceRows: ReorderRow[] = resources.map((item) => {
      const projectedAfterDemand = item.stockQuantity;
      const deficitToMinimum = item.minimumStockQuantity - projectedAfterDemand;
      const recommendedReorderQuantity =
        deficitToMinimum > 0 ? deficitToMinimum : 0;

      let priority: "critical" | "low" | "ok" = "ok";
      if (projectedAfterDemand < item.minimumStockQuantity)
        priority = "critical";
      else if (
        item.minimumStockQuantity > 0 &&
        projectedAfterDemand <= item.minimumStockQuantity * 1.2
      ) {
        priority = "low";
      }

      return {
        itemType: "resource",
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        stockQuantity: item.stockQuantity,
        minimumStockQuantity: item.minimumStockQuantity,
        openDemandQuantity: 0,
        projectedAfterDemand,
        recommendedReorderQuantity,
        estimatedReorderCostCents: Math.round(
          recommendedReorderQuantity * item.costPerUnitCents,
        ),
        priority,
      };
    });

    return [...rawRows, ...resourceRows].sort((a, b) => {
      const priorityRank = { critical: 0, low: 1, ok: 2 };
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      return b.estimatedReorderCostCents - a.estimatedReorderCostCents;
    });
  }, [rawMaterials, resources, rawMaterialDemand]);

  const stats = useMemo(() => {
    return {
      critical: reorderRows.filter((row) => row.priority === "critical").length,
      low: reorderRows.filter((row) => row.priority === "low").length,
      totalSuggestedCostCents: reorderRows.reduce(
        (sum, row) => sum + row.estimatedReorderCostCents,
        0,
      ),
    };
  }, [reorderRows]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Reorder Planning</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/order-material-demand" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Material Demand</Link>
            <Link href="/production" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Produktion</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Kritische Positionen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.critical}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Bald knapp</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.low}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Empfohlener Einkaufswert</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {(stats.totalSuggestedCostCents / 100).toFixed(2)} €
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Nachbestellliste</h2>

          {reorderRows.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Daten vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {reorderRows.map((row) => (
                <div
                  key={`${row.itemType}-${row.itemId}`}
                  className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">{row.name}</h3>
                      <p className="text-xs text-[#9E9890] mt-1">
                        Typ: {row.itemType === "raw_material" ? "Rohstoff" : "Ressource"}
                      </p>
                      <p className="text-xs text-[#9E9890]">Bestand: {row.stockQuantity.toFixed(4)} {row.unit}</p>
                      <p className="text-xs text-[#9E9890]">Mindestbestand: {row.minimumStockQuantity.toFixed(4)} {row.unit}</p>
                      <p className="text-xs text-[#9E9890]">Offene Nachfrage: {row.openDemandQuantity.toFixed(4)} {row.unit}</p>
                      <p className="text-xs text-[#9E9890]">Prognose nach offenen Orders: {row.projectedAfterDemand.toFixed(4)} {row.unit}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {row.recommendedReorderQuantity.toFixed(4)} {row.unit}
                      </p>
                      <p className="text-xs text-[#9E9890]">empfohlene Nachbestellung</p>
                      <p className="mt-1 text-xs text-[#9E9890]">
                        {(row.estimatedReorderCostCents / 100).toFixed(2)} €
                      </p>

                      <div className="mt-3">
                        {row.priority === "critical" && (
                          <span className="inline-block rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700">Kritisch</span>
                        )}
                        {row.priority === "low" && (
                          <span className="inline-block rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-700">Bald knapp</span>
                        )}
                        {row.priority === "ok" && (
                          <span className="inline-block rounded-full border border-[#E5E0D8] px-3 py-1 text-xs text-[#6E6860]">Ausreichend</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
