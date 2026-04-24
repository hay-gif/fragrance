"use client";

// PIF – Product Information File
// Gemäß EU-Kosmetikverordnung 1223/2009, Artikel 11 und Anhang I
// Enthält CPSR Part A + Part B, IFRA-Compliance, Allergen-Deklaration
// Export als PDF via window.print()

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateInciList } from "@/lib/inciGenerator";
import type { RawMaterialSubstance as InciSubstance } from "@/lib/inciGenerator";
import { runCPSRPartB, formatMoS, formatSED, mosBadgeColor, mosStatusLabel, EXPOSURE_PRESETS } from "@/lib/cpsr";
import type { SubstanceForCPSR, ExposureParams } from "@/lib/cpsr";
import { checkAllIFRALimits, ifraCategFromProductType } from "@/lib/ifraLimits";
import type { IFRACategory, IFRALimitCheckResult } from "@/lib/ifraLimits";
import { trackPifExport } from "@/lib/analytics";
import { usePageTracking } from "@/hooks/usePageTracking";

// ─── Typen ────────────────────────────────────────────────────────────────────

type Fragrance = {
  id: string;
  name: string;
  description: string;
  category: string;
  sizeMl: number;
  status: string;
};

type RawMaterialSubstance = {
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type ToxicologyProfile = {
  inciName: string;
  substanceName: string;
  casNumber: string;
  noaelMgPerKgBwDay: number | null;
  sourceReference: string;
  toxicologicalEndpoint: string;
  notes: string;
};

type Dossier = {
  productName: string;
  brandName: string;
  responsiblePerson: string;
  responsiblePersonAddress: string;
  intendedUse: string;
  productForm: string;
  targetMarket: string;
  applicationArea: string;
  consumerGroup: string;
  formulaVersion: string;
  nominalContent: string;
  storageConditions: string;
  shelfLifeText: string;
  paoText: string;
  manufacturingSite: string;
  manufacturingMethodSummary: string;
  gmpNotes: string;
  labelClaims: string;
  warningText: string;
  usageText: string;
  cpnpCategory: string;
  cpnpFrameFormulation: string;
  labelInciText: string;
  exposureProductType: string;
  exposureAmountGPerDay: string;
  exposureFrequencyPerDay: string;
  exposureBodyWeightKg: string;
  exposureRetentionFactor: string;
  exposureBioavailabilityFactor: string;
  toxicologyNotes: string;
  mosNotes: string;
  exposureNotes: string;
};

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function productTypeLabel(pt: string) {
  const map: Record<string, string> = {
    fine_fragrance: "Parfüm / Eau de Parfum (Leave-on)",
    body_mist: "Body Mist (Leave-on)",
    alcohol_based_perfume: "Alkohol-basiertes Parfüm",
    body_lotion: "Körperlotion (Leave-on)",
    shower_gel: "Duschgel (Rinse-off)",
  };
  return map[pt] ?? pt;
}

function consumerGroupLabel(g: string) {
  const map: Record<string, string> = {
    general_population: "Allgemeine Bevölkerung",
    adults: "Erwachsene",
    children: "Kinder",
    elderly: "Ältere Menschen",
  };
  return map[g] ?? g;
}

// ─── Sektionskomponente ───────────────────────────────────────────────────────

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="print:break-inside-avoid mb-8">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#C9A96E] mb-3 print:text-black">
        {num} – {title}
      </h2>
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 print:border-gray-300 print:bg-white print:p-4">
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-4 py-1.5 border-b border-white/5 print:border-gray-200 last:border-0">
      <span className="w-52 shrink-0 text-xs text-white/50 print:text-gray-500">{label}</span>
      <span className="text-sm text-white/90 print:text-gray-900">{value || "–"}</span>
    </div>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function PIFPage({ params }: { params: Promise<{ id: string }> }) {
  usePageTracking("pif");
  const [loading, setLoading] = useState(true);
  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [flatSubstances, setFlatSubstances] = useState<RawMaterialSubstance[]>([]);
  const [toxProfiles, setToxProfiles] = useState<ToxicologyProfile[]>([]);
  const [rawMaterialNames, setRawMaterialNames] = useState<Map<string, string>>(new Map());
  const [rawMaterialDocs, setRawMaterialDocs] = useState<{
    id: string;
    rawMaterialId: string;
    documentType: string;
    title: string;
    supplierName: string | null;
    documentVersion: string | null;
    validUntil: string | null;
    fileUrl: string;
    notes: string | null;
  }[]>([]);

  useEffect(() => {
    async function load() {
      const { id } = await params;

      // Fragrance
      const { data: frRow } = await supabase
        .from("fragrances")
        .select("id, name, description, category, size_ml, status")
        .eq("id", id)
        .single();
      if (!frRow) { setLoading(false); return; }

      setFragrance({
        id: frRow.id, name: frRow.name, description: frRow.description ?? "",
        category: frRow.category ?? "", sizeMl: frRow.size_ml, status: frRow.status,
      });

      // Dossier
      const { data: dossierRow } = await supabase
        .from("release_dossiers")
        .select("*")
        .eq("fragrance_id", id)
        .maybeSingle();

      setDossier({
        productName: dossierRow?.product_name ?? frRow.name,
        brandName: dossierRow?.brand_name ?? "",
        responsiblePerson: dossierRow?.responsible_person ?? "",
        responsiblePersonAddress: dossierRow?.responsible_person_address ?? "",
        intendedUse: dossierRow?.intended_use ?? "Parfüm zur äußeren Anwendung auf der Haut.",
        productForm: dossierRow?.product_form ?? "alcohol_based_perfume",
        targetMarket: dossierRow?.target_market ?? "EU",
        applicationArea: dossierRow?.application_area ?? "external_use",
        consumerGroup: dossierRow?.consumer_group ?? "general_population",
        formulaVersion: dossierRow?.formula_version ?? "v1",
        nominalContent: dossierRow?.nominal_content ?? `${frRow.size_ml} ml`,
        storageConditions: dossierRow?.storage_conditions ?? "Kühl, trocken und lichtgeschützt lagern.",
        shelfLifeText: dossierRow?.shelf_life_text ?? "",
        paoText: dossierRow?.pao_text ?? "",
        manufacturingSite: dossierRow?.manufacturing_site ?? "",
        manufacturingMethodSummary: dossierRow?.manufacturing_method_summary ?? "",
        gmpNotes: dossierRow?.gmp_notes ?? "",
        labelClaims: dossierRow?.label_claims ?? "",
        warningText: dossierRow?.warning_text ?? "Nur zur äußeren Anwendung. Kontakt mit Augen vermeiden.",
        usageText: dossierRow?.usage_text ?? "Auf die Haut aufsprühen.",
        cpnpCategory: dossierRow?.cpnp_category ?? "",
        cpnpFrameFormulation: dossierRow?.cpnp_frame_formulation ?? "",
        labelInciText: dossierRow?.label_inci_text ?? "",
        exposureProductType: dossierRow?.exposure_product_type ?? "fine_fragrance",
        exposureAmountGPerDay: String(dossierRow?.exposure_amount_g_per_day ?? "1.0"),
        exposureFrequencyPerDay: String(dossierRow?.exposure_frequency_per_day ?? "2"),
        exposureBodyWeightKg: String(dossierRow?.exposure_body_weight_kg ?? "60"),
        exposureRetentionFactor: String(dossierRow?.exposure_retention_factor ?? "1"),
        exposureBioavailabilityFactor: String(dossierRow?.exposure_bioavailability_factor ?? "0.1"),
        toxicologyNotes: dossierRow?.toxicology_notes ?? "",
        mosNotes: dossierRow?.mos_notes ?? "",
        exposureNotes: dossierRow?.exposure_notes ?? "",
      });

      // Accords → raw materials → substances (Vererbungskette)
      const { data: faRows } = await supabase
        .from("fragrance_accords")
        .select("accord_id, percentage")
        .eq("fragrance_id", id);

      const accordIds = (faRows ?? []).map((r: { accord_id: string }) => r.accord_id);

      const { data: acRows } = await supabase
        .from("accord_components")
        .select("accord_id, raw_material_id, percentage")
        .in("accord_id", accordIds.length > 0 ? accordIds : ["__none__"]);

      const rmIds = [...new Set((acRows ?? []).map((r: { raw_material_id: string }) => r.raw_material_id))];

      const { data: rmRows } = await supabase
        .from("raw_materials")
        .select("id, name")
        .in("id", rmIds.length > 0 ? rmIds : ["__none__"]);

      const rmMap = new Map<string, string>(
        (rmRows ?? []).map((r: { id: string; name: string }) => [r.id, r.name])
      );
      setRawMaterialNames(rmMap);

      // Rohstoff-Dokumente laden (SDS, COA, IFRA, etc.) – Dokumentenvererbung
      const { data: docRows } = await supabase
        .from("raw_material_documents")
        .select("id, raw_material_id, document_type, title, supplier_name, document_version, valid_until, file_url, notes")
        .in("raw_material_id", rmIds.length > 0 ? rmIds : ["__none__"]);

      setRawMaterialDocs(
        (docRows ?? []).map((d: {
          id: string;
          raw_material_id: string;
          document_type: string;
          title: string;
          supplier_name: string | null;
          document_version: string | null;
          valid_until: string | null;
          file_url: string;
          notes: string | null;
        }) => ({
          id: d.id,
          rawMaterialId: d.raw_material_id,
          documentType: d.document_type,
          title: d.title,
          supplierName: d.supplier_name,
          documentVersion: d.document_version,
          validUntil: d.valid_until,
          fileUrl: d.file_url,
          notes: d.notes,
        }))
      );

      const { data: subRows } = await supabase
        .from("raw_material_substances")
        .select("raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable")
        .in("raw_material_id", rmIds.length > 0 ? rmIds : ["__none__"]);

      // Substanzen mit Accordion-Anteilen verrechnen (Vererbungskette)
      const flatList: InciSubstance[] = [];

      for (const fa of (faRows ?? []) as { accord_id: string; percentage: number }[]) {
        const accordPct = fa.percentage; // % des Accords in der Formel
        const components = (acRows ?? []).filter(
          (ac: { accord_id: string }) => ac.accord_id === fa.accord_id
        ) as { accord_id: string; raw_material_id: string; percentage: number }[];

        for (const ac of components) {
          const rmPct = ac.percentage; // % des Rohstoffs im Accord
          const rmPctInFormula = (accordPct * rmPct) / 100;

          const subs = (subRows ?? []).filter(
            (s: { raw_material_id: string }) => s.raw_material_id === ac.raw_material_id
          ) as { raw_material_id: string; substance_name: string; inci_name: string | null; percentage: number; is_allergen: boolean; is_declarable: boolean }[];

          for (const s of subs) {
            flatList.push({
              rawMaterialId: ac.raw_material_id,
              rawMaterialName: rmMap.get(ac.raw_material_id) ?? ac.raw_material_id,
              rawMaterialPercentInFormula: rmPctInFormula,
              substanceName: s.substance_name,
              inciName: s.inci_name ?? s.substance_name,
              percentInRawMaterial: s.percentage,
              isAllergen: s.is_allergen,
              isDeclarable: s.is_declarable,
            });
          }
        }
      }

      // Flatten via INCI-Generator
      const inciResult = generateInciList(flatList, "leave_on");
      setFlatSubstances(
        inciResult.ingredients.map((i) => ({
          rawMaterialId: "",
          substanceName: i.substanceName,
          inciName: i.inciName,
          percentage: i.totalPercentage,
          isAllergen: i.isAllergen,
          isDeclarable: i.isDeclarable,
        }))
      );

      // Toxikologie-Profile
      const inciNames = inciResult.ingredients.map((i) => i.inciName.toLowerCase());
      const { data: toxRows } = await supabase
        .from("substance_toxicology_profiles")
        .select("inci_name, substance_name, cas_number, noael_mg_per_kg_bw_day, source_reference, toxicological_endpoint, notes")
        .in("inci_name", inciNames.length > 0 ? inciNames : ["__none__"]);

      setToxProfiles(
        (toxRows ?? []).map((t: {
          inci_name: string;
          substance_name: string;
          cas_number: string | null;
          noael_mg_per_kg_bw_day: number | null;
          source_reference: string | null;
          toxicological_endpoint: string | null;
          notes: string | null;
        }) => ({
          inciName: t.inci_name,
          substanceName: t.substance_name,
          casNumber: t.cas_number ?? "",
          noaelMgPerKgBwDay: t.noael_mg_per_kg_bw_day,
          sourceReference: t.source_reference ?? "",
          toxicologicalEndpoint: t.toxicological_endpoint ?? "",
          notes: t.notes ?? "",
        }))
      );

      setLoading(false);
    }
    load();
  }, []);

  // ── Expositionsparameter aus Dossier ────────────────────────────────────────
  const exposureParams: ExposureParams = useMemo(() => {
    if (!dossier) return EXPOSURE_PRESETS["fine_fragrance"];
    const pt = dossier.exposureProductType as IFRACategory;
    const preset = EXPOSURE_PRESETS[pt] ?? EXPOSURE_PRESETS["fine_fragrance"];
    return {
      amountGPerEvent: Number(dossier.exposureAmountGPerDay) || preset.amountGPerEvent,
      frequencyPerDay: Number(dossier.exposureFrequencyPerDay) || preset.frequencyPerDay,
      retentionFactor: Number(dossier.exposureRetentionFactor) || preset.retentionFactor,
      bioavailabilityFactor: Number(dossier.exposureBioavailabilityFactor) || preset.bioavailabilityFactor,
      bodyWeightKg: Number(dossier.exposureBodyWeightKg) || 60,
    };
  }, [dossier]);

  // ── CPSR Part B berechnen ────────────────────────────────────────────────────
  const cpsr = useMemo(() => {
    if (!flatSubstances.length) return null;

    const toxMap = new Map(toxProfiles.map((t) => [t.inciName.toLowerCase(), t]));

    const substances: SubstanceForCPSR[] = flatSubstances.map((s) => {
      const tox = toxMap.get(s.inciName.toLowerCase());
      return {
        substanceName: s.substanceName,
        inciName: s.inciName,
        casNumber: tox?.casNumber,
        totalPercentInProduct: s.percentage,
        noaelMgPerKgBwDay: tox?.noaelMgPerKgBwDay ?? null,
        isAllergen: s.isAllergen,
        sourceReference: tox?.sourceReference,
      };
    });

    return runCPSRPartB(substances, exposureParams);
  }, [flatSubstances, toxProfiles, exposureParams]);

  // ── IFRA-Check ───────────────────────────────────────────────────────────────
  const ifraCheck = useMemo(() => {
    if (!flatSubstances.length || !dossier) return null;
    const toxMap = new Map(toxProfiles.map((t) => [t.inciName.toLowerCase(), t]));
    const category = ifraCategFromProductType(dossier.exposureProductType);

    const input = flatSubstances.map((s) => {
      const tox = toxMap.get(s.inciName.toLowerCase());
      return {
        casNumber: tox?.casNumber,
        substanceName: s.substanceName,
        inciName: s.inciName,
        totalPercent: s.percentage,
      };
    });

    return { ...checkAllIFRALimits(input, category), category };
  }, [flatSubstances, toxProfiles, dossier]);

  // ── Allergen-Liste (Leave-on Schwellenwert 0.001%) ───────────────────────────
  const declaredAllergens = useMemo(
    () => flatSubstances.filter((s) => s.isAllergen && s.percentage >= 0.001),
    [flatSubstances]
  );

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40 text-sm">PIF wird geladen…</p>
      </main>
    );
  }

  if (!fragrance || !dossier) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40 text-sm">Produkt nicht gefunden.</p>
      </main>
    );
  }

  const ifraCategory = ifraCheck?.category ?? "fine_fragrance";

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white print:bg-white print:text-black">
      {/* Toolbar (wird beim Drucken ausgeblendet) */}
      <div className="print:hidden sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-4xl flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-4">
            <Link
              href={`/fragrance/${fragrance.id}/dossier`}
              className="text-xs text-white/50 hover:text-white transition-colors"
            >
              ← Zurück zum Dossier
            </Link>
            <span className="text-white/20">|</span>
            <span className="text-xs text-white/70 font-medium">PIF – {dossier.productName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              EU Reg. 1223/2009 · Anhang I
            </span>
            <button
              onClick={() => { if (fragrance) trackPifExport(fragrance.id); window.print(); }}
              className="rounded-full bg-[#C9A96E] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-[#E8C99A] transition-colors"
            >
              Als PDF exportieren
            </button>
          </div>
        </div>
      </div>

      {/* Druckkopf (nur beim Drucken sichtbar) */}
      <div className="hidden print:block border-b border-gray-300 pb-6 mb-8 px-0">
        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Produktinformationsdatei</p>
        <h1 className="text-2xl font-bold text-black">{dossier.productName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          EU-Verordnung 1223/2009 · Anhang I · Erstellt: {today()} · Formelversion: {dossier.formulaVersion}
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10 print:py-0 print:px-0">
        {/* Dokumentkopf – Screen */}
        <div className="print:hidden mb-10">
          <p className="text-[10px] uppercase tracking-widest text-[#C9A96E] mb-2">
            Product Information File · EU Reg. 1223/2009
          </p>
          <h1 className="text-3xl font-bold text-white mb-1">{dossier.productName}</h1>
          <p className="text-sm text-white/50">
            Formelversion {dossier.formulaVersion} · Erstellt {today()} · IFRA-Kategorie: {ifraCategory}
          </p>

          {/* CPSR-Ampel */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className={`rounded-xl border p-4 ${cpsr?.overallAcceptable !== false ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">CPSR MoS</p>
              <p className={`text-lg font-bold ${cpsr?.overallAcceptable !== false ? "text-green-400" : "text-red-400"}`}>
                {cpsr ? (cpsr.overallAcceptable ? "✓ Akzeptabel" : "✗ Kritisch") : "Keine Daten"}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {cpsr?.criticalSubstances.length ?? 0} kritisch · {cpsr?.substancesWithoutNoael.length ?? 0} ohne NOAEL
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${ifraCheck?.allCompliant !== false ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">IFRA 51st</p>
              <p className={`text-lg font-bold ${ifraCheck?.allCompliant !== false ? "text-green-400" : "text-yellow-400"}`}>
                {ifraCheck ? (ifraCheck.allCompliant ? "✓ Konform" : "⚠ Verstöße") : "Keine Daten"}
              </p>
              <p className="text-xs text-white/40 mt-1">
                {ifraCheck?.violations.length ?? 0} Verstöße · {ifraCheck?.prohibitedFound.length ?? 0} verboten
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Allergene</p>
              <p className="text-lg font-bold text-white/90">{declaredAllergens.length}</p>
              <p className="text-xs text-white/40 mt-1">deklarationspflichtig (≥ 0,001%)</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* CPSR PART A – Produktinformation                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <div className="print:hidden mb-6">
          <h2 className="text-lg font-bold text-white">CPSR Part A – Produktinformation</h2>
          <p className="text-xs text-white/40 mt-0.5">Gemäß Anhang I, Teil A der EU-Verordnung 1223/2009</p>
        </div>

        {/* 1. Beschreibung des kosmetischen Mittels */}
        <Section num="A.1" title="Beschreibung des kosmetischen Mittels">
          <Row label="Produktname" value={dossier.productName} />
          <Row label="Markenname / Brand" value={dossier.brandName} />
          <Row label="Produktform" value={productTypeLabel(dossier.productForm)} />
          <Row label="Füllmenge" value={dossier.nominalContent} />
          <Row label="Formelversion" value={dossier.formulaVersion} />
          <Row label="Bestimmungsgemäße Verwendung" value={dossier.intendedUse} />
          <Row label="Anwendungsbereich" value={dossier.applicationArea === "external_use" ? "Äußerliche Anwendung auf der Haut" : dossier.applicationArea} />
          <Row label="Verbrauchergruppe" value={consumerGroupLabel(dossier.consumerGroup)} />
          <Row label="Zielmarkt" value={dossier.targetMarket} />
          <Row label="Anwendungshinweis" value={dossier.usageText} />
          <Row label="Warnhinweise" value={dossier.warningText} />
        </Section>

        {/* 2. Qualitative und quantitative Zusammensetzung */}
        <Section num="A.2" title="Qualitative und quantitative Zusammensetzung">
          {flatSubstances.length === 0 ? (
            <p className="text-sm text-white/40 print:text-gray-400">
              Keine Substanzdaten vorhanden. Bitte Rohstoff-Substanzen pflegen.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 print:border-gray-300">
                      <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium">INCI-Name</th>
                      <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium pr-6">% (Endprodukt)</th>
                      <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium">Funktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatSubstances.map((s) => (
                      <tr key={s.inciName} className="border-b border-white/5 print:border-gray-100">
                        <td className="py-1.5 text-white/90 print:text-gray-900">{s.inciName.toUpperCase()}</td>
                        <td className="py-1.5 text-right pr-6 text-white/70 print:text-gray-600 tabular-nums">
                          {s.percentage.toFixed(4)}
                        </td>
                        <td className="py-1.5 text-white/50 print:text-gray-400">
                          {s.isAllergen ? "Parfüm · Allergen" : "Parfüm"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-white/40 print:text-gray-400">
                INCI-Liste: {flatSubstances.map((s) => s.inciName.toUpperCase()).join(", ")}
              </p>
            </>
          )}
        </Section>

        {/* 3. Physikalisch-chemische Eigenschaften */}
        <Section num="A.3" title="Physikalisch-chemische Eigenschaften">
          <Row label="Produktform" value={productTypeLabel(dossier.productForm)} />
          <Row label="Lösungsmittel" value="Ethanol (vergällt) / Isopropylmyristat" />
          <Row label="Lagerbedingungen" value={dossier.storageConditions} />
          <Row label="Haltbarkeit (ungeöffnet)" value={dossier.shelfLifeText} />
          <Row label="PAO (Period After Opening)" value={dossier.paoText} />
          <p className="mt-3 text-xs text-white/30 print:text-gray-400 italic">
            Physikalisch-chemische Tests (pH, Viskosität, Dichte) sind separat zu dokumentieren und dem Dossier beizufügen.
          </p>
        </Section>

        {/* 4. Mikrobiologische Qualität */}
        <Section num="A.4" title="Mikrobiologische Qualität">
          <p className="text-sm text-white/70 print:text-gray-700 mb-3">
            Alkohol-basierte Produkte (Ethanol-Gehalt &gt; 20%) sind selbstkonservierend gemäß EU-Richtlinie.
            Ein Konservierungstest (Challenge Test) nach ISO 11930 ist empfohlen, kann jedoch für alkoholische
            Parfüms entfallen, sofern der Alkohol-Anteil ≥ 20% beträgt.
          </p>
          <Row label="Konservierungssystem" value="Ethanol (Selbstkonservierung)" />
          <Row label="Anforderungen gemäß" value="ISO 11930 / Anhang V EU-Verordnung 1223/2009" />
        </Section>

        {/* 5. Verunreinigungen, Spuren und Verpackungsmaterial */}
        <Section num="A.5" title="Verunreinigungen, Spuren und Verpackungsmaterial">
          <p className="text-sm text-white/70 print:text-gray-700 mb-3">
            Die verwendeten Rohstoffe entsprechen der pharmazeutischen / kosmetischen Reinheitsklasse.
            Zertifikate der Analyse (CoA) sind für jeden Rohstoff im Dossier hinterlegt.
          </p>
          <p className="text-xs text-white/30 print:text-gray-400 italic">
            Verpackungsmaterial: Spezifikationen und Migrationsnachweise gemäß EU-Kunststoffverordnung
            (EU) 10/2011 sind separat zu dokumentieren.
          </p>
        </Section>

        {/* 6. Normale und vernünftigerweise vorhersehbare Verwendung */}
        <Section num="A.6" title="Normale und vorhersehbare Verwendung">
          <Row label="Verwendung" value={dossier.usageText} />
          <Row label="Anwendungsort" value="Haut (äußerlich)" />
          <Row label="Expositionsdauer" value="Dauerhaft (Leave-on)" />
          <Row label="Verbrauchermenge pro Anwendung" value={`${dossier.exposureAmountGPerDay} g`} />
          <Row label="Anwendungshäufigkeit" value={`${dossier.exposureFrequencyPerDay}× täglich`} />
        </Section>

        {/* 7. Exposition gegenüber dem kosmetischen Mittel */}
        <Section num="A.7" title="Exposition gegenüber dem kosmetischen Mittel">
          <Row label="Produkttyp (IFRA-Kat.)" value={`${productTypeLabel(dossier.exposureProductType)} (${ifraCategory})`} />
          <Row label="Menge pro Anwendung" value={`${exposureParams.amountGPerEvent} g`} />
          <Row label="Häufigkeit pro Tag" value={`${exposureParams.frequencyPerDay}×`} />
          <Row label="Retentionsfaktor (RF)" value={String(exposureParams.retentionFactor)} />
          <Row label="Bioavailabilität (BA)" value={String(exposureParams.bioavailabilityFactor)} />
          <Row label="Körpergewicht (BW)" value={`${exposureParams.bodyWeightKg} kg`} />
          {dossier.exposureNotes && (
            <div className="mt-3 p-3 rounded-lg bg-white/5 print:bg-gray-50">
              <p className="text-xs text-white/60 print:text-gray-600">{dossier.exposureNotes}</p>
            </div>
          )}
        </Section>

        {/* 8. Exposition gegenüber Substanzen */}
        <Section num="A.8" title="Substanzexposition – SED-Berechnung">
          <p className="text-xs text-white/40 print:text-gray-400 mb-3">
            SED = (A × F × C/100 × RF × BA × 1000) / BW · Einheit: mg Substanz / kg KG / Tag
          </p>
          {cpsr && cpsr.substanceResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 print:border-gray-300">
                    <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium">Substanz (INCI)</th>
                    <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium pr-4">% Produkt</th>
                    <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium pr-4">SED (mg/kg/d)</th>
                    <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium pr-4">NOAEL</th>
                    <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium">MoS</th>
                    <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium pl-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cpsr.substanceResults.map((r) => (
                    <tr key={r.inciName} className="border-b border-white/5 print:border-gray-100">
                      <td className="py-1.5 text-white/90 print:text-gray-900">{r.inciName.toUpperCase()}</td>
                      <td className="py-1.5 text-right pr-4 text-white/70 print:text-gray-600 tabular-nums">
                        {r.totalPercentInProduct.toFixed(4)}
                      </td>
                      <td className="py-1.5 text-right pr-4 text-white/70 print:text-gray-600 tabular-nums">
                        {formatSED(r.sed)}
                      </td>
                      <td className="py-1.5 text-right pr-4 text-white/70 print:text-gray-600 tabular-nums">
                        {r.noaelMgPerKgBwDay ?? "–"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${mosBadgeColor(r.mosStatus)} print:bg-transparent print:text-black`}>
                          {formatMoS(r.mos)}
                        </span>
                      </td>
                      <td className="py-1.5 pl-3 text-white/50 print:text-gray-400">
                        {mosStatusLabel(r.mosStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-white/40 print:text-gray-400">
              Keine Toxikologie-Daten vorhanden. Bitte Substanzen mit NOAEL-Werten in den Toxikologie-Profilen hinterlegen.
            </p>
          )}
        </Section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* CPSR PART B – Sicherheitsbewertung                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        <div className="print:hidden mb-6 mt-10">
          <h2 className="text-lg font-bold text-white">CPSR Part B – Sicherheitsbewertung</h2>
          <p className="text-xs text-white/40 mt-0.5">Gemäß Anhang I, Teil B der EU-Verordnung 1223/2009</p>
        </div>

        {/* 9. Sicherheitsbewertung – Gesamtbewertung */}
        <Section num="B.9" title="Sicherheitsbewertung – Gesamtbewertung (MoS)">
          <div className={`mb-4 rounded-xl p-4 ${cpsr?.overallAcceptable !== false ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"} print:bg-gray-100 print:border-gray-300`}>
            <p className={`text-sm font-bold ${cpsr?.overallAcceptable !== false ? "text-green-400" : "text-red-400"} print:text-black`}>
              {cpsr?.overallAcceptable !== false
                ? "Das Produkt ist sicher für die bestimmungsgemäße Verwendung."
                : `Sicherheitsbedenken: ${cpsr?.criticalSubstances.length} Substanz(en) unterschreiten MoS ≥ 100.`}
            </p>
          </div>
          <Row label="MoS-Schwellenwert (SCCS)" value="≥ 100" />
          <Row label="Bewertete Substanzen" value={String(cpsr?.substanceResults.length ?? 0)} />
          <Row label="Davon MoS akzeptabel" value={String(cpsr?.acceptableSubstances.length ?? 0)} />
          <Row label="Davon kritisch (MoS < 100)" value={String(cpsr?.criticalSubstances.length ?? 0)} />
          <Row label="Ohne NOAEL-Daten" value={String(cpsr?.substancesWithoutNoael.length ?? 0)} />
          <Row label="Deklarierbare Allergene" value={String(cpsr?.declarableAllergenCount ?? 0)} />
          <Row label="Gesamtanteil Allergene" value={`${cpsr?.totalAllergenPercent.toFixed(4) ?? "0"} %`} />
          {dossier.mosNotes && (
            <div className="mt-3 p-3 rounded-lg bg-white/5 print:bg-gray-50">
              <p className="text-[10px] uppercase tracking-widest text-white/30 print:text-gray-400 mb-1">Notizen des Bewerters</p>
              <p className="text-xs text-white/60 print:text-gray-600">{dossier.mosNotes}</p>
            </div>
          )}
        </Section>

        {/* 10. IFRA-Compliance */}
        <Section num="B.10" title={`IFRA 51st Amendment – Compliance (Kategorie: ${ifraCategory})`}>
          {ifraCheck && ifraCheck.results.length > 0 ? (
            <>
              <div className={`mb-4 rounded-xl p-4 ${ifraCheck.allCompliant ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"} print:bg-gray-100 print:border-gray-300`}>
                <p className={`text-sm font-bold ${ifraCheck.allCompliant ? "text-green-400" : "text-yellow-400"} print:text-black`}>
                  {ifraCheck.allCompliant
                    ? `IFRA-konform für Kategorie "${ifraCategory}".`
                    : `${ifraCheck.violations.length} IFRA-Verstoß/Verstöße in Kategorie "${ifraCategory}".`}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 print:border-gray-300">
                      <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium">Substanz</th>
                      <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium pr-4">Ist (%)</th>
                      <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium pr-4">Limit (%)</th>
                      <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ifraCheck.results.map((r: IFRALimitCheckResult) => (
                      <tr key={r.casNumber + r.substanceName} className="border-b border-white/5 print:border-gray-100">
                        <td className="py-1.5 text-white/90 print:text-gray-900">{r.substanceName}</td>
                        <td className="py-1.5 text-right pr-4 text-white/70 print:text-gray-600 tabular-nums">
                          {r.actualPercent.toFixed(4)}
                        </td>
                        <td className="py-1.5 text-right pr-4 tabular-nums">
                          {r.prohibited ? (
                            <span className="text-red-400 font-bold print:text-black">Verboten</span>
                          ) : r.limit !== null ? (
                            r.limit.toFixed(4)
                          ) : "–"}
                        </td>
                        <td className="py-1.5">
                          {r.compliant ? (
                            <span className="text-green-400 print:text-black">✓ Konform</span>
                          ) : (
                            <span className="text-red-400 font-bold print:text-black">
                              {r.prohibited ? "✗ Verboten" : `✗ +${r.exceededBy?.toFixed(4)}%`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-white/40 print:text-gray-400">
              Keine IFRA-relevanten Substanzen erkannt (kein CAS-Nummer-Mapping in Toxikologie-Profilen hinterlegt).
            </p>
          )}
        </Section>

        {/* 11. Allergen-Deklaration */}
        <Section num="B.11" title="Allergen-Deklaration (EU 1223/2009 Anhang III)">
          {declaredAllergens.length > 0 ? (
            <>
              <p className="text-xs text-white/40 print:text-gray-400 mb-3">
                Folgende Stoffe müssen gemäß Anhang III der EU-Kosmetikverordnung auf dem Etikett deklariert werden
                (Leave-on: ≥ 0,001%, Rinse-off: ≥ 0,01%):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 print:border-gray-300">
                      <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium">INCI-Name</th>
                      <th className="text-right py-2 text-white/40 print:text-gray-400 font-medium">% (Endprodukt)</th>
                      <th className="text-left py-2 text-white/40 print:text-gray-400 font-medium pl-4">Schwellenwert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {declaredAllergens
                      .sort((a, b) => b.percentage - a.percentage)
                      .map((s) => (
                        <tr key={s.inciName} className="border-b border-white/5 print:border-gray-100">
                          <td className="py-1.5 text-white/90 print:text-gray-900">{s.inciName.toUpperCase()}</td>
                          <td className="py-1.5 text-right text-white/70 print:text-gray-600 tabular-nums">
                            {s.percentage.toFixed(4)}
                          </td>
                          <td className="py-1.5 pl-4 text-white/50 print:text-gray-400">≥ 0,001% (Leave-on)</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-white/40 print:text-gray-400">
                Etikett-INCI: {declaredAllergens.map((s) => s.inciName.toUpperCase()).join(", ")}
              </p>
            </>
          ) : (
            <p className="text-sm text-white/50 print:text-gray-500">
              Keine deklarationspflichtigen Allergene über dem Schwellenwert gefunden.
            </p>
          )}
        </Section>

        {/* 12. Verantwortliche Person & Herstellung */}
        <Section num="B.12" title="Verantwortliche Person und Herstellungsort">
          <Row label="Verantwortliche Person" value={dossier.responsiblePerson} />
          <Row label="Adresse" value={dossier.responsiblePersonAddress} />
          <Row label="Herstellungsort" value={dossier.manufacturingSite} />
          <Row label="Herstellungsverfahren" value={dossier.manufacturingMethodSummary} />
          <Row label="GMP-Hinweise" value={dossier.gmpNotes} />
          <Row label="CPNP-Kategorie" value={dossier.cpnpCategory} />
          <Row label="CPNP-Rahmenformulierung" value={dossier.cpnpFrameFormulation} />
        </Section>

        {/* 13. Erklärung des Sicherheitsbewerters */}
        <Section num="B.13" title="Erklärung des Sicherheitsbewerters (Toxikologe)">
          <div className="rounded-xl border border-dashed border-white/20 print:border-gray-300 p-6 print:p-4">
            <p className="text-sm text-white/60 print:text-gray-600 mb-6">
              Ich bestätige, dass die vorliegende Sicherheitsbewertung nach aktuellem wissenschaftlichen
              Erkenntnisstand und nach bestem Wissen und Gewissen durchgeführt wurde. Die Anforderungen
              gemäß Artikel 10 der EU-Verordnung 1223/2009 wurden eingehalten.
            </p>
            <div className="grid grid-cols-2 gap-8 print:gap-4 mt-4">
              <div>
                <div className="h-12 border-b border-white/20 print:border-gray-400 mb-2" />
                <p className="text-xs text-white/40 print:text-gray-400">Unterschrift · Name · Qualifikation</p>
              </div>
              <div>
                <div className="h-12 border-b border-white/20 print:border-gray-400 mb-2" />
                <p className="text-xs text-white/40 print:text-gray-400">Ort, Datum</p>
              </div>
            </div>
            {dossier.toxicologyNotes && (
              <div className="mt-6 p-3 rounded-lg bg-white/5 print:bg-gray-50">
                <p className="text-[10px] uppercase tracking-widest text-white/30 print:text-gray-400 mb-1">Notizen des Bewerters</p>
                <p className="text-xs text-white/60 print:text-gray-600">{dossier.toxicologyNotes}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-[10px] text-white/30 print:text-gray-400 italic">
            Gem. Art. 10(1)(c) EU-Verordnung 1223/2009 muss die Sicherheitsbewertung von einer
            qualifizierten Person (Toxikologe, Apotheker, Arzt o.ä.) unterzeichnet werden.
          </p>
        </Section>

        {/* Anhang: Rohstoff-Begleitdokumentation */}
        {rawMaterialDocs.length > 0 && (
          <Section num="Anhang" title="Rohstoff-Begleitdokumentation (SDS / COA / IFRA)">
            <p className="mb-4 text-xs text-white/50 print:text-gray-500">
              Folgende Dokumente liegen für die verwendeten Rohstoffe vor und sind Teil dieses PIF.
              Alle Originaldokumente sind im System hinterlegt und auf Anfrage verfügbar.
            </p>
            {(() => {
              // Dokumente nach Rohstoff gruppieren
              const byRm = new Map<string, typeof rawMaterialDocs>();
              for (const doc of rawMaterialDocs) {
                if (!byRm.has(doc.rawMaterialId)) byRm.set(doc.rawMaterialId, []);
                byRm.get(doc.rawMaterialId)!.push(doc);
              }
              const DOC_TYPE_LABELS: Record<string, string> = {
                sds: "SDS",
                ifra: "IFRA-Zertifikat",
                coa: "COA",
                allergen_statement: "Allergen-Statement",
                specification: "Spezifikation",
              };
              return Array.from(byRm.entries()).map(([rmId, docs]) => (
                <div key={rmId} className="mb-4 last:mb-0">
                  <p className="text-xs font-semibold text-[#C9A96E] print:text-black mb-2">
                    {rawMaterialNames.get(rmId) ?? rmId}
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 print:border-gray-200 text-white/40 print:text-gray-500">
                        <th className="py-1 pr-3 font-medium text-left">Typ</th>
                        <th className="py-1 pr-3 font-medium text-left">Titel</th>
                        <th className="py-1 pr-3 font-medium text-left">Version</th>
                        <th className="py-1 pr-3 font-medium text-left">Gültig bis</th>
                        <th className="py-1 font-medium text-left print:hidden">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((doc) => (
                        <tr key={doc.id} className="border-b border-white/5 print:border-gray-100">
                          <td className="py-1.5 pr-3 font-medium text-white/80 print:text-gray-800">
                            {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType.toUpperCase()}
                          </td>
                          <td className="py-1.5 pr-3 text-white/70 print:text-gray-700">{doc.title}</td>
                          <td className="py-1.5 pr-3 text-white/50 print:text-gray-500">{doc.documentVersion ?? "–"}</td>
                          <td className="py-1.5 pr-3 text-white/50 print:text-gray-500">
                            {doc.validUntil ? new Date(doc.validUntil).toLocaleDateString("de-DE") : "–"}
                          </td>
                          <td className="py-1.5 print:hidden">
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#C9A96E] hover:underline"
                              >
                                Öffnen ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ));
            })()}
          </Section>
        )}

        {/* Fehlende Dokumente Warnung */}
        {rawMaterialNames.size > 0 && rawMaterialDocs.length === 0 && (
          <Section num="Anhang" title="Rohstoff-Begleitdokumentation">
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 print:border-yellow-400 print:bg-yellow-50">
              <p className="text-sm font-medium text-yellow-400 print:text-yellow-800">
                ⚠ Keine Rohstoff-Dokumente hinterlegt
              </p>
              <p className="mt-1 text-xs text-yellow-400/70 print:text-yellow-700">
                Für die verwendeten {rawMaterialNames.size} Rohstoffe liegen noch keine SDS-, COA- oder IFRA-Dokumente vor.
                Gemäß Art. 11 EU-Verordnung 1223/2009 müssen SDS-Dokumente für alle Inhaltsstoffe im PIF enthalten sein.
              </p>
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-white/10 print:border-gray-200 text-center print:mt-6">
          <p className="text-xs text-white/30 print:text-gray-400">
            PIF erstellt mit Fragrance OS · {today()} · EU-Verordnung 1223/2009 Anhang I ·
            IFRA 51st Amendment (2023) · SCCS Notes of Guidance 12th Revision
          </p>
          <p className="text-[10px] text-white/20 print:text-gray-300 mt-1">
            Dieses Dokument ist kein Ersatz für eine professionelle toxikologische Bewertung.
            Vor Markteinführung muss ein qualifizierter Sicherheitsbewerter das CPSR unterzeichnen.
          </p>
        </div>
      </div>
    </main>
  );
}
