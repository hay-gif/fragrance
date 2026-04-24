"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  costPerUnitCents: number;
};

type Resource = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  costPerUnitCents: number;
};

type PurchaseHistoryRow = {
  id: string;
  createdAt: string;
  itemType: "raw_material" | "resource";
  itemId: string;
  itemName: string;
  quantityDelta: number;
  unit: string;
  note: string;
  referenceId: string;
};

type DbRawMaterialRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  cost_per_unit_cents: number;
};

type DbResourceRow = {
  id: string;
  name: string;
  unit: string;
  stock_quantity: number;
  cost_per_unit_cents: number;
};

type DbMovementRow = {
  id: string;
  created_at: string;
  item_type: "raw_material" | "resource";
  item_id: string;
  quantity_delta: number;
  unit: string | null;
  note: string | null;
  reference_id: string | null;
};

function centsToEuro(cents: number): string {
  return (cents / 100).toFixed(4);
}

export default function InventoryPurchasesPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [itemType, setItemType] = useState<"raw_material" | "resource">(
    "raw_material",
  );
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalPurchaseCostEuro, setTotalPurchaseCostEuro] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function loadData() {
      const [rawMaterialsResult, resourcesResult, purchasesResult] =
        await Promise.all([
          supabase
            .from("raw_materials")
            .select("id, name, unit, stock_quantity, cost_per_unit_cents")
            .order("name", { ascending: true }),
          supabase
            .from("resources")
            .select("id, name, unit, stock_quantity, cost_per_unit_cents")
            .order("name", { ascending: true }),
          supabase
            .from("inventory_movements")
            .select(
              "id, created_at, item_type, item_id, quantity_delta, unit, note, reference_id",
            )
            .eq("movement_type", "purchase")
            .order("created_at", { ascending: false }),
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

      if (purchasesResult.error) {
        console.error(
          "Fehler beim Laden der Einkaufshistorie:",
          purchasesResult.error,
        );
        setLoading(false);
        return;
      }

      const mappedRawMaterials: RawMaterial[] = (
        rawMaterialsResult.data ?? []
      ).map((row: DbRawMaterialRow) => ({
        id: row.id,
        name: row.name,
        unit: row.unit,
        stockQuantity: Number(row.stock_quantity),
        costPerUnitCents: Number(row.cost_per_unit_cents),
      }));

      const mappedResources: Resource[] = (resourcesResult.data ?? []).map(
        (row: DbResourceRow) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          stockQuantity: Number(row.stock_quantity),
          costPerUnitCents: Number(row.cost_per_unit_cents),
        }),
      );

      const rawMaterialMap = new Map(
        mappedRawMaterials.map((item) => [item.id, item.name]),
      );
      const resourceMap = new Map(
        mappedResources.map((item) => [item.id, item.name]),
      );

      const mappedHistory: PurchaseHistoryRow[] = (
        purchasesResult.data ?? []
      ).map((row: DbMovementRow) => ({
        id: row.id,
        createdAt: row.created_at,
        itemType: row.item_type,
        itemId: row.item_id,
        itemName:
          row.item_type === "raw_material"
            ? (rawMaterialMap.get(row.item_id) ?? "Unbekannter Rohstoff")
            : (resourceMap.get(row.item_id) ?? "Unbekannte Ressource"),
        quantityDelta: Number(row.quantity_delta),
        unit: row.unit ?? "",
        note: row.note ?? "",
        referenceId: row.reference_id ?? "",
      }));

      setRawMaterials(mappedRawMaterials);
      setResources(mappedResources);
      setPurchaseHistory(mappedHistory);
      setLoading(false);
    }

    loadData();
  }, []);

  const selectableItems = useMemo(() => {
    return itemType === "raw_material" ? rawMaterials : resources;
  }, [itemType, rawMaterials, resources]);

  const selectedItem = useMemo(() => {
    return selectableItems.find((item) => item.id === selectedItemId) ?? null;
  }, [selectableItems, selectedItemId]);

  async function createPurchase() {
    const parsedQuantity = Number(quantity);
    const parsedTotalCostEuro = Number(totalPurchaseCostEuro);

    if (!selectedItemId) {
      alert("Bitte wähle zuerst einen Eintrag aus.");
      return;
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      alert("Bitte gib eine gültige Menge ein.");
      return;
    }

    if (Number.isNaN(parsedTotalCostEuro) || parsedTotalCostEuro < 0) {
      alert("Bitte gib gültige Gesamtkosten ein.");
      return;
    }

    if (!selectedItem) {
      alert("Eintrag konnte nicht gefunden werden.");
      return;
    }

    setSaving(true);

    const newStockQuantity = selectedItem.stockQuantity + parsedQuantity;

    const targetTable =
      itemType === "raw_material" ? "raw_materials" : "resources";

    const { error: updateError } = await supabase
      .from(targetTable)
      .update({
        stock_quantity: newStockQuantity,
      })
      .eq("id", selectedItemId);

    if (updateError) {
      console.error("Fehler beim Aktualisieren des Bestands:", updateError);
      alert("Bestand konnte nicht erhöht werden.");
      setSaving(false);
      return;
    }

    const movementId = crypto.randomUUID();
    const totalCostCents = Math.round(parsedTotalCostEuro * 100);
    const effectiveUnitCostCents =
      parsedQuantity > 0 ? Math.round(totalCostCents / parsedQuantity) : 0;

    const parts = [
      supplierName.trim() ? `Supplier: ${supplierName.trim()}` : "",
      invoiceReference.trim() ? `Referenz: ${invoiceReference.trim()}` : "",
      note.trim(),
      `Gesamtkosten: ${(totalCostCents / 100).toFixed(2)} €`,
      `Effektive Stück-/Einheitskosten: ${(effectiveUnitCostCents / 100).toFixed(4)} €`,
    ].filter(Boolean);

    const movementNote = parts.join(" | ");

    const { error: movementError } = await supabase
      .from("inventory_movements")
      .insert({
        id: movementId,
        item_type: itemType,
        item_id: selectedItemId,
        movement_type: "purchase",
        quantity_delta: parsedQuantity,
        unit: selectedItem.unit,
        reference_type: "purchase",
        reference_id: invoiceReference.trim() || movementId,
        note: movementNote,
      });

    if (movementError) {
      console.error(
        "Fehler beim Schreiben der Einkaufsbewegung:",
        movementError,
      );
      alert(
        "Bestand wurde erhöht, aber die Einkaufsbewegung konnte nicht gespeichert werden.",
      );
      setSaving(false);
      return;
    }

    if (itemType === "raw_material") {
      setRawMaterials((prev) =>
        prev.map((item) =>
          item.id === selectedItemId
            ? { ...item, stockQuantity: newStockQuantity }
            : item,
        ),
      );
    } else {
      setResources((prev) =>
        prev.map((item) =>
          item.id === selectedItemId
            ? { ...item, stockQuantity: newStockQuantity }
            : item,
        ),
      );
    }

    setPurchaseHistory((prev) => [
      {
        id: movementId,
        createdAt: new Date().toISOString(),
        itemType,
        itemId: selectedItemId,
        itemName: selectedItem.name,
        quantityDelta: parsedQuantity,
        unit: selectedItem.unit,
        note: movementNote,
        referenceId: invoiceReference.trim() || movementId,
      },
      ...prev,
    ]);

    setSelectedItemId("");
    setQuantity("");
    setTotalPurchaseCostEuro("");
    setSupplierName("");
    setInvoiceReference("");
    setNote("");
    setSaving(false);
  }

  const stats = useMemo(() => {
    return {
      purchases: purchaseHistory.length,
      totalPurchasedQuantity: purchaseHistory.reduce(
        (sum, entry) => sum + entry.quantityDelta,
        0,
      ),
    };
  }, [purchaseHistory]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Purchases / Wareneingang</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/movements" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Movements</Link>
            <Link href="/inventory/reorder-planning" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Reorder Planning</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Einkaufsbuchungen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.purchases}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Gebuchte Gesamtmenge</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {stats.totalPurchasedQuantity.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Neuen Wareneingang buchen</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Typ</label>
              <select
                value={itemType}
                onChange={(e) => {
                  setItemType(e.target.value as "raw_material" | "resource");
                  setSelectedItemId("");
                }}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="raw_material">Rohstoff</option>
                <option value="resource">Ressource</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Eintrag</label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {selectableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Menge</label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Gesamtkosten in €</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={totalPurchaseCostEuro}
                onChange={(e) => setTotalPurchaseCostEuro(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="49.90"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Supplier</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="Hersteller / Händler"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Rechnung / Referenz</label>
              <input
                type="text"
                value={invoiceReference}
                onChange={(e) => setInvoiceReference(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="INV-2026-001"
              />
            </div>
          </div>

          {selectedItem && quantity && totalPurchaseCostEuro && (
            <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
              <p>
                <span className="font-medium text-[#3A3530]">Aktueller Bestand:</span>{" "}
                {selectedItem.stockQuantity.toFixed(4)} {selectedItem.unit}
              </p>
              <p>
                <span className="font-medium text-[#3A3530]">Bestand nach Buchung:</span>{" "}
                {(selectedItem.stockQuantity + Number(quantity || "0")).toFixed(4)}{" "}
                {selectedItem.unit}
              </p>
              <p>
                <span className="font-medium text-[#3A3530]">Effektive Einheitskosten:</span>{" "}
                {Number(quantity) > 0
                  ? (Number(totalPurchaseCostEuro) / Number(quantity)).toFixed(4)
                  : "0.0000"}{" "}
                €
              </p>
            </div>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notiz</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />
          </div>

          <button
            onClick={createPurchase}
            disabled={saving}
            className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
          >
            {saving ? "Bitte warten..." : "Wareneingang buchen"}
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Einkaufshistorie</h2>

          {purchaseHistory.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Einkaufsbuchungen vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {purchaseHistory.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        {entry.itemName}
                      </h3>
                      <p className="text-xs text-[#9E9890] mt-1">
                        Typ:{" "}
                        {entry.itemType === "raw_material"
                          ? "Rohstoff"
                          : "Ressource"}
                      </p>
                      <p className="text-xs text-[#9E9890]">
                        Zeitpunkt:{" "}
                        {new Date(entry.createdAt).toLocaleString("de-DE")}
                      </p>
                      {entry.referenceId && (
                        <p className="text-xs text-[#9E9890]">
                          Referenz: {entry.referenceId}
                        </p>
                      )}
                      {entry.note && (
                        <p className="mt-2 text-xs text-[#6E6860]">
                          {entry.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        +{entry.quantityDelta.toFixed(4)} {entry.unit}
                      </p>
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
