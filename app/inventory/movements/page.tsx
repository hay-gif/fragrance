"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Movement = {
  id: string;
  createdAt: string;
  itemType: string;
  itemId: string;
  itemName: string;
  movementType: string;
  quantityDelta: number;
  unit: string;
  referenceType: string;
  referenceId: string;
  note: string;
};

type DbMovementRow = {
  id: string;
  created_at: string;
  item_type: string;
  item_id: string;
  movement_type: string;
  quantity_delta: number;
  unit: string | null;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
};

type DbRawMaterialRow = {
  id: string;
  name: string;
};

type DbResourceRow = {
  id: string;
  name: string;
};

function formatMovementType(type: string): string {
  if (type === "manual_adjustment") return "Manuelle Anpassung";
  if (type === "purchase") return "Einkauf";
  if (type === "production_reservation") return "Produktionsreservierung";
  if (type === "production_consumption") return "Produktionsverbrauch";
  if (type === "correction") return "Korrektur";
  if (type === "return") return "Rückbuchung";
  return type;
}

function formatItemType(type: string): string {
  if (type === "raw_material") return "Rohstoff";
  if (type === "resource") return "Ressource";
  return type;
}

export default function InventoryMovementsPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: movementRows, error: movementError } = await supabase
        .from("inventory_movements")
        .select("*")
        .order("created_at", { ascending: false });

      if (movementError) {
        console.error("Fehler beim Laden der Lagerbewegungen:", movementError);
        setLoading(false);
        return;
      }

      const rawMaterialIds = Array.from(
        new Set(
          (movementRows ?? [])
            .filter((row: DbMovementRow) => row.item_type === "raw_material")
            .map((row: DbMovementRow) => row.item_id),
        ),
      );

      const resourceIds = Array.from(
        new Set(
          (movementRows ?? [])
            .filter((row: DbMovementRow) => row.item_type === "resource")
            .map((row: DbMovementRow) => row.item_id),
        ),
      );

      let rawMaterialMap = new Map<string, string>();
      let resourceMap = new Map<string, string>();

      if (rawMaterialIds.length > 0) {
        const { data, error } = await supabase
          .from("raw_materials")
          .select("id, name")
          .in("id", rawMaterialIds);

        if (error) {
          console.error("Fehler beim Laden der Rohstoffnamen:", error);
          setLoading(false);
          return;
        }

        rawMaterialMap = new Map(
          (data ?? []).map((row: DbRawMaterialRow) => [row.id, row.name]),
        );
      }

      if (resourceIds.length > 0) {
        const { data, error } = await supabase
          .from("resources")
          .select("id, name")
          .in("id", resourceIds);

        if (error) {
          console.error("Fehler beim Laden der Ressourcennamen:", error);
          setLoading(false);
          return;
        }

        resourceMap = new Map(
          (data ?? []).map((row: DbResourceRow) => [row.id, row.name]),
        );
      }

      const mapped: Movement[] = (movementRows ?? []).map(
        (row: DbMovementRow) => {
          const itemName =
            row.item_type === "raw_material"
              ? (rawMaterialMap.get(row.item_id) ?? "Unbekannter Rohstoff")
              : (resourceMap.get(row.item_id) ?? "Unbekannte Ressource");

          return {
            id: row.id,
            createdAt: row.created_at,
            itemType: row.item_type,
            itemId: row.item_id,
            itemName,
            movementType: row.movement_type,
            quantityDelta: Number(row.quantity_delta),
            unit: row.unit ?? "",
            referenceType: row.reference_type ?? "",
            referenceId: row.reference_id ?? "",
            note: row.note ?? "",
          };
        },
      );

      setMovements(mapped);
      setLoading(false);
    }

    loadData();
  }, []);

  const stats = useMemo(() => {
    const positive = movements.filter(
      (movement) => movement.quantityDelta > 0,
    ).length;
    const negative = movements.filter(
      (movement) => movement.quantityDelta < 0,
    ).length;

    return {
      total: movements.length,
      positive,
      negative,
    };
  }, [movements]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Inventory Movements</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/reorder-planning" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Reorder Planning</Link>
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Bewegungen gesamt</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Zugänge</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.positive}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Abgänge</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.negative}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Historie</h2>

          {movements.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Lagerbewegungen vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {movements.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        {movement.itemName}
                      </h3>
                      <p className="text-xs text-[#9E9890] mt-1">
                        Typ: {formatItemType(movement.itemType)}
                      </p>
                      <p className="text-xs text-[#9E9890]">
                        Bewegung: {formatMovementType(movement.movementType)}
                      </p>
                      <p className="text-xs text-[#9E9890]">
                        Zeitpunkt:{" "}
                        {new Date(movement.createdAt).toLocaleString("de-DE")}
                      </p>
                      {movement.referenceType && (
                        <p className="text-xs text-[#9E9890]">
                          Referenz: {movement.referenceType}{" "}
                          {movement.referenceId}
                        </p>
                      )}
                      {movement.note && (
                        <p className="mt-2 text-xs text-[#6E6860]">
                          {movement.note}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#0A0A0A]">
                        {movement.quantityDelta > 0 ? "+" : ""}
                        {movement.quantityDelta.toFixed(4)} {movement.unit}
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
