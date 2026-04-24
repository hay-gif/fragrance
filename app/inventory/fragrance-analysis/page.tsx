"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fragrance = {
  id: string;
  name: string;
  sizeMl: number;
  status: "draft" | "active";
  isPublic: boolean;
};

type Accord = {
  id: string;
  name: string;
};

type FragranceAccord = {
  fragranceId: string;
  accordId: string;
  percentage: number;
};

type AccordComponent = {
  accordId: string;
  rawMaterialId: string;
  percentage: number;
};

type RawMaterial = {
  id: string;
  name: string;
  inciLabelName: string;
};

type RawMaterialSubstance = {
  id: string;
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
  notes: string;
};

type FlattenedRawMaterial = {
  rawMaterialId: string;
  name: string;
  inciLabelName: string;
  effectivePercentage: number;
};

type FlattenedSubstance = {
  key: string;
  substanceName: string;
  inciName: string;
  totalPercentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
  sourceRawMaterials: string[];
};

type DbFragranceRow = {
  id: string;
  name: string;
  size_ml: number;
  status: "draft" | "active";
  is_public: boolean;
};

type DbAccordRow = {
  id: string;
  name: string;
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

type DbRawMaterialRow = {
  id: string;
  name: string;
  inci_label_name: string | null;
};

type DbRawMaterialSubstanceRow = {
  id: string;
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage: number;
  is_allergen: boolean;
  is_declarable: boolean;
  notes: string | null;
};

export default function FragranceAnalysisPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [accords, setAccords] = useState<Accord[]>([]);
  const [fragranceAccords, setFragranceAccords] = useState<FragranceAccord[]>(
    [],
  );
  const [accordComponents, setAccordComponents] = useState<AccordComponent[]>(
    [],
  );
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [rawMaterialSubstances, setRawMaterialSubstances] = useState<
    RawMaterialSubstance[]
  >([]);
  const [selectedFragranceId, setSelectedFragranceId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [
        fragrancesResult,
        accordsResult,
        fragranceAccordsResult,
        accordComponentsResult,
        rawMaterialsResult,
        rawMaterialSubstancesResult,
      ] = await Promise.all([
        supabase
          .from("fragrances")
          .select("id, name, size_ml, status, is_public")
          .order("created_at", { ascending: false }),
        supabase
          .from("accords")
          .select("id, name")
          .order("name", { ascending: true }),
        supabase
          .from("fragrance_accords")
          .select("fragrance_id, accord_id, percentage"),
        supabase
          .from("accord_components")
          .select("accord_id, raw_material_id, percentage"),
        supabase
          .from("raw_materials")
          .select("id, name, inci_label_name")
          .order("name", { ascending: true }),
        supabase
          .from("raw_material_substances")
          .select(
            "id, raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable, notes",
          ),
      ]);

      if (fragrancesResult.error) {
        console.error("Fehler beim Laden der Düfte:", fragrancesResult.error);
        setLoading(false);
        return;
      }
      if (accordsResult.error) {
        console.error("Fehler beim Laden der Accorde:", accordsResult.error);
        setLoading(false);
        return;
      }
      if (fragranceAccordsResult.error) {
        console.error(
          "Fehler beim Laden der Duft-Accorde:",
          fragranceAccordsResult.error,
        );
        setLoading(false);
        return;
      }
      if (accordComponentsResult.error) {
        console.error(
          "Fehler beim Laden der Accord-Komponenten:",
          accordComponentsResult.error,
        );
        setLoading(false);
        return;
      }
      if (rawMaterialsResult.error) {
        console.error(
          "Fehler beim Laden der Rohstoffe:",
          rawMaterialsResult.error,
        );
        setLoading(false);
        return;
      }
      if (rawMaterialSubstancesResult.error) {
        console.error(
          "Fehler beim Laden der Rohstoff-Stoffe:",
          rawMaterialSubstancesResult.error,
        );
        setLoading(false);
        return;
      }

      const mappedFragrances: Fragrance[] = (fragrancesResult.data ?? []).map(
        (row: DbFragranceRow) => ({
          id: row.id,
          name: row.name,
          sizeMl: row.size_ml,
          status: row.status,
          isPublic: row.is_public,
        }),
      );

      const mappedAccords: Accord[] = (accordsResult.data ?? []).map(
        (row: DbAccordRow) => ({
          id: row.id,
          name: row.name,
        }),
      );

      const mappedFragranceAccords: FragranceAccord[] = (
        fragranceAccordsResult.data ?? []
      ).map((row: DbFragranceAccordRow) => ({
        fragranceId: row.fragrance_id,
        accordId: row.accord_id,
        percentage: Number(row.percentage),
      }));

      const mappedAccordComponents: AccordComponent[] = (
        accordComponentsResult.data ?? []
      ).map((row: DbAccordComponentRow) => ({
        accordId: row.accord_id,
        rawMaterialId: row.raw_material_id,
        percentage: Number(row.percentage),
      }));

      const mappedRawMaterials: RawMaterial[] = (
        rawMaterialsResult.data ?? []
      ).map((row: DbRawMaterialRow) => ({
        id: row.id,
        name: row.name,
        inciLabelName: row.inci_label_name ?? "",
      }));

      const mappedRawMaterialSubstances: RawMaterialSubstance[] = (
        rawMaterialSubstancesResult.data ?? []
      ).map((row: DbRawMaterialSubstanceRow) => ({
        id: row.id,
        rawMaterialId: row.raw_material_id,
        substanceName: row.substance_name,
        inciName: row.inci_name ?? "",
        percentage: Number(row.percentage),
        isAllergen: row.is_allergen,
        isDeclarable: row.is_declarable,
        notes: row.notes ?? "",
      }));

      setFragrances(mappedFragrances);
      setAccords(mappedAccords);
      setFragranceAccords(mappedFragranceAccords);
      setAccordComponents(mappedAccordComponents);
      setRawMaterials(mappedRawMaterials);
      setRawMaterialSubstances(mappedRawMaterialSubstances);

      if (mappedFragrances.length > 0) {
        setSelectedFragranceId(mappedFragrances[0].id);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const selectedFragrance = useMemo(
    () =>
      fragrances.find((fragrance) => fragrance.id === selectedFragranceId) ??
      null,
    [fragrances, selectedFragranceId],
  );

  const accordMap = useMemo(
    () => new Map(accords.map((accord) => [accord.id, accord])),
    [accords],
  );

  const rawMaterialMap = useMemo(
    () => new Map(rawMaterials.map((material) => [material.id, material])),
    [rawMaterials],
  );

  const selectedFormula = useMemo(() => {
    return fragranceAccords
      .filter((entry) => entry.fragranceId === selectedFragranceId)
      .sort((a, b) => b.percentage - a.percentage);
  }, [fragranceAccords, selectedFragranceId]);

  const formulaPercentageSum = useMemo(() => {
    return selectedFormula.reduce((sum, entry) => sum + entry.percentage, 0);
  }, [selectedFormula]);

  const flattenedRawMaterials = useMemo<FlattenedRawMaterial[]>(() => {
    const usage = new Map<
      string,
      { name: string; inciLabelName: string; effectivePercentage: number }
    >();

    for (const fragranceAccord of selectedFormula) {
      const componentsForAccord = accordComponents.filter(
        (component) => component.accordId === fragranceAccord.accordId,
      );

      for (const component of componentsForAccord) {
        const rawMaterial = rawMaterialMap.get(component.rawMaterialId);
        if (!rawMaterial) continue;

        const effectivePercentage =
          (fragranceAccord.percentage * component.percentage) / 100;

        const existing = usage.get(component.rawMaterialId);

        if (!existing) {
          usage.set(component.rawMaterialId, {
            name: rawMaterial.name,
            inciLabelName: rawMaterial.inciLabelName,
            effectivePercentage,
          });
          continue;
        }

        existing.effectivePercentage += effectivePercentage;
      }
    }

    return Array.from(usage.entries())
      .map(([rawMaterialId, value]) => ({
        rawMaterialId,
        name: value.name,
        inciLabelName: value.inciLabelName,
        effectivePercentage: value.effectivePercentage,
      }))
      .sort((a, b) => b.effectivePercentage - a.effectivePercentage);
  }, [selectedFormula, accordComponents, rawMaterialMap]);

  const flattenedSubstances = useMemo<FlattenedSubstance[]>(() => {
    const aggregated = new Map<
      string,
      {
        substanceName: string;
        inciName: string;
        totalPercentage: number;
        isAllergen: boolean;
        isDeclarable: boolean;
        sourceRawMaterials: Set<string>;
      }
    >();

    for (const rawMaterialUsage of flattenedRawMaterials) {
      const substancesForRawMaterial = rawMaterialSubstances.filter(
        (substance) =>
          substance.rawMaterialId === rawMaterialUsage.rawMaterialId,
      );

      for (const substance of substancesForRawMaterial) {
        const effectiveSubstancePercentage =
          (rawMaterialUsage.effectivePercentage * substance.percentage) / 100;

        const key = `${
          substance.inciName.trim() || substance.substanceName.trim()
        }::${substance.isAllergen ? "1" : "0"}::${
          substance.isDeclarable ? "1" : "0"
        }`;

        const existing = aggregated.get(key);

        if (!existing) {
          aggregated.set(key, {
            substanceName: substance.substanceName,
            inciName: substance.inciName,
            totalPercentage: effectiveSubstancePercentage,
            isAllergen: substance.isAllergen,
            isDeclarable: substance.isDeclarable,
            sourceRawMaterials: new Set([rawMaterialUsage.name]),
          });
          continue;
        }

        existing.totalPercentage += effectiveSubstancePercentage;
        existing.sourceRawMaterials.add(rawMaterialUsage.name);
      }
    }

    return Array.from(aggregated.entries())
      .map(([key, value]) => ({
        key,
        substanceName: value.substanceName,
        inciName: value.inciName,
        totalPercentage: value.totalPercentage,
        isAllergen: value.isAllergen,
        isDeclarable: value.isDeclarable,
        sourceRawMaterials: Array.from(value.sourceRawMaterials).sort(),
      }))
      .sort((a, b) => b.totalPercentage - a.totalPercentage);
  }, [flattenedRawMaterials, rawMaterialSubstances]);

  const allergenSubstances = useMemo(() => {
    return flattenedSubstances.filter((substance) => substance.isAllergen);
  }, [flattenedSubstances]);

  const declarableSubstances = useMemo(() => {
    return flattenedSubstances.filter((substance) => substance.isDeclarable);
  }, [flattenedSubstances]);

  const stats = useMemo(() => {
    return {
      accordsInFormula: selectedFormula.length,
      rawMaterialsInFormula: flattenedRawMaterials.length,
      substancesInFormula: flattenedSubstances.length,
      allergensInFormula: allergenSubstances.length,
      declarablesInFormula: declarableSubstances.length,
    };
  }, [
    selectedFormula,
    flattenedRawMaterials,
    flattenedSubstances,
    allergenSubstances,
    declarableSubstances,
  ]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Fragrance Analysis</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/fragrance-formulas" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Fragrance Formulas</Link>
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
            Duft auswählen
          </label>
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
              <p><span className="font-medium text-[#3A3530]">Duft:</span> {selectedFragrance.name}</p>
              <p><span className="font-medium text-[#3A3530]">Größe:</span> {selectedFragrance.sizeMl} ml</p>
              <p><span className="font-medium text-[#3A3530]">Status:</span> {selectedFragrance.status}</p>
              <p><span className="font-medium text-[#3A3530]">Öffentlich:</span> {selectedFragrance.isPublic ? "Ja" : "Nein"}</p>
              <p><span className="font-medium text-[#3A3530]">Formel-Summe:</span> {formulaPercentageSum.toFixed(4)}%</p>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Accorde</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.accordsInFormula}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Rohstoffe</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.rawMaterialsInFormula}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Stoffe</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.substancesInFormula}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Allergene</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.allergensInFormula}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Deklarierbar</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.declarablesInFormula}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Accorde im Duft</h2>

            {selectedFormula.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Für diesen Duft sind keine Accorde hinterlegt.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedFormula.map((entry) => {
                  const accord = accordMap.get(entry.accordId);

                  return (
                    <div
                      key={`${entry.fragranceId}-${entry.accordId}`}
                      className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4"
                    >
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        {accord?.name ?? "Unbekannter Accord"}
                      </h3>
                      <p className="text-xs text-[#9E9890] mt-1">
                        Anteil im Duft: {entry.percentage.toFixed(4)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Aufgelöste Rohstoffe</h2>

            {flattenedRawMaterials.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Rohstoffe aufgelöst.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {flattenedRawMaterials.map((rawMaterial) => (
                  <div
                    key={rawMaterial.rawMaterialId}
                    className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4"
                  >
                    <h3 className="text-sm font-semibold text-[#0A0A0A]">{rawMaterial.name}</h3>
                    <p className="text-xs text-[#9E9890] mt-1">
                      Effektiver Anteil: {rawMaterial.effectivePercentage.toFixed(4)}%
                    </p>
                    <p className="text-xs text-[#9E9890]">
                      INCI Label: {rawMaterial.inciLabelName || "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Alle Stoffe / Bestandteile</h2>

            {flattenedSubstances.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Stoffe aufgelöst.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {flattenedSubstances.map((substance) => (
                  <div key={substance.key} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <h3 className="text-sm font-semibold text-[#0A0A0A]">{substance.substanceName}</h3>
                    <p className="text-xs text-[#9E9890] mt-1">INCI: {substance.inciName || "—"}</p>
                    <p className="text-xs text-[#9E9890]">Gesamtanteil: {substance.totalPercentage.toFixed(6)}%</p>
                    <p className="text-xs text-[#9E9890]">Allergen: {substance.isAllergen ? "Ja" : "Nein"}</p>
                    <p className="text-xs text-[#9E9890]">deklarationsrelevant: {substance.isDeclarable ? "Ja" : "Nein"}</p>
                    <p className="mt-2 text-xs text-[#6E6860]">Quellen: {substance.sourceRawMaterials.join(", ")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Allergene</h2>

              {allergenSubstances.length === 0 ? (
                <p className="mt-4 text-sm text-[#6E6860]">
                  Keine Allergene gefunden oder noch nicht gepflegt.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {allergenSubstances.map((substance) => (
                    <div key={substance.key} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">{substance.substanceName}</h3>
                      <p className="text-xs text-[#9E9890] mt-1">INCI: {substance.inciName || "—"}</p>
                      <p className="text-xs text-[#9E9890]">Gesamtanteil: {substance.totalPercentage.toFixed(6)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Deklarationsrelevante Stoffe</h2>

              {declarableSubstances.length === 0 ? (
                <p className="mt-4 text-sm text-[#6E6860]">
                  Keine deklarationsrelevanten Stoffe gefunden oder noch nicht gepflegt.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {declarableSubstances.map((substance) => (
                    <div key={substance.key} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">{substance.substanceName}</h3>
                      <p className="text-xs text-[#9E9890] mt-1">INCI: {substance.inciName || "—"}</p>
                      <p className="text-xs text-[#9E9890]">Gesamtanteil: {substance.totalPercentage.toFixed(6)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
