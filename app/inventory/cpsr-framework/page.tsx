"use client";

// CPSR-Rahmenwerk – Vorab genehmigte Rohstoff-Palette
// Alle Mischungen, die ausschließlich Rohstoffe aus diesem Rahmen
// und innerhalb der definierten Höchstkonzentrationen verwenden,
// gelten als sicherheitsbewertet (Framework-CPSR).

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";
import { calculateMoS, DEFAULT_EXPOSURE_FINE_FRAGRANCE } from "@/lib/cpsr";

type RawMaterial = {
  id: string;
  name: string;
  inci_label_name: string | null;
  recommended_max_percentage: number | null;
};

type Framework = {
  id: string;
  name: string;
  description: string | null;
  productType: string;
  isActive: boolean;
  createdAt: string;
};

type FrameworkMaterial = {
  id: string;
  frameworkId: string;
  rawMaterialId: string;
  rawMaterialName: string;
  inciName: string | null;
  maxConcentrationPercent: number;
  calculatedMos: number | null;
  notes: string | null;
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  fine_fragrance: "Parfüm / EdP (Leave-on)",
  body_leave_on: "Body Leave-on",
  rinse_off: "Rinse-off (Duschgel, Shampoo)",
  fabric: "Textilerfrischer",
};

export default function CpsrFrameworkPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [frameworkMaterials, setFrameworkMaterials] = useState<FrameworkMaterial[]>([]);
  const [allRawMaterials, setAllRawMaterials] = useState<RawMaterial[]>([]);

  // Framework erstellen
  const [showNewFramework, setShowNewFramework] = useState(false);
  const [newFrameworkName, setNewFrameworkName] = useState("");
  const [newFrameworkDesc, setNewFrameworkDesc] = useState("");
  const [newFrameworkType, setNewFrameworkType] = useState("fine_fragrance");
  const [savingFramework, setSavingFramework] = useState(false);

  // Material hinzufügen
  const [addRmId, setAddRmId] = useState("");
  const [addMaxConc, setAddMaxConc] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [msg, setMsg] = useState("");

  // Rezeptur prüfen
  const [checkMode, setCheckMode] = useState(false);
  const [checkIngredients, setCheckIngredients] = useState<{ rmId: string; concentration: string }[]>([
    { rmId: "", concentration: "" },
  ]);
  const [checkResult, setCheckResult] = useState<{
    approved: boolean;
    issues: string[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      const profile = await getOwnProfile();
      if (!profile || !["admin", "production"].includes(profile.role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      const [{ data: fwRows }, { data: rmRows }] = await Promise.all([
        supabase.from("cpsr_frameworks").select("*").order("created_at", { ascending: false }),
        supabase.from("raw_materials").select("id, name, inci_label_name, recommended_max_percentage").eq("is_active", true).order("name"),
      ]);

      setFrameworks(
        (fwRows ?? []).map((r: {
          id: string; name: string; description: string | null;
          product_type: string; is_active: boolean; created_at: string;
        }) => ({
          id: r.id, name: r.name, description: r.description,
          productType: r.product_type, isActive: r.is_active, createdAt: r.created_at,
        }))
      );
      setAllRawMaterials(rmRows ?? []);

      if ((fwRows ?? []).length > 0) {
        const firstId = (fwRows as { id: string }[])[0].id;
        setSelectedFrameworkId(firstId);
        await loadFrameworkMaterials(firstId, rmRows ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function loadFrameworkMaterials(frameworkId: string, rmList?: RawMaterial[]) {
    const { data } = await supabase
      .from("cpsr_framework_materials")
      .select("id, framework_id, raw_material_id, max_concentration_percent, calculated_mos, notes")
      .eq("framework_id", frameworkId)
      .order("max_concentration_percent", { ascending: false });

    const rm = rmList ?? allRawMaterials;
    const rmMap = new Map(rm.map((r) => [r.id, r]));

    setFrameworkMaterials(
      (data ?? []).map((r: {
        id: string; framework_id: string; raw_material_id: string;
        max_concentration_percent: number; calculated_mos: number | null; notes: string | null;
      }) => ({
        id: r.id,
        frameworkId: r.framework_id,
        rawMaterialId: r.raw_material_id,
        rawMaterialName: rmMap.get(r.raw_material_id)?.name ?? r.raw_material_id,
        inciName: rmMap.get(r.raw_material_id)?.inci_label_name ?? null,
        maxConcentrationPercent: r.max_concentration_percent,
        calculatedMos: r.calculated_mos,
        notes: r.notes,
      }))
    );
  }

  async function createFramework() {
    if (!newFrameworkName.trim()) return;
    setSavingFramework(true);
    const { data, error } = await supabase
      .from("cpsr_frameworks")
      .insert({ name: newFrameworkName.trim(), description: newFrameworkDesc || null, product_type: newFrameworkType })
      .select("*")
      .single();
    if (!error && data) {
      const fw: Framework = {
        id: data.id, name: data.name, description: data.description,
        productType: data.product_type, isActive: data.is_active, createdAt: data.created_at,
      };
      setFrameworks((prev) => [fw, ...prev]);
      setSelectedFrameworkId(fw.id);
      setFrameworkMaterials([]);
      setShowNewFramework(false);
      setNewFrameworkName("");
      setNewFrameworkDesc("");
    }
    setSavingFramework(false);
  }

  async function addMaterial() {
    if (!selectedFrameworkId || !addRmId || !addMaxConc) return;
    setAddingMaterial(true);
    setMsg("");

    const maxConc = parseFloat(addMaxConc);
    if (isNaN(maxConc) || maxConc <= 0 || maxConc > 100) {
      setMsg("Konzentration muss zwischen 0 und 100 liegen.");
      setAddingMaterial(false);
      return;
    }

    // MoS vorab berechnen wenn Toxikologie-Daten vorhanden
    let calculatedMos: number | null = null;
    const rm = allRawMaterials.find((r) => r.id === addRmId);
    if (rm) {
      const { data: toxRows } = await supabase
        .from("substance_toxicology_profiles")
        .select("noael_mg_per_kg_bw_day")
        .ilike("inci_name", `%${rm.inci_label_name ?? rm.name}%`)
        .limit(1);
      const noael = (toxRows ?? [])[0]?.noael_mg_per_kg_bw_day;
      if (noael) {
        const mosResult = calculateMoS({
          substanceName: rm.name,
          inciName: rm.inci_label_name ?? rm.name,
          totalPercentInProduct: maxConc,
          noaelMgPerKgBwDay: noael,
        }, DEFAULT_EXPOSURE_FINE_FRAGRANCE);
        calculatedMos = mosResult.mos;
      }
    }

    const { data, error } = await supabase
      .from("cpsr_framework_materials")
      .insert({
        framework_id: selectedFrameworkId,
        raw_material_id: addRmId,
        max_concentration_percent: maxConc,
        calculated_mos: calculatedMos,
        notes: addNotes || null,
      })
      .select("*")
      .single();

    if (error) {
      setMsg(error.code === "23505" ? "Dieser Rohstoff ist bereits im Rahmen." : `Fehler: ${error.message}`);
    } else if (data) {
      setMsg("Rohstoff hinzugefügt.");
      setAddRmId("");
      setAddMaxConc("");
      setAddNotes("");
      await loadFrameworkMaterials(selectedFrameworkId);
    }
    setAddingMaterial(false);
  }

  async function removeMaterial(id: string) {
    await supabase.from("cpsr_framework_materials").delete().eq("id", id);
    setFrameworkMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  function checkRecipe() {
    if (!frameworkMaterials.length) return;
    const issues: string[] = [];
    const approvedIds = new Set(frameworkMaterials.map((m) => m.rawMaterialId));
    const limitsMap = new Map(frameworkMaterials.map((m) => [m.rawMaterialId, m.maxConcentrationPercent]));

    for (const ing of checkIngredients) {
      if (!ing.rmId || !ing.concentration) continue;
      const conc = parseFloat(ing.concentration);
      if (!approvedIds.has(ing.rmId)) {
        const rmName = allRawMaterials.find((r) => r.id === ing.rmId)?.name ?? ing.rmId;
        issues.push(`"${rmName}" ist nicht im genehmigten Rahmen.`);
      } else {
        const maxConc = limitsMap.get(ing.rmId)!;
        const rmName = allRawMaterials.find((r) => r.id === ing.rmId)?.name ?? ing.rmId;
        if (conc > maxConc) {
          issues.push(`"${rmName}": ${conc}% übersteigt die Grenze von ${maxConc}%.`);
        }
      }
    }

    setCheckResult({ approved: issues.length === 0, issues });
  }

  if (authorized === null || loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-[#C9A96E] border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#0A0A0A]">Kein Zugriff</p>
          <p className="mt-1 text-sm text-[#9E9890]">Diese Seite ist nur für Admin und Produktion zugänglich.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[#C9A96E] hover:underline">Zurück zur Startseite</Link>
        </div>
      </main>
    );
  }

  const selectedFramework = frameworks.find((f) => f.id === selectedFrameworkId);

  return (
    <main className="min-h-screen bg-[#FAFAF8]">
      <div className="mx-auto max-w-5xl px-4 py-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/inventory" className="text-xs text-[#9E9890] hover:text-[#0A0A0A]">← Inventar</Link>
            <h1 className="mt-1 text-2xl font-bold text-[#0A0A0A]">CPSR-Rahmenwerk</h1>
            <p className="mt-1 text-sm text-[#9E9890]">
              Vorab genehmigte Rohstoff-Palette · Alle Mischungen innerhalb der Grenzen gelten als sicher
            </p>
          </div>
          <button
            onClick={() => setShowNewFramework(true)}
            className="rounded-full bg-[#0A0A0A] px-4 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-[#1A1A1A] transition-colors"
          >
            + Neues Rahmenwerk
          </button>
        </div>

        {/* Erklärung */}
        <div className="mt-5 rounded-2xl border border-[#C9A96E]/30 bg-[#C9A96E]/5 p-5">
          <p className="text-xs font-semibold text-[#C9A96E] uppercase tracking-wider">Wie funktioniert es?</p>
          <p className="mt-2 text-sm text-[#6E6860] leading-relaxed">
            Definiere eine Palette von bis zu 50+ Rohstoffen mit ihren jeweiligen <strong>Höchstkonzentrationen</strong> in der Fertigformel.
            Für jede Konzentration wird der <strong>MoS (Margin of Safety)</strong> automatisch berechnet.
            Jede Rezeptur, die <em>ausschließlich</em> Rohstoffe aus diesem Rahmen und innerhalb der Grenzen verwendet,
            ist damit automatisch abgesichert – ohne eine separate CPSR-Prüfung für jede Variation.
          </p>
          <p className="mt-2 text-xs text-[#9E9890]">
            Gem. SCCS Notes of Guidance 12th Revision · MoS ≥ 100 gilt als sicher · Additive Effekte muss ein Toxikologe bestätigen.
          </p>
        </div>

        {/* Neues Framework erstellen */}
        {showNewFramework && (
          <div className="mt-5 rounded-2xl border border-[#E5E0D8] bg-white p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Neues Rahmenwerk erstellen</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[#9E9890]">Name *</label>
                <input
                  value={newFrameworkName}
                  onChange={(e) => setNewFrameworkName(e.target.value)}
                  placeholder="z.B. Standard-Palette Fine Fragrance"
                  className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#9E9890]">Produkttyp</label>
                <select
                  value={newFrameworkType}
                  onChange={(e) => setNewFrameworkType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                >
                  {Object.entries(PRODUCT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-[#9E9890]">Beschreibung</label>
              <textarea
                value={newFrameworkDesc}
                onChange={(e) => setNewFrameworkDesc(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#0A0A0A]"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={createFramework}
                disabled={savingFramework || !newFrameworkName.trim()}
                className="rounded-full bg-[#0A0A0A] px-5 py-2 text-xs font-medium uppercase tracking-wider text-white disabled:opacity-40"
              >
                {savingFramework ? "Wird erstellt…" : "Erstellen"}
              </button>
              <button
                onClick={() => setShowNewFramework(false)}
                className="rounded-full border border-[#E5E0D8] px-5 py-2 text-xs text-[#6E6860] hover:border-[#0A0A0A]"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* Sidebar: Framework-Liste */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Rahmenwerke</p>
            {frameworks.length === 0 ? (
              <p className="text-xs text-[#9E9890]">Noch kein Rahmenwerk erstellt.</p>
            ) : (
              frameworks.map((fw) => (
                <button
                  key={fw.id}
                  onClick={async () => {
                    setSelectedFrameworkId(fw.id);
                    setCheckResult(null);
                    await loadFrameworkMaterials(fw.id);
                  }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    selectedFrameworkId === fw.id
                      ? "border-[#0A0A0A] bg-[#0A0A0A] text-white"
                      : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#0A0A0A]"
                  }`}
                >
                  <p className="font-medium truncate">{fw.name}</p>
                  <p className={`text-[10px] mt-0.5 ${selectedFrameworkId === fw.id ? "text-white/60" : "text-[#9E9890]"}`}>
                    {PRODUCT_TYPE_LABELS[fw.productType] ?? fw.productType}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Main: Framework-Details */}
          {selectedFramework ? (
            <div className="space-y-5">

              {/* Framework-Info */}
              <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0A0A0A]">{selectedFramework.name}</h2>
                    <p className="text-xs text-[#9E9890]">{PRODUCT_TYPE_LABELS[selectedFramework.productType]}</p>
                    {selectedFramework.description && (
                      <p className="mt-2 text-sm text-[#6E6860]">{selectedFramework.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      {frameworkMaterials.length} Rohstoffe
                    </span>
                  </div>
                </div>

                {/* Compliance-Zusammenfassung */}
                {frameworkMaterials.length > 0 && (() => {
                  const withMos = frameworkMaterials.filter((m) => m.calculatedMos !== null);
                  const safe = withMos.filter((m) => m.calculatedMos! >= 100);
                  const warn = withMos.filter((m) => m.calculatedMos! < 100 && m.calculatedMos! >= 10);
                  const critical = withMos.filter((m) => m.calculatedMos! < 10);
                  return (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {safe.length > 0 && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                          ✓ {safe.length} sicher (MoS ≥ 100)
                        </span>
                      )}
                      {warn.length > 0 && (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-700">
                          ⚠ {warn.length} prüfen (MoS 10–100)
                        </span>
                      )}
                      {critical.length > 0 && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">
                          ✗ {critical.length} kritisch (MoS &lt; 10)
                        </span>
                      )}
                      {withMos.length < frameworkMaterials.length && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                          {frameworkMaterials.length - withMos.length} ohne Toxikologie-Daten
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Material hinzufügen */}
              <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                <h3 className="text-sm font-semibold text-[#0A0A0A]">Rohstoff hinzufügen</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px_200px_auto]">
                  <select
                    value={addRmId}
                    onChange={(e) => setAddRmId(e.target.value)}
                    className="rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  >
                    <option value="">Rohstoff wählen…</option>
                    {allRawMaterials
                      .filter((rm) => !frameworkMaterials.some((m) => m.rawMaterialId === rm.id))
                      .map((rm) => (
                        <option key={rm.id} value={rm.id}>{rm.name}</option>
                      ))}
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Max. %"
                      min={0}
                      max={100}
                      step={0.1}
                      value={addMaxConc}
                      onChange={(e) => setAddMaxConc(e.target.value)}
                      className="w-full rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                    />
                  </div>
                  <input
                    placeholder="Notizen (optional)"
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                    className="rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                  />
                  <button
                    onClick={addMaterial}
                    disabled={addingMaterial || !addRmId || !addMaxConc}
                    className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-xs font-medium text-white disabled:opacity-40 hover:bg-[#1A1A1A] transition-colors"
                  >
                    {addingMaterial ? "…" : "+ Hinzufügen"}
                  </button>
                </div>
                {msg && <p className="mt-2 text-xs text-[#9E9890]">{msg}</p>}
              </div>

              {/* Material-Liste */}
              {frameworkMaterials.length > 0 && (
                <div className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-[#FAFAF8] text-left text-xs text-[#9E9890]">
                          <th className="px-4 py-3 font-medium">Rohstoff</th>
                          <th className="px-4 py-3 font-medium">INCI</th>
                          <th className="px-4 py-3 font-medium text-right">Max. %</th>
                          <th className="px-4 py-3 font-medium text-right">MoS</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Notizen</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {frameworkMaterials.map((m) => {
                          const mos = m.calculatedMos;
                          const mosColor = mos === null ? "text-[#9E9890]"
                            : mos >= 100 ? "text-green-600 font-semibold"
                            : mos >= 10 ? "text-yellow-600 font-semibold"
                            : "text-red-600 font-semibold";
                          const statusBadge = mos === null
                            ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">Keine Daten</span>
                            : mos >= 100
                            ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">✓ Sicher</span>
                            : mos >= 10
                            ? <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">⚠ Prüfen</span>
                            : <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">✗ Kritisch</span>;
                          return (
                            <tr key={m.id} className="border-b last:border-0">
                              <td className="px-4 py-3 font-medium text-[#0A0A0A]">{m.rawMaterialName}</td>
                              <td className="px-4 py-3 text-xs text-[#6E6860]">{m.inciName ?? "–"}</td>
                              <td className="px-4 py-3 text-right font-mono text-sm">{m.maxConcentrationPercent}%</td>
                              <td className={`px-4 py-3 text-right font-mono text-sm ${mosColor}`}>
                                {mos !== null ? mos.toFixed(1) : "–"}
                              </td>
                              <td className="px-4 py-3">{statusBadge}</td>
                              <td className="px-4 py-3 text-xs text-[#9E9890]">{m.notes ?? "–"}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => removeMaterial(m.id)}
                                  className="text-xs text-red-400 hover:text-red-600"
                                >
                                  Entfernen
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rezeptur prüfen */}
              <div className="rounded-2xl border border-[#E5E0D8] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0A0A0A]">Rezeptur gegen Rahmen prüfen</h3>
                  <button
                    onClick={() => { setCheckMode(!checkMode); setCheckResult(null); }}
                    className="rounded-full border border-[#E5E0D8] px-3 py-1 text-xs hover:border-[#0A0A0A] transition-colors"
                  >
                    {checkMode ? "Schließen" : "Öffnen"}
                  </button>
                </div>
                {checkMode && (
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-[#9E9890]">
                      Gib deine Rezeptur ein – das System prüft ob alle Rohstoffe im Rahmen sind und die Grenzen eingehalten werden.
                    </p>
                    {checkIngredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={ing.rmId}
                          onChange={(e) => setCheckIngredients((prev) => prev.map((x, j) => j === i ? { ...x, rmId: e.target.value } : x))}
                          className="flex-1 rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                        >
                          <option value="">Rohstoff…</option>
                          {allRawMaterials.map((rm) => (
                            <option key={rm.id} value={rm.id}>{rm.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="%"
                          min={0}
                          max={100}
                          step={0.1}
                          value={ing.concentration}
                          onChange={(e) => setCheckIngredients((prev) => prev.map((x, j) => j === i ? { ...x, concentration: e.target.value } : x))}
                          className="w-24 rounded-lg border border-[#E5E0D8] px-3 py-2 text-sm focus:outline-none focus:border-[#0A0A0A]"
                        />
                        {checkIngredients.length > 1 && (
                          <button onClick={() => setCheckIngredients((prev) => prev.filter((_, j) => j !== i))} className="text-xs text-red-400">✕</button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => setCheckIngredients((prev) => [...prev, { rmId: "", concentration: "" }])}
                      className="text-xs text-[#9E9890] hover:text-[#0A0A0A]"
                    >
                      + Zeile hinzufügen
                    </button>
                    <button
                      onClick={checkRecipe}
                      className="block rounded-full bg-[#0A0A0A] px-5 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-[#1A1A1A] transition-colors"
                    >
                      Prüfen
                    </button>
                    {checkResult && (
                      <div className={`rounded-xl border p-4 ${checkResult.approved ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                        {checkResult.approved ? (
                          <p className="text-sm font-semibold text-green-700">
                            ✓ Rezeptur ist im genehmigten Rahmen – Framework-CPSR gilt.
                          </p>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-red-700">✗ Rezeptur außerhalb des Rahmens:</p>
                            <ul className="mt-2 list-disc list-inside space-y-1">
                              {checkResult.issues.map((issue, i) => (
                                <li key={i} className="text-xs text-red-600">{issue}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-[#E5E0D8] p-12 text-center">
              <div>
                <p className="text-sm font-medium text-[#0A0A0A]">Kein Rahmenwerk ausgewählt</p>
                <p className="mt-1 text-xs text-[#9E9890]">Erstelle ein neues Rahmenwerk oder wähle eines aus der Liste.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
