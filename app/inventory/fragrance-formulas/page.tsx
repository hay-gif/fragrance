"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fragrance = {
  id: string;
  name: string;
  ownerId: string | null;
  status: "draft" | "active";
  isPublic: boolean;
  sizeMl: number;
};

type Accord = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

type FragranceAccord = {
  id: string;
  createdAt: string;
  fragranceId: string;
  accordId: string;
  percentage: number;
};

type AccordComponent = {
  id: string;
  accordId: string;
  rawMaterialId: string;
  percentage: number;
};

type RawMaterial = {
  id: string;
  name: string;
  costPerUnitCents: number;
};

type Resource = {
  id: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
};

type FragranceResource = {
  id: string;
  createdAt: string;
  fragranceId: string;
  resourceId: string;
  quantityPerUnit: number;
};

type DbFragranceRow = {
  id: string;
  name: string;
  owner_id: string | null;
  status: "draft" | "active";
  is_public: boolean;
  size_ml: number;
};

type DbAccordRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type DbFragranceAccordRow = {
  id: string;
  created_at: string;
  fragrance_id: string;
  accord_id: string;
  percentage: number;
};

type DbAccordComponentRow = {
  id: string;
  accord_id: string;
  raw_material_id: string;
  percentage: number;
};

type DbRawMaterialRow = {
  id: string;
  name: string;
  cost_per_unit_cents: number;
};

type DbResourceRow = {
  id: string;
  name: string;
  unit: string;
  cost_per_unit_cents: number;
};

type DbFragranceResourceRow = {
  id: string;
  created_at: string;
  fragrance_id: string;
  resource_id: string;
  quantity_per_unit: number;
};

function centsToEuroString(cents: number): string {
  return (cents / 100).toFixed(4);
}

