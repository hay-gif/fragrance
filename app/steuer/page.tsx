"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type TaxEntry = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount_cents: number;
  vat_percent: number;
  description: string;
  entry_date: string;
  receipt_url: string | null;
  reference_id: string | null;
  source: "manual" | "auto_order" | "auto_commission";
};

type DbRow = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount_cents: number;
  vat_percent: string | number;
  description: string;
  entry_date: string;
  receipt_url: string | null;
  reference_id: string | null;
  source: "manual" | "auto_order" | "auto_commission";
};

const INCOME_CATEGORIES = [
  "Produktverkauf",
  "Provision/Affiliate",
  "Dienstleistung",
  "Sonstige Einnahme",
];

const EXPENSE_CATEGORIES = [
  "Rohstoffe",
  "Verpackung",
  "Porto/Versand",
  "Laborausstattung",
  "Werkzeug/Maschinen",
  "Bürobedarf",
  "Software/Lizenzen",
  "Werbung/Marketing",
  "Fremdleistungen",
  "Fahrtkosten",
  "Steuerberatung",
  "Bankgebühren",
  "Versicherung",
  "Sonstige Betriebsausgabe",
];

const VAT_RATES = [0, 7, 19];

function centsToEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function netFromGross(grossCents: number, vatPercent: number): number {
  return Math.round(grossCents / (1 + vatPercent / 100));
}

function vatAmount(grossCents: number, vatPercent: number): number {
  return grossCents - netFromGross(grossCents, vatPercent);
}

