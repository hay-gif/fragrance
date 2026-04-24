"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Resource = {
  id: string;
  createdAt: string;
  name: string;
  category: string;
  unit: string;
  costPerUnitCents: number;
  stockQuantity: number;
  minimumStockQuantity: number;
  notes: string;
};

type DbResourceRow = {
  id: string;
  created_at: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit_cents: number;
  stock_quantity: number;
  minimum_stock_quantity: number;
  notes: string | null;
};

type StockLevel = "critical" | "low" | "ok";

function getStockLevel(r: Resource): StockLevel {
  if (r.stockQuantity < r.minimumStockQuantity) return "critical";
  if (r.minimumStockQuantity > 0 && r.stockQuantity <= r.minimumStockQuantity * 1.2) return "low";
  return "ok";
}

function centsToEur(cents: number, decimals = 4): string {
  return (cents / 100).toFixed(decimals);
}

const SUB_PAGES = [
  { href: "/inventory/raw-materials", label: "Rohstoffe", desc: "INCI, Lieferanten, Spezifikationen" },
  { href: "/inventory/accords", label: "Akkorde", desc: "Duftkompositionen & Formeln" },
  { href: "/inventory/purchases", label: "Einkäufe", desc: "Bestellungen & Lieferantenrechnungen" },
  { href: "/inventory/movements", label: "Bewegungen", desc: "Ein-/Ausgänge & Anpassungen" },
  { href: "/inventory/reorder-planning", label: "Nachbestellung", desc: "Bedarfsplanung & Vorschläge" },
  { href: "/inventory/cpsr-framework", label: "CPSR-Rahmen", desc: "Sicherheits-Framework", gold: true },
  { href: "/inventory/toxicology", label: "Toxikologie", desc: "NOAEL, NESIL, MoS-Werte" },
  { href: "/inventory/compliance-rules", label: "IFRA-Compliance", desc: "Grenzwerte & Konzentrationen" },
  { href: "/inventory/fragrance-formulas", label: "Formeln", desc: "Rezepturen & Zusammensetzungen" },
  { href: "/inventory/fragrance-analysis", label: "Analyse", desc: "Kosten & Margen je Duft" },
  { href: "/inventory/raw-material-documents", label: "Dokumente", desc: "SDS, COA, IFRA-Zertifikate" },
  { href: "/inventory/order-material-demand", label: "Materialbedarf", desc: "Bestand vs. Bestellbedarf" },
];

