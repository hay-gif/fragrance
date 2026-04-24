"use client";

// EU-konformes Produktetikett gemäß EU-Kosmetikverordnung 1223/2009, Art. 19
// Druckfertig als DIN A6 (105×148mm) oder Aufkleber (100×60mm)
// Export via window.print()

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { generateInciList } from "@/lib/inciGenerator";
import type { RawMaterialSubstance } from "@/lib/inciGenerator";
import { trackLabelPrint } from "@/lib/analytics";

type LabelData = {
  productName: string;
  brandName: string;
  sizeMl: number;
  responsiblePerson: string;
  responsiblePersonAddress: string;
  countryOfOrigin: string;
  batchCode: string;
  paoMonths: string;
  shelfLifeText: string;
  warningText: string;
  usageText: string;
  labelClaims: string;
  inciList: string;
  allergenList: string[];
  fragranceId: string;
};

type LabelFormat = "a6_landscape" | "sticker_100x60" | "sticker_70x70" | "a6_portrait";

const FORMAT_LABELS: Record<LabelFormat, string> = {
  a6_landscape: "A6 quer (148×105mm) — Faltschachtel",
  a6_portrait: "A6 hoch (105×148mm) — Beipackzettel",
  sticker_100x60: "Aufkleber 100×60mm — Flasche",
  sticker_70x70: "Aufkleber 70×70mm — Parfümflakon",
};

// EU-Pflichtangaben nach Art. 19 EU 1223/2009
// 1. Name / Firma des verantwortlichen Unternehmens + Adresse
// 2. Nenninhalt
// 3. Mindesthaltbarkeitsdatum oder PAO
// 4. Besondere Vorsichtsmaßnahmen
// 5. Chargencode (für Rückverfolgbarkeit)
// 6. Verwendungszweck
// 7. INCI-Inhaltsstoffliste

function PaoSymbol({ months }: { months: string }) {
  const m = Number(months) || 12;
  return (
    <span
      className="inline-flex items-center justify-center border-2 border-current rounded-sm font-bold leading-none"
      style={{ width: 36, height: 36, fontSize: 10 }}
      title={`Period After Opening: ${m} Monate`}
    >
      {m}M
    </span>
  );
}

function RecycleSymbol() {
  return <span title="Bitte Verpackung recyceln">♻</span>;
}