function downloadCsv(entries: TaxEntry[], year: number) {
  const header = "Datum;Typ;Kategorie;Beschreibung;Brutto (€);MwSt%;Netto (€);MwSt (€);Beleg;Referenz";
  const rows = entries
    .filter((e) => e.entry_date.startsWith(String(year)))
    .map((e) => {
      const net = netFromGross(e.amount_cents, e.vat_percent);
      const vat = vatAmount(e.amount_cents, e.vat_percent);
      return [
        e.entry_date,
        e.type === "income" ? "Einnahme" : "Ausgabe",
        e.category,
        `"${e.description.replace(/"/g, '""')}"`,
        centsToEur(e.amount_cents),
        e.vat_percent,
        centsToEur(net),
        centsToEur(vat),
        e.receipt_url ?? "",
        e.reference_id ?? "",
      ].join(";");
    });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `EÜR_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SteuerPage() {
  const [entries, setEntries] = useState<TaxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Form state
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [vatPercent, setVatPercent] = useState(19);
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("tax_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });

      setEntries((data ?? []).map((r: DbRow) => ({
        ...r,
        vat_percent: Number(r.vat_percent),
      })));
      setLoading(false);
    }
    load();
  }, []);

  // reset category when type changes
  useEffect(() => {
    setCategory(type === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  }, [type]);

  async function addEntry() {
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!description.trim()) { setMsg("Bitte Beschreibung eingeben."); return; }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) { setMsg("Bitte gültigen Betrag eingeben."); return; }
    if (!userId) return;

    setSaving(true);
    setMsg("");

    const amountCents = Math.round(parsedAmount * 100);
    const { data, error } = await supabase
      .from("tax_entries")
      .insert({
        user_id: userId,
        type,
        category,
        amount_cents: amountCents,
        vat_percent: vatPercent,
        description: description.trim(),
        entry_date: entryDate,
        receipt_url: receiptUrl.trim() || null,
        source: "manual",
      })
      .select()
      .single();

    if (error) {
      setMsg("Fehler beim Speichern: " + error.message);
    } else {
      setEntries((p) => [{ ...data, vat_percent: Number(data.vat_percent) }, ...p]);
      setAmount("");
      setDescription("");
      setReceiptUrl("");
      setMsg("Eintrag gespeichert.");
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Eintrag löschen?")) return;
    await supabase.from("tax_entries").delete().eq("id", id);
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!e.entry_date.startsWith(String(filterYear))) return false;
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      return true;
    });
  }, [entries, filterYear, filterType, filterCategory]);

  const summary = useMemo(() => {
    const incomeGross = filtered.filter((e) => e.type === "income").reduce((s, e) => s + e.amount_cents, 0);
    const expenseGross = filtered.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount_cents, 0);
    const incomeNet = filtered.filter((e) => e.type === "income").reduce((s, e) => s + netFromGross(e.amount_cents, e.vat_percent), 0);
    const expenseNet = filtered.filter((e) => e.type === "expense").reduce((s, e) => s + netFromGross(e.amount_cents, e.vat_percent), 0);
    const incomeVat = filtered.filter((e) => e.type === "income").reduce((s, e) => s + vatAmount(e.amount_cents, e.vat_percent), 0);
    const expenseVat = filtered.filter((e) => e.type === "expense").reduce((s, e) => s + vatAmount(e.amount_cents, e.vat_percent), 0);
    return { incomeGross, expenseGross, incomeNet, expenseNet, incomeVat, expenseVat, profit: incomeNet - expenseNet };
  }, [filtered]);

  const allCategories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category));
    return Array.from(cats).sort();
  }, [entries]);

  const availableYears = useMemo(() => {
    const years = new Set(entries.map((e) => Number(e.entry_date.slice(0, 4))));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#0A0A0A] border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <p className="text-sm text-[#6E6860]">Bitte erst anmelden.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-10">
      {/* Header */}
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
          <h1 className="mt-1 text-3xl font-bold text-white">Steuer / EÜR</h1>
          <p className="mt-2 text-sm text-white/50">Einnahmen-Überschuss-Rechnung — Einnahmen & Ausgaben</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6 space-y-6">
        {/* KPI summary */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-700">Einnahmen (Netto)</p>
            <p className="mt-2 text-xl font-bold text-emerald-800">{centsToEur(summary.incomeNet)} €</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Brutto {centsToEur(summary.incomeGross)} €</p>
          </div>
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-red-700">Ausgaben (Netto)</p>
            <p className="mt-2 text-xl font-bold text-red-800">{centsToEur(summary.expenseNet)} €</p>
            <p className="text-[10px] text-red-600 mt-0.5">Brutto {centsToEur(summary.expenseGross)} €</p>
          </div>
          <div className={`rounded-2xl border p-5 ${summary.profit >= 0 ? "bg-[#F0FDF4] border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className={`text-[10px] uppercase tracking-[0.15em] ${summary.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>Gewinn (EÜR)</p>
            <p className={`mt-2 text-xl font-bold ${summary.profit >= 0 ? "text-emerald-800" : "text-red-800"}`}>{centsToEur(summary.profit)} €</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-amber-700">MwSt. Saldo</p>
            <p className="mt-2 text-xl font-bold text-amber-800">{centsToEur(summary.incomeVat - summary.expenseVat)} €</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Umsatz-MwSt. − Vorsteuer</p>
          </div>
        </div>

        {/* New entry form */}
        <div className="rounded-2xl border border-[#E5E0D8] bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#0A0A0A] mb-4">Neuer Eintrag</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Typ</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "income" | "expense")}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="income">Einnahme</option>
                <option value="expense">Ausgabe</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Betrag Brutto (€)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">MwSt-Satz</label>
              <select
                value={vatPercent}
                onChange={(e) => setVatPercent(Number(e.target.value))}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                {VAT_RATES.map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Datum</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Beleg-URL (optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[#6E6860]">Beschreibung</label>
              <input
                type="text"
                placeholder="z.B. Einkauf Ethanol 96% bei Lieferant XY, Rechnung #123"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          {amount && !Number.isNaN(parseFloat(amount.replace(",", "."))) && (
            <div className="mt-3 rounded-xl bg-[#F5F3EF] px-4 py-3 text-xs text-[#6E6860] flex gap-6 flex-wrap">
              <span>Netto: <strong className="text-[#0A0A0A]">{centsToEur(netFromGross(Math.round(parseFloat(amount.replace(",", ".")) * 100), vatPercent))} €</strong></span>
              <span>MwSt. ({vatPercent}%): <strong className="text-[#0A0A0A]">{centsToEur(vatAmount(Math.round(parseFloat(amount.replace(",", ".")) * 100), vatPercent))} €</strong></span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={addEntry}
              disabled={saving}
              className="rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {saving ? "Speichert..." : "Eintrag speichern"}
            </button>
            {msg && <p className="text-xs text-[#6E6860]">{msg}</p>}
          </div>
        </div>

        {/* Filters + export */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          >
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "all" | "income" | "expense")}
            className="rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          >
            <option value="all">Alle Typen</option>
            <option value="income">Einnahmen</option>
            <option value="expense">Ausgaben</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-[#E5E0D8] bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
          >
            <option value="all">Alle Kategorien</option>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => downloadCsv(entries, filterYear)}
            className="ml-auto rounded-full border border-[#E5E0D8] bg-white text-[#6E6860] px-4 py-2 text-xs font-medium uppercase tracking-wider hover:bg-[#F0EDE8]"
          >
            CSV exportieren
          </button>
        </div>

        {/* Entries table */}
        <div className="rounded-2xl border border-[#E5E0D8] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E5E0D8] bg-[#FAFAF8]">
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-[#9E9890]">Datum</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-[#9E9890]">Typ</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-[#9E9890]">Kategorie</th>
                  <th className="px-4 py-3 text-left font-medium uppercase tracking-wider text-[#9E9890]">Beschreibung</th>
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-wider text-[#9E9890]">Brutto</th>
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-wider text-[#9E9890]">MwSt%</th>
                  <th className="px-4 py-3 text-right font-medium uppercase tracking-wider text-[#9E9890]">Netto</th>
                  <th className="px-4 py-3 text-center font-medium uppercase tracking-wider text-[#9E9890]">Beleg</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-[#9E9890]">Keine Einträge für den gewählten Zeitraum.</td>
                  </tr>
                ) : (
                  filtered.map((e, i) => (
                    <tr
                      key={e.id}
                      className={`border-b border-[#E5E0D8] last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF8]"}`}
                    >
                      <td className="px-4 py-3 text-[#6E6860] whitespace-nowrap">{new Date(e.entry_date).toLocaleDateString("de-DE")}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${e.type === "income" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                          {e.type === "income" ? "Einnahme" : "Ausgabe"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6E6860]">{e.category}</td>
                      <td className="px-4 py-3 text-[#0A0A0A] max-w-xs truncate" title={e.description}>{e.description}</td>
                      <td className="px-4 py-3 text-right font-medium text-[#0A0A0A] tabular-nums">{centsToEur(e.amount_cents)} €</td>
                      <td className="px-4 py-3 text-right text-[#6E6860]">{e.vat_percent}%</td>
                      <td className="px-4 py-3 text-right text-[#6E6860] tabular-nums">{centsToEur(netFromGross(e.amount_cents, e.vat_percent))} €</td>
                      <td className="px-4 py-3 text-center">
                        {e.receipt_url ? (
                          <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-[#C9A96E] hover:underline">
                            Beleg
                          </a>
                        ) : (
                          <span className="text-[#E5E0D8]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {e.source === "manual" && (
                          <button
                            onClick={() => deleteEntry(e.id)}
                            className="text-[#C0BCB8] hover:text-red-500 transition-colors text-xs"
                            title="Löschen"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#E5E0D8] bg-[#F5F3EF]">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6E6860]">
                      Summe ({filtered.length} Einträge)
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-[#0A0A0A] tabular-nums">
                      {centsToEur(summary.incomeGross + summary.expenseGross)} €
                    </td>
                    <td></td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-[#0A0A0A] tabular-nums">
                      {centsToEur(summary.incomeNet + summary.expenseNet)} €
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Tax hints */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-3">Wichtige Hinweise</p>
          <ul className="space-y-1.5 text-xs text-amber-700 leading-relaxed">
            <li>• Diese Seite dient als Hilfsmittel zur Buchführung und ersetzt keine steuerliche Beratung.</li>
            <li>• Als Kleinunternehmer (§ 19 UStG) wähle 0% MwSt. für alle Positionen und trage keine MwSt. in der Rechnung aus.</li>
            <li>• Belege und Rechnungen müssen 10 Jahre aufbewahrt werden (§ 147 AO).</li>
            <li>• Den CSV-Export kannst du direkt an deinen Steuerberater weitergeben.</li>
            <li>• Auto-generierte Einträge (aus Bestellungen) können nicht gelöscht werden.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