export default function InventoryPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "critical" | "low" | "ok">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [unit, setUnit] = useState("ml");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [minimumStockQuantity, setMinimumStockQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const [editingStocks, setEditingStocks] = useState<
    Record<string, { stock: string; minimum: string }>
  >({});

  useEffect(() => {
    async function loadResources() {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) { setLoading(false); return; }

      const mapped: Resource[] = (data ?? []).map((row: DbResourceRow) => ({
        id: row.id,
        createdAt: row.created_at,
        name: row.name,
        category: row.category,
        unit: row.unit,
        costPerUnitCents: Number(row.cost_per_unit_cents),
        stockQuantity: Number(row.stock_quantity),
        minimumStockQuantity: Number(row.minimum_stock_quantity ?? 0),
        notes: row.notes ?? "",
      }));

      const initialEditing: Record<string, { stock: string; minimum: string }> = {};
      for (const r of mapped) {
        initialEditing[r.id] = { stock: String(r.stockQuantity), minimum: String(r.minimumStockQuantity) };
      }

      setResources(mapped);
      setEditingStocks(initialEditing);
      setLoading(false);
    }
    loadResources();
  }, []);

  async function addResource() {
    const parsedCost = Number(costPerUnit);
    const parsedStock = Number(stockQuantity);
    const parsedMinimum = Number(minimumStockQuantity || "0");

    if (!name.trim()) { alert("Bitte gib einen Namen ein."); return; }
    if (Number.isNaN(parsedCost) || parsedCost < 0) { alert("Bitte gib gültige Kosten ein."); return; }
    if (Number.isNaN(parsedStock) || parsedStock < 0) { alert("Bitte gib einen gültigen Bestand ein."); return; }

    setSaving(true);
    const id = crypto.randomUUID();

    const { error } = await supabase.from("resources").insert({
      id,
      name: name.trim(),
      category: category.trim() || "general",
      unit: unit.trim() || "ml",
      cost_per_unit_cents: Math.round(parsedCost * 100),
      stock_quantity: parsedStock,
      minimum_stock_quantity: parsedMinimum,
      notes: notes.trim(),
    });

    if (error) { alert("Ressource konnte nicht gespeichert werden."); setSaving(false); return; }

    const newResource: Resource = {
      id,
      createdAt: new Date().toISOString(),
      name: name.trim(),
      category: category.trim() || "general",
      unit: unit.trim() || "ml",
      costPerUnitCents: Math.round(parsedCost * 100),
      stockQuantity: parsedStock,
      minimumStockQuantity: parsedMinimum,
      notes: notes.trim(),
    };

    setResources((prev) => [newResource, ...prev]);
    setEditingStocks((prev) => ({ ...prev, [id]: { stock: String(parsedStock), minimum: String(parsedMinimum) } }));
    setName(""); setCategory("general"); setUnit("ml"); setCostPerUnit("");
    setStockQuantity(""); setMinimumStockQuantity(""); setNotes("");
    setShowAddForm(false);
    setSaving(false);
  }

  async function saveStockSettings(resourceId: string) {
    const values = editingStocks[resourceId];
    if (!values) return;
    const parsedStock = Number(values.stock);
    const parsedMinimum = Number(values.minimum);
    if (Number.isNaN(parsedStock) || parsedStock < 0) { alert("Ungültiger Bestand."); return; }

    const current = resources.find((r) => r.id === resourceId);
    if (!current) return;
    const delta = parsedStock - current.stockQuantity;
    setUpdatingId(resourceId);

    const { error } = await supabase.from("resources").update({
      stock_quantity: parsedStock,
      minimum_stock_quantity: parsedMinimum,
    }).eq("id", resourceId);

    if (error) { alert("Fehler beim Speichern."); setUpdatingId(null); return; }

    if (delta !== 0) {
      await supabase.from("inventory_movements").insert({
        id: crypto.randomUUID(),
        item_type: "resource",
        item_id: resourceId,
        movement_type: "manual_adjustment",
        quantity_delta: delta,
        unit: current.unit,
        reference_type: "manual",
        reference_id: resourceId,
        note: `Manuelle Anpassung: ${current.name}`,
      });
    }

    setResources((prev) => prev.map((r) => r.id === resourceId
      ? { ...r, stockQuantity: parsedStock, minimumStockQuantity: parsedMinimum }
      : r
    ));
    setUpdatingId(null);
  }

  const categories = useMemo(() => {
    const cats = new Set(resources.map((r) => r.category));
    return Array.from(cats).sort();
  }, [resources]);

  const filtered = useMemo(() => {
    return resources
      .filter((r) => {
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        if (filterStatus !== "all" && getStockLevel(r) !== filterStatus) return false;
        if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
            !r.category.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const levelOrder = { critical: 0, low: 1, ok: 2 };
        const diff = levelOrder[getStockLevel(a)] - levelOrder[getStockLevel(b)];
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [resources, filterCategory, filterStatus, search]);

  const stats = useMemo(() => {
    const criticalCount = resources.filter((r) => getStockLevel(r) === "critical").length;
    const lowCount = resources.filter((r) => getStockLevel(r) === "low").length;
    const totalValue = resources.reduce((s, r) => s + r.costPerUnitCents * r.stockQuantity, 0);
    const byCategory: Record<string, number> = {};
    for (const r of resources) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }
    return { criticalCount, lowCount, totalValue, categoryCount: Object.keys(byCategory).length };
  }, [resources]);

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
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Inventory</h1>
          <p className="mt-1 text-sm text-white/40">Lager, Rohstoffe, Compliance & Produktion</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6 space-y-6">
        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Ressourcen gesamt</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{resources.length}</p>
            <p className="text-[10px] text-[#9E9890] mt-0.5">{stats.categoryCount} Kategorien</p>
          </div>
          <div className={`rounded-2xl border p-5 ${stats.criticalCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-[#E5E0D8]"}`}>
            <p className={`text-[10px] uppercase tracking-[0.15em] ${stats.criticalCount > 0 ? "text-red-700" : "text-[#9E9890]"}`}>Kritisch</p>
            <p className={`mt-2 text-2xl font-bold ${stats.criticalCount > 0 ? "text-red-800" : "text-[#0A0A0A]"}`}>{stats.criticalCount}</p>
            <p className="text-[10px] text-[#9E9890] mt-0.5">unter Mindestbestand</p>
          </div>
          <div className={`rounded-2xl border p-5 ${stats.lowCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-[#E5E0D8]"}`}>
            <p className={`text-[10px] uppercase tracking-[0.15em] ${stats.lowCount > 0 ? "text-amber-700" : "text-[#9E9890]"}`}>Bald knapp</p>
            <p className={`mt-2 text-2xl font-bold ${stats.lowCount > 0 ? "text-amber-800" : "text-[#0A0A0A]"}`}>{stats.lowCount}</p>
            <p className="text-[10px] text-[#9E9890] mt-0.5">≤ 120% Mindestbestand</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Lagerwert (Einkauf)</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{centsToEur(stats.totalValue, 2)} €</p>
            <p className="text-[10px] text-[#9E9890] mt-0.5">Bestandsbewertung</p>
          </div>
        </div>

        {/* Sub-pages grid */}
        <div>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Module</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {SUB_PAGES.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className={`rounded-xl border px-4 py-3 transition-colors ${
                  page.gold
                    ? "border-[#C9A96E]/40 bg-[#C9A96E]/10 hover:bg-[#C9A96E]/20"
                    : "border-[#E5E0D8] bg-white hover:bg-[#F5F3EF]"
                }`}
              >
                <p className={`text-xs font-semibold ${page.gold ? "text-[#C9A96E]" : "text-[#0A0A0A]"}`}>{page.label}</p>
                <p className="text-[10px] text-[#9E9890] mt-0.5">{page.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Ressource suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A] w-56"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          >
            <option value="all">Alle Kategorien</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "critical" | "low" | "ok")}
            className="rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          >
            <option value="all">Alle Status</option>
            <option value="critical">Kritisch</option>
            <option value="low">Bald knapp</option>
            <option value="ok">Ausreichend</option>
          </select>
          <button
            onClick={() => setShowAddForm((p) => !p)}
            className="ml-auto rounded-full bg-[#0A0A0A] text-white px-4 py-2 text-xs font-medium uppercase tracking-wider"
          >
            {showAddForm ? "Abbrechen" : "+ Neue Ressource"}
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-6">
            <h2 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider mb-4">Neue Ressource</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="Ethanol 96%, Flakon 50 ml …" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Kategorie</label>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="raw_material / packaging" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Einheit</label>
                <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="ml / g / piece" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Kosten / Einheit (€)</label>
                <input type="number" min={0} step="0.0001" value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="0.0125" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Bestand</label>
                <input type="number" min={0} step="0.0001" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="1000" />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Mindestbestand</label>
                <input type="number" min={0} step="0.0001" value={minimumStockQuantity} onChange={(e) => setMinimumStockQuantity(e.target.value)}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder="200" />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]" />
              </div>
            </div>
            <button onClick={addResource} disabled={saving}
              className="mt-4 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40">
              {saving ? "Bitte warten..." : "Ressource speichern"}
            </button>
          </div>
        )}

        {/* Resources list */}
        <div className="rounded-2xl bg-white border border-[#E5E0D8] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E0D8]">
            <h2 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">
              Ressourcen
              {filtered.length !== resources.length && (
                <span className="ml-2 text-xs font-normal text-[#9E9890]">({filtered.length} von {resources.length})</span>
              )}
            </h2>
          </div>

          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-sm text-[#9E9890] text-center">Keine Ressourcen gefunden.</p>
          ) : (
            <div className="divide-y divide-[#E5E0D8]">
              {filtered.map((resource) => {
                const level = getStockLevel(resource);
                const stockValue = resource.costPerUnitCents * resource.stockQuantity / 100;

                return (
                  <div key={resource.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      {/* Left: info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#0A0A0A]">{resource.name}</h3>
                          {level === "critical" && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] text-red-700 font-medium">Kritisch</span>
                          )}
                          {level === "low" && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 font-medium">Bald knapp</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-[#9E9890]">
                          <span>{resource.category}</span>
                          <span>{centsToEur(resource.costPerUnitCents)} € / {resource.unit}</span>
                          <span>Lagerwert: {stockValue.toFixed(2)} €</span>
                        </div>
                        {resource.notes && (
                          <p className="mt-1 text-[10px] text-[#9E9890] italic truncate max-w-sm">{resource.notes}</p>
                        )}

                        {/* Stock bar */}
                        {resource.minimumStockQuantity > 0 && (
                          <div className="mt-2 w-40">
                            <div className="h-1.5 rounded-full bg-[#E5E0D8] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${level === "critical" ? "bg-red-500" : level === "low" ? "bg-amber-400" : "bg-emerald-500"}`}
                                style={{ width: `${Math.min(100, (resource.stockQuantity / (resource.minimumStockQuantity * 1.5)) * 100)}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-[9px] text-[#9E9890]">
                              {resource.stockQuantity.toFixed(2)} / min {resource.minimumStockQuantity.toFixed(2)} {resource.unit}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: edit controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="grid gap-1.5">
                          <input
                            type="number" min={0} step="0.0001"
                            value={editingStocks[resource.id]?.stock ?? "0"}
                            onChange={(e) => setEditingStocks((prev) => ({
                              ...prev,
                              [resource.id]: { stock: e.target.value, minimum: prev[resource.id]?.minimum ?? "0" },
                            }))}
                            title="Bestand"
                            className="w-28 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          />
                          <input
                            type="number" min={0} step="0.0001"
                            value={editingStocks[resource.id]?.minimum ?? "0"}
                            onChange={(e) => setEditingStocks((prev) => ({
                              ...prev,
                              [resource.id]: { stock: prev[resource.id]?.stock ?? "0", minimum: e.target.value },
                            }))}
                            title="Mindestbestand"
                            className="w-28 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          />
                        </div>
                        <button
                          onClick={() => saveStockSettings(resource.id)}
                          disabled={updatingId === resource.id}
                          className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-2 text-[10px] font-medium uppercase tracking-wider hover:bg-[#F0EDE8] disabled:opacity-40"
                        >
                          {updatingId === resource.id ? "..." : "OK"}
                        </button>
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