export default function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const [loading, setLoading] = useState(true);
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [format, setFormat] = useState<LabelFormat>("sticker_100x60");

  useEffect(() => {
    async function load() {
      const { id } = await params;

      const { data: frRow } = await supabase
        .from("fragrances")
        .select("id, name, size_ml")
        .eq("id", id)
        .single();
      if (!frRow) { setLoading(false); return; }

      const { data: dossierRow } = await supabase
        .from("release_dossiers")
        .select("*")
        .eq("fragrance_id", id)
        .maybeSingle();

      // Vererbungskette: accord → rawmaterial → substance
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

      const { data: subRows } = await supabase
        .from("raw_material_substances")
        .select("raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable")
        .in("raw_material_id", rmIds.length > 0 ? rmIds : ["__none__"]);

      const flatList: RawMaterialSubstance[] = [];
      for (const fa of (faRows ?? []) as { accord_id: string; percentage: number }[]) {
        const components = (acRows ?? []).filter(
          (ac: { accord_id: string }) => ac.accord_id === fa.accord_id
        ) as { accord_id: string; raw_material_id: string; percentage: number }[];
        for (const ac of components) {
          const rmPctInFormula = (fa.percentage * ac.percentage) / 100;
          const subs = (subRows ?? []).filter(
            (s: { raw_material_id: string }) => s.raw_material_id === ac.raw_material_id
          ) as { raw_material_id: string; substance_name: string; inci_name: string | null; percentage: number; is_allergen: boolean; is_declarable: boolean }[];
          for (const s of subs) {
            flatList.push({
              rawMaterialId: ac.raw_material_id,
              rawMaterialName: rmMap.get(ac.raw_material_id) ?? "",
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

      const inciResult = generateInciList(flatList, "leave_on");

      // INCI-String aufbauen, Allergene *-markiert
      const allergenSet = new Set(inciResult.allergenList.map((a) => a.toUpperCase()));
      const inciString = inciResult.ingredients
        .map((i) => {
          const name = i.inciName.toUpperCase();
          return allergenSet.has(name) ? `${name}*` : name;
        })
        .join(", ");

      // Batch-Code generieren (JJMMXX-Format)
      const now = new Date();
      const batchCode = dossierRow?.batch_code_scheme ||
        `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${frRow.id.slice(0, 4).toUpperCase()}`;

      setLabelData({
        productName: dossierRow?.product_name ?? frRow.name,
        brandName: dossierRow?.brand_name ?? "",
        sizeMl: frRow.size_ml,
        responsiblePerson: dossierRow?.responsible_person ?? "",
        responsiblePersonAddress: dossierRow?.responsible_person_address ?? "",
        countryOfOrigin: dossierRow?.target_market ?? "Germany",
        batchCode,
        paoMonths: String(dossierRow?.pao_text?.replace(/[^0-9]/g, "") || "24"),
        shelfLifeText: dossierRow?.shelf_life_text ?? "",
        warningText: dossierRow?.warning_text ?? "Nur zur äußerlichen Anwendung. Kontakt mit Augen vermeiden. Von Kindern fernhalten.",
        usageText: dossierRow?.usage_text ?? "Auf die Haut aufsprühen.",
        labelClaims: dossierRow?.label_claims ?? "",
        inciList: inciString || "ALCOHOL, PARFUM, AQUA",
        allergenList: inciResult.allergenList,
        fragranceId: frRow.id,
      });

      setLoading(false);
    }
    load();
  }, []);

  const allergenNote = useMemo(() => {
    if (!labelData?.allergenList.length) return "";
    return `* Kann allergische Reaktionen hervorrufen. Enthält: ${labelData.allergenList.join(", ")}.`;
  }, [labelData]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40 text-sm">Etikett wird generiert…</p>
      </main>
    );
  }

  if (!labelData) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-white/40 text-sm">Produkt nicht gefunden.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] print:bg-white print:text-black">
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/10">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-4">
            <Link href={`/fragrance/${labelData.fragranceId}/dossier`} className="text-xs text-white/50 hover:text-white">
              ← Dossier
            </Link>
            <span className="text-white/20">|</span>
            <span className="text-xs text-white/70 font-medium">Etikett – {labelData.productName}</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as LabelFormat)}
              className="rounded-lg border border-white/20 bg-transparent px-3 py-1.5 text-xs text-white/70 focus:outline-none"
            >
              {(Object.entries(FORMAT_LABELS) as [LabelFormat, string][]).map(([val, label]) => (
                <option key={val} value={val} className="bg-[#0A0A0A]">{label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                trackLabelPrint(labelData.fragranceId);
                window.print();
              }}
              className="rounded-full bg-[#C9A96E] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-[#E8C99A] transition-colors"
            >
              Drucken / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Vorschau-Bereich */}
      <div className="mx-auto max-w-3xl px-6 py-10 print:py-0 print:px-0">
        {/* Screen-Info */}
        <div className="print:hidden mb-8">
          <p className="text-[10px] uppercase tracking-widest text-[#C9A96E] mb-2">EU-konformes Produktetikett</p>
          <h1 className="text-2xl font-bold text-white">{labelData.productName}</h1>
          <p className="text-sm text-white/50 mt-1">Format: {FORMAT_LABELS[format]} · Gem. EU 1223/2009 Art. 19</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {labelData.allergenList.length > 0 && (
              <span className="rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-[10px] text-yellow-400">
                {labelData.allergenList.length} Allergene deklariert
              </span>
            )}
            <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-white/50">
              INCI: {labelData.inciList.split(", ").length} Inhaltsstoffe
            </span>
            <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-white/50">
              PAO: {labelData.paoMonths}M
            </span>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────── */}
        {/* DAS EIGENTLICHE ETIKETT — wird gedruckt            */}
        {/* ──────────────────────────────────────────────────── */}

        <div
          id="label-print-area"
          className={`
            bg-white text-black border-2 border-dashed border-gray-300 print:border-none
            font-sans
            ${format === "a6_landscape" ? "w-[148mm] min-h-[105mm]" : ""}
            ${format === "a6_portrait" ? "w-[105mm] min-h-[148mm]" : ""}
            ${format === "sticker_100x60" ? "w-[100mm] min-h-[60mm]" : ""}
            ${format === "sticker_70x70" ? "w-[70mm] min-h-[70mm]" : ""}
            mx-auto p-[5mm] box-border
          `}
          style={{ fontSize: format.includes("sticker") ? "6.5pt" : "8pt", lineHeight: 1.35 }}
        >
          {/* ── Kopfzeile: Marke + Produktname + Volumen ── */}
          <div className="flex items-start justify-between mb-[2mm]">
            <div>
              {labelData.brandName && (
                <p className="font-bold tracking-widest uppercase" style={{ fontSize: "7pt" }}>
                  {labelData.brandName}
                </p>
              )}
              <p className="font-bold" style={{ fontSize: format.includes("sticker") ? "9pt" : "11pt", lineHeight: 1.1 }}>
                {labelData.productName}
              </p>
              {labelData.labelClaims && (
                <p className="italic text-gray-500" style={{ fontSize: "6pt" }}>{labelData.labelClaims}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="font-bold">{labelData.sizeMl} ml</p>
              <p className="text-gray-500" style={{ fontSize: "6pt" }}>e {labelData.sizeMl} mL</p>
            </div>
          </div>

          {/* ── Verwendungshinweis ── */}
          {labelData.usageText && (
            <p className="text-gray-600 mb-[1.5mm]">{labelData.usageText}</p>
          )}

          {/* ── Trennlinie ── */}
          <div className="border-t border-gray-300 my-[1.5mm]" />

          {/* ── INCI-Inhaltsstoffe ── */}
          <div className="mb-[1.5mm]">
            <span className="font-semibold">Ingredients: </span>
            <span className="text-gray-700 break-words">{labelData.inciList}</span>
          </div>

          {/* ── Allergen-Hinweis (wenn vorhanden) ── */}
          {allergenNote && (
            <p className="text-gray-600 mb-[1.5mm]" style={{ fontSize: "5.5pt" }}>
              {allergenNote}
            </p>
          )}

          {/* ── Warnhinweise ── */}
          <div className="mb-[1.5mm]">
            <p className="text-gray-700">{labelData.warningText}</p>
          </div>

          {/* ── Trennlinie ── */}
          <div className="border-t border-gray-300 my-[1.5mm]" />

          {/* ── Fußzeile: Verantwortliche Person, Batch, PAO ── */}
          <div className="flex items-end justify-between gap-2">
            <div className="flex-1">
              {labelData.responsiblePerson && (
                <p className="font-medium">{labelData.responsiblePerson}</p>
              )}
              {labelData.responsiblePersonAddress && (
                <p className="text-gray-600">{labelData.responsiblePersonAddress}</p>
              )}
              <div className="flex items-center gap-3 mt-[1mm]">
                <span className="text-gray-500">Lot: <strong>{labelData.batchCode}</strong></span>
                {labelData.shelfLifeText && (
                  <span className="text-gray-500">MHD: {labelData.shelfLifeText}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <PaoSymbol months={labelData.paoMonths} />
              <RecycleSymbol />
            </div>
          </div>

          {/* ── EU-Konformitätsvermerk (klein) ── */}
          <div className="mt-[1mm] pt-[1mm] border-t border-gray-200">
            <p className="text-gray-400" style={{ fontSize: "5pt" }}>
              Gem. EU-Verordnung 1223/2009. Made in {labelData.countryOfOrigin || "EU"}.
              {labelData.allergenList.length > 0 && " * Allergene gemäß Anhang III."}
            </p>
          </div>
        </div>

        {/* Hinweis unter Etikett */}
        <div className="print:hidden mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/50">
          <p className="font-medium text-white/70 mb-2">Pflichtangaben nach EU 1223/2009 Art. 19</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Name + Adresse der verantwortlichen Person {labelData.responsiblePerson ? "✓" : "⚠ fehlt"}</li>
            <li>Nenninhalt: {labelData.sizeMl} ml ✓</li>
            <li>PAO: {labelData.paoMonths} Monate ✓</li>
            <li>Chargennummer: {labelData.batchCode} ✓</li>
            <li>INCI-Liste: {labelData.inciList ? "✓" : "⚠ keine Substanzdaten"}</li>
            <li>Allergene: {labelData.allergenList.length > 0 ? `${labelData.allergenList.length} deklariert ✓` : "keine ≥ Schwellenwert"}</li>
            <li>Warnhinweise: {labelData.warningText ? "✓" : "⚠ fehlt"}</li>
          </ul>
        </div>
      </div>

      {/* Print-CSS: Nur Etikett drucken */}
      <style>{`
        @media print {
          @page {
            size: ${
              format === "a6_landscape" ? "148mm 105mm" :
              format === "a6_portrait" ? "105mm 148mm" :
              format === "sticker_100x60" ? "100mm 60mm" :
              "70mm 70mm"
            };
            margin: 0;
          }
          body > * { display: none !important; }
          #label-print-area {
            display: block !important;
            border: none !important;
            margin: 0 !important;
            padding: 5mm !important;
          }
        }
      `}</style>
    </main>
  );
}
