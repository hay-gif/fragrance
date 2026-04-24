"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  generateInciList,
  formatInciString,
  type RawMaterialSubstance,
  type InciListResult,
} from "@/lib/inciGenerator";

type FragranceAccordRow = {
  accord_id: string;
  percentage: number;
};

type AccordRow = {
  id: string;
  name: string;
};

type RawMaterialAccordRow = {
  raw_material_id: string;
  percentage_in_accord: number;
};

type RawMaterialRow = {
  id: string;
  name: string;
};

type SubstanceRow = {
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage_in_material: number | null;
  is_allergen: boolean;
  is_declarable: boolean;
};

export default function InciPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [fragranceName, setFragranceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [fragranceId, setFragranceId] = useState("");

  const [productType, setProductType] = useState<"leave_on" | "rinse_off">(
    "leave_on",
  );
  const [result, setResult] = useState<InciListResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFragrance() {
      const resolvedParams = await params;
      setFragranceId(resolvedParams.id);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("fragrances")
        .select("id, name, owner_id")
        .eq("id", resolvedParams.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      if (data.owner_id !== user.id) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setFragranceName(data.name);
      setLoading(false);
    }

    loadFragrance();
  }, [params]);

  async function generateInci() {
    setGenerating(true);
    setError("");
    setResult(null);

    // 1. Fragrance Accords laden
    const { data: fragranceAccords, error: faError } = await supabase
      .from("fragrance_accords")
      .select("accord_id, percentage")
      .eq("fragrance_id", fragranceId);

    if (faError || !fragranceAccords?.length) {
      setError("Keine Accorde für diesen Duft gefunden.");
      setGenerating(false);
      return;
    }

    const accordIds = fragranceAccords.map(
      (row: FragranceAccordRow) => row.accord_id,
    );

    // 2. Accord-Namen laden
    const { data: accordRows } = await supabase
      .from("accords")
      .select("id, name")
      .in("id", accordIds);

    const accordMap = new Map(
      (accordRows ?? []).map((row: AccordRow) => [row.id, row.name]),
    );

    // 3. Rohstoff-Accord-Verknüpfung laden
    const { data: rawMaterialAccords } = await supabase
      .from("accord_raw_materials")
      .select("raw_material_id, percentage_in_accord, accord_id")
      .in("accord_id", accordIds);

    if (!rawMaterialAccords?.length) {
      setError(
        "Keine Rohstoff-Verknüpfungen für die Accorde gefunden. Bitte erst im Inventory unter Accords die Rohstoff-Anteile pflegen.",
      );
      setGenerating(false);
      return;
    }

    const rawMaterialIds = Array.from(
      new Set(
        rawMaterialAccords.map(
          (row: RawMaterialAccordRow & { accord_id: string }) =>
            row.raw_material_id,
        ),
      ),
    );

    // 4. Rohstoff-Daten laden
    const { data: rawMaterials } = await supabase
      .from("raw_materials")
      .select("id, name")
      .in("id", rawMaterialIds);

    const rawMaterialMap = new Map(
      (rawMaterials ?? []).map((row: RawMaterialRow) => [row.id, row.name]),
    );

    // 5. Substanzen der Rohstoffe laden
    const { data: substances } = await supabase
      .from("raw_material_substances")
      .select(
        "raw_material_id, substance_name, inci_name, percentage_in_material, is_allergen, is_declarable",
      )
      .in("raw_material_id", rawMaterialIds);

    if (!substances?.length) {
      setError(
        "Keine Substanzen für die Rohstoffe gefunden. Bitte erst im Inventory die Rohstoff-Substanzen pflegen.",
      );
      setGenerating(false);
      return;
    }

    // 6. Effektive Prozentsätze berechnen
    const fragranceAccordMap = new Map(
      fragranceAccords.map((row: FragranceAccordRow) => [
        row.accord_id,
        row.percentage,
      ]),
    );

    const substanceInputs: RawMaterialSubstance[] = [];

    for (const rma of rawMaterialAccords as (RawMaterialAccordRow & {
      accord_id: string;
    })[]) {
      const fragrancePercent = fragranceAccordMap.get(rma.accord_id) ?? 0;
      // Rohstoff-Anteil in Gesamtformel: (accord% in Duft) * (rohstoff% in accord) / 100
      const rawMaterialPercentInFormula =
        (fragrancePercent * rma.percentage_in_accord) / 100;

      const rawMaterialName =
        rawMaterialMap.get(rma.raw_material_id) ?? rma.raw_material_id;

      const rawMaterialSubstances = (
        substances as SubstanceRow[]
      ).filter(
        (s) => s.raw_material_id === rma.raw_material_id,
      );

      for (const substance of rawMaterialSubstances) {
        substanceInputs.push({
          rawMaterialId: rma.raw_material_id,
          rawMaterialName,
          rawMaterialPercentInFormula,
          substanceName: substance.substance_name,
          inciName: substance.inci_name ?? substance.substance_name,
          percentInRawMaterial: substance.percentage_in_material ?? 100,
          isAllergen: substance.is_allergen,
          isDeclarable: substance.is_declarable,
        });
      }
    }

    const inciResult = generateInciList(substanceInputs, productType);
    setResult(inciResult);
    setGenerating(false);
  }

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

  if (notAllowed) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white border border-[#E5E0D8] p-6">
          <h1 className="text-3xl font-bold text-[#0A0A0A]">Kein Zugriff</h1>
          <Link href="/my-fragrances" className="mt-4 inline-block text-sm text-[#6E6860] underline">
            Zurück
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8 relative">
        <Link
          href={`/fragrance/${fragranceId}/edit`}
          className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-sm transition-all hover:bg-white/20"
        >
          ← Zurück
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="mt-2 text-3xl font-bold text-white">INCI-Generator</h1>
        <p className="mt-1 text-sm text-white/50">{fragranceName}</p>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Einstellungen</h2>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
              Produkttyp (für Allergen-Schwellenwert)
            </label>
            <select
              value={productType}
              onChange={(e) =>
                setProductType(e.target.value as "leave_on" | "rinse_off")
              }
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="leave_on">
                Leave-on (Parfüm, Creme) – Schwelle: 0,001%
              </option>
              <option value="rinse_off">
                Rinse-off (Duschgel, Shampoo) – Schwelle: 0,01%
              </option>
            </select>
          </div>

          <button
            onClick={generateInci}
            disabled={generating}
            className="mt-6 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:opacity-40"
          >
            {generating ? "Generiere..." : "INCI-Liste generieren"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {result && (
          <>
            <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">INCI-Liste (Etikett)</h2>
              <p className="mt-2 text-xs text-[#9E9890]">
                Absteigend nach Anteil sortiert. Für Inhaltsstoffe unter 1% ist
                beliebige Reihenfolge zulässig.
              </p>

              <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] p-4">
                <p className="text-sm font-mono leading-relaxed text-[#3A3530]">
                  {formatInciString(result.ingredients)}
                </p>
              </div>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    formatInciString(result.ingredients),
                  )
                }
                className="mt-3 rounded-full border border-[#E5E0D8] px-5 py-2 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
              >
                Kopieren
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">
                Allergene (deklarationspflichtig)
              </h2>
              <p className="mt-1 text-xs text-[#9E9890]">
                Gesamt: {result.totalAllergenPercent.toFixed(4)}%
              </p>

              {result.allergenList.length === 0 ? (
                <p className="mt-3 text-sm text-[#9E9890]">
                  Keine deklarationspflichtigen Allergene über der Schwelle.
                </p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {result.allergenList.map((name) => (
                    <li
                      key={name}
                      className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm font-mono text-[#3A3530]"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
              <h2 className="text-base font-semibold text-[#0A0A0A]">
                Alle Inhaltsstoffe (Detail)
              </h2>

              <div className="mt-4 space-y-2">
                {result.ingredients.map((ingredient) => (
                  <div
                    key={ingredient.inciName}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-mono font-semibold text-[#0A0A0A]">
                          {ingredient.inciName.toUpperCase()}
                        </p>
                        {ingredient.substanceName !== ingredient.inciName && (
                          <p className="mt-0.5 text-xs text-[#9E9890]">
                            {ingredient.substanceName}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-[#C5C0B8]">
                          Rohstoffe: {ingredient.rawMaterials.join(", ")}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0A0A0A]">
                          {ingredient.totalPercentage.toFixed(4)}%
                        </p>
                        <div className="mt-1 flex flex-wrap justify-end gap-1">
                          {ingredient.isAllergen && (
                            <span className="rounded-full border border-[#E5E0D8] px-2 py-0.5 text-xs text-[#9E9890]">
                              Allergen
                            </span>
                          )}
                          {ingredient.requiresDeclaration && (
                            <span className="rounded-full border border-orange-400 px-2 py-0.5 text-xs text-orange-600">
                              Pflichtangabe
                            </span>
                          )}
                          {ingredient.isDeclarable && (
                            <span className="rounded-full border border-[#E5E0D8] px-2 py-0.5 text-xs text-[#9E9890]">
                              Deklarierbar
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