export default function FragranceFormulasPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [accords, setAccords] = useState<Accord[]>([]);
  const [fragranceAccords, setFragranceAccords] = useState<FragranceAccord[]>(
    [],
  );
  const [accordComponents, setAccordComponents] = useState<AccordComponent[]>(
    [],
  );
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [fragranceResources, setFragranceResources] = useState<
    FragranceResource[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [savingRelation, setSavingRelation] = useState(false);
  const [savingResourceRelation, setSavingResourceRelation] = useState(false);
  const [updatingAccordRowId, setUpdatingAccordRowId] = useState<string | null>(
    null,
  );
  const [updatingResourceRowId, setUpdatingResourceRowId] = useState<
    string | null
  >(null);
  const [deletingAccordRowId, setDeletingAccordRowId] = useState<string | null>(
    null,
  );
  const [deletingResourceRowId, setDeletingResourceRowId] = useState<
    string | null
  >(null);

  const [selectedFragranceId, setSelectedFragranceId] = useState("");
  const [selectedAccordId, setSelectedAccordId] = useState("");
  const [fragranceAccordPercentage, setFragranceAccordPercentage] =
    useState("");

  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [resourceQuantityPerUnit, setResourceQuantityPerUnit] = useState("");

  const [editingAccordPercentages, setEditingAccordPercentages] = useState<
    Record<string, string>
  >({});
  const [editingResourceQuantities, setEditingResourceQuantities] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    async function loadData() {
      const [
        fragranceResult,
        accordResult,
        fragranceAccordResult,
        accordComponentResult,
        rawMaterialResult,
        resourceResult,
        fragranceResourceResult,
      ] = await Promise.all([
        supabase
          .from("fragrances")
          .select("id, name, owner_id, status, is_public, size_ml")
          .order("created_at", { ascending: false }),
        supabase
          .from("accords")
          .select("id, name, description, is_active")
          .order("created_at", { ascending: false }),
        supabase
          .from("fragrance_accords")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("accord_components")
          .select("id, accord_id, raw_material_id, percentage"),
        supabase.from("raw_materials").select("id, name, cost_per_unit_cents"),
        supabase
          .from("resources")
          .select("id, name, unit, cost_per_unit_cents")
          .order("name", { ascending: true }),
        supabase
          .from("fragrance_resources")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (
        fragranceResult.error ||
        accordResult.error ||
        fragranceAccordResult.error ||
        accordComponentResult.error ||
        rawMaterialResult.error ||
        resourceResult.error ||
        fragranceResourceResult.error
      ) {
        console.error(
          "Fehler beim Laden der Duftformel-Daten:",
          fragranceResult.error ||
            accordResult.error ||
            fragranceAccordResult.error ||
            accordComponentResult.error ||
            rawMaterialResult.error ||
            resourceResult.error ||
            fragranceResourceResult.error,
        );
        setLoading(false);
        return;
      }

      const mappedFragrances: Fragrance[] = (fragranceResult.data ?? []).map(
        (row: DbFragranceRow) => ({
          id: row.id,
          name: row.name,
          ownerId: row.owner_id,
          status: row.status,
          isPublic: row.is_public,
          sizeMl: row.size_ml,
        }),
      );

      const mappedAccords: Accord[] = (accordResult.data ?? []).map(
        (row: DbAccordRow) => ({
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          isActive: row.is_active,
        }),
      );

      const mappedFragranceAccords: FragranceAccord[] = (
        fragranceAccordResult.data ?? []
      ).map((row: DbFragranceAccordRow) => ({
        id: row.id,
        createdAt: row.created_at,
        fragranceId: row.fragrance_id,
        accordId: row.accord_id,
        percentage: Number(row.percentage),
      }));

      const mappedAccordComponents: AccordComponent[] = (
        accordComponentResult.data ?? []
      ).map((row: DbAccordComponentRow) => ({
        id: row.id,
        accordId: row.accord_id,
        rawMaterialId: row.raw_material_id,
        percentage: Number(row.percentage),
      }));

      const mappedRawMaterials: RawMaterial[] = (
        rawMaterialResult.data ?? []
      ).map((row: DbRawMaterialRow) => ({
        id: row.id,
        name: row.name,
        costPerUnitCents: Number(row.cost_per_unit_cents),
      }));

      const mappedResources: Resource[] = (resourceResult.data ?? []).map(
        (row: DbResourceRow) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
          costPerUnitCents: Number(row.cost_per_unit_cents),
        }),
      );

      const mappedFragranceResources: FragranceResource[] = (
        fragranceResourceResult.data ?? []
      ).map((row: DbFragranceResourceRow) => ({
        id: row.id,
        createdAt: row.created_at,
        fragranceId: row.fragrance_id,
        resourceId: row.resource_id,
        quantityPerUnit: Number(row.quantity_per_unit),
      }));

      const initialAccordEditing: Record<string, string> = {};
      for (const row of mappedFragranceAccords) {
        initialAccordEditing[row.id] = String(row.percentage);
      }

      const initialResourceEditing: Record<string, string> = {};
      for (const row of mappedFragranceResources) {
        initialResourceEditing[row.id] = String(row.quantityPerUnit);
      }

      setFragrances(mappedFragrances);
      setAccords(mappedAccords);
      setFragranceAccords(mappedFragranceAccords);
      setAccordComponents(mappedAccordComponents);
      setRawMaterials(mappedRawMaterials);
      setResources(mappedResources);
      setFragranceResources(mappedFragranceResources);
      setEditingAccordPercentages(initialAccordEditing);
      setEditingResourceQuantities(initialResourceEditing);

      if (mappedFragrances.length > 0) {
        setSelectedFragranceId(mappedFragrances[0].id);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  async function addFragranceAccord() {
    const parsedPercentage = Number(fragranceAccordPercentage);

    if (!selectedFragranceId) {
      alert("Bitte wähle zuerst einen Duft aus.");
      return;
    }

    if (!selectedAccordId) {
      alert("Bitte wähle einen Accord aus.");
      return;
    }

    if (Number.isNaN(parsedPercentage) || parsedPercentage <= 0) {
      alert("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    const duplicate = fragranceAccords.find(
      (entry) =>
        entry.fragranceId === selectedFragranceId &&
        entry.accordId === selectedAccordId,
    );

    if (duplicate) {
      alert("Dieser Accord ist dem Duft bereits zugeordnet.");
      return;
    }

    setSavingRelation(true);

    const id = crypto.randomUUID();

    const { error } = await supabase.from("fragrance_accords").insert({
      id,
      fragrance_id: selectedFragranceId,
      accord_id: selectedAccordId,
      percentage: parsedPercentage,
    });

    if (error) {
      console.error("Fehler beim Speichern der Duft-Accord-Zuordnung:", error);
      alert("Zuordnung konnte nicht gespeichert werden.");
      setSavingRelation(false);
      return;
    }

    const newRow: FragranceAccord = {
      id,
      createdAt: new Date().toISOString(),
      fragranceId: selectedFragranceId,
      accordId: selectedAccordId,
      percentage: parsedPercentage,
    };

    setFragranceAccords((prev) => [newRow, ...prev]);
    setEditingAccordPercentages((prev) => ({
      ...prev,
      [id]: String(parsedPercentage),
    }));

    setSelectedAccordId("");
    setFragranceAccordPercentage("");
    setSavingRelation(false);
  }

  async function updateFragranceAccord(rowId: string) {
    const value = editingAccordPercentages[rowId];
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      alert("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    setUpdatingAccordRowId(rowId);

    const { error } = await supabase
      .from("fragrance_accords")
      .update({ percentage: parsed })
      .eq("id", rowId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Accord-Anteils:", error);
      alert("Accord-Anteil konnte nicht aktualisiert werden.");
      setUpdatingAccordRowId(null);
      return;
    }

    setFragranceAccords((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, percentage: parsed } : row,
      ),
    );

    setUpdatingAccordRowId(null);
  }

  async function deleteFragranceAccord(rowId: string) {
    setDeletingAccordRowId(rowId);

    const { error } = await supabase
      .from("fragrance_accords")
      .delete()
      .eq("id", rowId);

    if (error) {
      console.error("Fehler beim Löschen des Accord-Eintrags:", error);
      alert("Accord-Eintrag konnte nicht gelöscht werden.");
      setDeletingAccordRowId(null);
      return;
    }

    setFragranceAccords((prev) => prev.filter((row) => row.id !== rowId));
    setDeletingAccordRowId(null);
  }

  async function addFragranceResource() {
    const parsedQuantity = Number(resourceQuantityPerUnit);

    if (!selectedFragranceId) {
      alert("Bitte wähle zuerst einen Duft aus.");
      return;
    }

    if (!selectedResourceId) {
      alert("Bitte wähle eine Ressource aus.");
      return;
    }

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      alert("Bitte gib eine gültige Menge pro Einheit ein.");
      return;
    }

    const duplicate = fragranceResources.find(
      (entry) =>
        entry.fragranceId === selectedFragranceId &&
        entry.resourceId === selectedResourceId,
    );

    if (duplicate) {
      alert("Diese Ressource ist dem Duft bereits zugeordnet.");
      return;
    }

    setSavingResourceRelation(true);

    const id = crypto.randomUUID();

    const { error } = await supabase.from("fragrance_resources").insert({
      id,
      fragrance_id: selectedFragranceId,
      resource_id: selectedResourceId,
      quantity_per_unit: parsedQuantity,
    });

    if (error) {
      console.error("Fehler beim Speichern der Duft-Ressource:", error);
      alert("Ressourcenzuordnung konnte nicht gespeichert werden.");
      setSavingResourceRelation(false);
      return;
    }

    const newRow: FragranceResource = {
      id,
      createdAt: new Date().toISOString(),
      fragranceId: selectedFragranceId,
      resourceId: selectedResourceId,
      quantityPerUnit: parsedQuantity,
    };

    setFragranceResources((prev) => [newRow, ...prev]);
    setEditingResourceQuantities((prev) => ({
      ...prev,
      [id]: String(parsedQuantity),
    }));

    setSelectedResourceId("");
    setResourceQuantityPerUnit("");
    setSavingResourceRelation(false);
  }

  async function updateFragranceResource(rowId: string) {
    const value = editingResourceQuantities[rowId];
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      alert("Bitte gib eine gültige Menge ein.");
      return;
    }

    setUpdatingResourceRowId(rowId);

    const { error } = await supabase
      .from("fragrance_resources")
      .update({ quantity_per_unit: parsed })
      .eq("id", rowId);

    if (error) {
      console.error("Fehler beim Aktualisieren der Duft-Ressource:", error);
      alert("Ressourcenmenge konnte nicht aktualisiert werden.");
      setUpdatingResourceRowId(null);
      return;
    }

    setFragranceResources((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, quantityPerUnit: parsed } : row,
      ),
    );

    setUpdatingResourceRowId(null);
  }

  async function deleteFragranceResource(rowId: string) {
    setDeletingResourceRowId(rowId);

    const { error } = await supabase
      .from("fragrance_resources")
      .delete()
      .eq("id", rowId);

    if (error) {
      console.error("Fehler beim Löschen der Duft-Ressource:", error);
      alert("Ressourcenzuordnung konnte nicht gelöscht werden.");
      setDeletingResourceRowId(null);
      return;
    }

    setFragranceResources((prev) => prev.filter((row) => row.id !== rowId));
    setDeletingResourceRowId(null);
  }

  const selectedFragrance = useMemo(
    () =>
      fragrances.find((fragrance) => fragrance.id === selectedFragranceId) ??
      null,
    [fragrances, selectedFragranceId],
  );

  const selectedFragranceAccords = useMemo(() => {
    return fragranceAccords
      .filter((entry) => entry.fragranceId === selectedFragranceId)
      .sort((a, b) => b.percentage - a.percentage);
  }, [fragranceAccords, selectedFragranceId]);

  const selectedFragranceResources = useMemo(() => {
    return fragranceResources
      .filter((entry) => entry.fragranceId === selectedFragranceId)
      .sort((a, b) => b.quantityPerUnit - a.quantityPerUnit);
  }, [fragranceResources, selectedFragranceId]);

  const accordMap = useMemo(
    () => new Map(accords.map((accord) => [accord.id, accord])),
    [accords],
  );

  const resourceMap = useMemo(
    () => new Map(resources.map((resource) => [resource.id, resource])),
    [resources],
  );

  const rawMaterialMap = useMemo(
    () =>
      new Map(rawMaterials.map((rawMaterial) => [rawMaterial.id, rawMaterial])),
    [rawMaterials],
  );

  const accordCostPer100UnitsMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const accord of accords) {
      const componentsForAccord = accordComponents.filter(
        (component) => component.accordId === accord.id,
      );

      const cost = componentsForAccord.reduce((sum, component) => {
        const rawMaterial = rawMaterialMap.get(component.rawMaterialId);
        if (!rawMaterial) return sum;
        return (
          sum + (rawMaterial.costPerUnitCents * component.percentage) / 100
        );
      }, 0);

      map.set(accord.id, cost);
    }

    return map;
  }, [accords, accordComponents, rawMaterialMap]);

  const selectedFragrancePercentageSum = useMemo(() => {
    return selectedFragranceAccords.reduce(
      (sum, entry) => sum + entry.percentage,
      0,
    );
  }, [selectedFragranceAccords]);

  const selectedFragranceMaterialCostPer100UnitsCents = useMemo(() => {
    return selectedFragranceAccords.reduce((sum, entry) => {
      const accordCost = accordCostPer100UnitsMap.get(entry.accordId) ?? 0;
      return sum + (accordCost * entry.percentage) / 100;
    }, 0);
  }, [selectedFragranceAccords, accordCostPer100UnitsMap]);

  const selectedFragranceResourceCostPerUnitCents = useMemo(() => {
    return selectedFragranceResources.reduce((sum, entry) => {
      const resource = resourceMap.get(entry.resourceId);
      if (!resource) return sum;
      return sum + resource.costPerUnitCents * entry.quantityPerUnit;
    }, 0);
  }, [selectedFragranceResources, resourceMap]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Fragrance Formulas</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/accords" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Accords</Link>
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Duft wählen</label>
          <select
            value={selectedFragranceId}
            onChange={(e) => setSelectedFragranceId(e.target.value)}
            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          >
            <option value="">Bitte wählen</option>
            {fragrances.map((fragrance) => (
              <option key={fragrance.id} value={fragrance.id}>
                {fragrance.name}
              </option>
            ))}
          </select>

          {selectedFragrance && (
            <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
              <p><span className="font-medium text-[#3A3530]">Name:</span> {selectedFragrance.name}</p>
              <p><span className="font-medium text-[#3A3530]">Größe:</span> {selectedFragrance.sizeMl} ml</p>
              <p><span className="font-medium text-[#3A3530]">Accord-Summe:</span> {selectedFragrancePercentageSum.toFixed(4)}%</p>
              <p><span className="font-medium text-[#3A3530]">Materialkosten-Basis:</span> {centsToEuroString(selectedFragranceMaterialCostPer100UnitsCents)} €</p>
              <p><span className="font-medium text-[#3A3530]">Ressourcenkosten pro Einheit:</span> {centsToEuroString(selectedFragranceResourceCostPerUnitCents)} €</p>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Accord hinzufügen</h2>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Accord</label>
              <select
                value={selectedAccordId}
                onChange={(e) => setSelectedAccordId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {accords
                  .filter((accord) => accord.isActive)
                  .map((accord) => (
                    <option key={accord.id} value={accord.id}>
                      {accord.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Anteil in %</label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={fragranceAccordPercentage}
                onChange={(e) => setFragranceAccordPercentage(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <button
              onClick={addFragranceAccord}
              disabled={savingRelation}
              className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {savingRelation ? "Bitte warten..." : "Accord hinzufügen"}
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Ressource hinzufügen</h2>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Ressource</label>
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Menge pro Duft-Einheit</label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={resourceQuantityPerUnit}
                onChange={(e) => setResourceQuantityPerUnit(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <button
              onClick={addFragranceResource}
              disabled={savingResourceRelation}
              className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {savingResourceRelation ? "Bitte warten..." : "Ressource hinzufügen"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Accord-Rezept des Dufts</h2>

            {selectedFragranceAccords.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Accorde hinterlegt.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedFragranceAccords.map((entry) => {
                  const accord = accordMap.get(entry.accordId);
                  const accordCost = accordCostPer100UnitsMap.get(entry.accordId) ?? 0;
                  const costContribution = (accordCost * entry.percentage) / 100;

                  return (
                    <div key={entry.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-[#0A0A0A]">
                            {accord?.name ?? "Unbekannter Accord"}
                          </h3>
                          <p className="text-xs text-[#9E9890] mt-1">
                            Beitrag Materialkosten: {centsToEuroString(costContribution)} €
                          </p>
                        </div>

                        <div className="w-44">
                          <input
                            type="number"
                            min={0}
                            step="0.0001"
                            value={editingAccordPercentages[entry.id] ?? ""}
                            onChange={(e) =>
                              setEditingAccordPercentages((prev) => ({
                                ...prev,
                                [entry.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          />

                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => updateFragranceAccord(entry.id)}
                              disabled={updatingAccordRowId === entry.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1 text-xs font-medium hover:bg-[#F0EDE8]"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => deleteFragranceAccord(entry.id)}
                              disabled={deletingAccordRowId === entry.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1 text-xs font-medium hover:bg-[#F0EDE8]"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-2xl border border-dashed border-[#C5C0B8] bg-[#F0EDE8] p-4">
                  <p className="text-xs text-[#6E6860]">
                    Accord-Summe: <span className="font-semibold text-[#3A3530]">{selectedFragrancePercentageSum.toFixed(4)}%</span>
                  </p>
                  <p className="text-xs text-[#6E6860]">
                    Materialkosten-Basis: <span className="font-semibold text-[#3A3530]">{centsToEuroString(selectedFragranceMaterialCostPer100UnitsCents)} €</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Ressourcen-Rezept des Dufts</h2>

            {selectedFragranceResources.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Ressourcen hinterlegt.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedFragranceResources.map((entry) => {
                  const resource = resourceMap.get(entry.resourceId);
                  const costContribution = resource
                    ? resource.costPerUnitCents * entry.quantityPerUnit
                    : 0;

                  return (
                    <div key={entry.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-[#0A0A0A]">
                            {resource?.name ?? "Unbekannte Ressource"}
                          </h3>
                          <p className="text-xs text-[#9E9890] mt-1">
                            Kostenbeitrag: {centsToEuroString(costContribution)} €
                          </p>
                          <p className="text-xs text-[#9E9890]">
                            Einheit: {resource?.unit ?? "—"}
                          </p>
                        </div>

                        <div className="w-44">
                          <input
                            type="number"
                            min={0}
                            step="0.0001"
                            value={editingResourceQuantities[entry.id] ?? ""}
                            onChange={(e) =>
                              setEditingResourceQuantities((prev) => ({
                                ...prev,
                                [entry.id]: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          />

                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => updateFragranceResource(entry.id)}
                              disabled={updatingResourceRowId === entry.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1 text-xs font-medium hover:bg-[#F0EDE8]"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => deleteFragranceResource(entry.id)}
                              disabled={deletingResourceRowId === entry.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1 text-xs font-medium hover:bg-[#F0EDE8]"
                            >
                              Entfernen
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-2xl border border-dashed border-[#C5C0B8] bg-[#F0EDE8] p-4">
                  <p className="text-xs text-[#6E6860]">
                    Ressourcenkosten pro Einheit: <span className="font-semibold text-[#3A3530]">{centsToEuroString(selectedFragranceResourceCostPerUnitCents)} €</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
