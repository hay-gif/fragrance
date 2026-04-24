"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getOwnProfile } from "@/lib/profile";
import { authFetch } from "@/lib/authFetch";
import type { FragrancePreferences } from "@/lib/profile";

type Accord = { id: string; name: string; description: string; isActive: boolean };
type DbAccordRow = { id: string; name: string; description: string | null; is_active: boolean };
type DraftAccordRow = { accordId: string; percentage: number };

// Preisbandbreiten pro Größe — Creator hat innerhalb dieser Grenzen Spielraum.
// minPrice = Kostendeckung + Mindestmarge (ca. 30%)
// maxPrice = Marktoberkante (keine Überforderung des Kunden)
// suggestedPrice = unser Empfehlungspreis
const SIZE_OPTIONS = [
  { ml: 30, label: "30 ml", desc: "Zum Ausprobieren", priceEuro: "24.90", minPrice: 14.90, maxPrice: 39.90, suggestedPrice: 24.90 },
  { ml: 50, label: "50 ml", desc: "Der Klassiker", priceEuro: "39.90", minPrice: 24.90, maxPrice: 59.90, suggestedPrice: 39.90 },
  { ml: 100, label: "100 ml", desc: "Die große Flasche", priceEuro: "69.90", minPrice: 44.90, maxPrice: 99.90, suggestedPrice: 69.90 },
];

// Provision für Creator (25%)
const CREATOR_COMMISSION = 0.25;

const INTENSITY_OPTIONS = [
  { key: "light" as const, label: "Frisch & Leicht", desc: "Dezent, luftig — perfekt für den Alltag", note: "EDP 10–12%" },
  { key: "moderate" as const, label: "Ausgewogen", desc: "Klar präsent, vielseitig einsetzbar", note: "EDP 15–18%" },
  { key: "strong" as const, label: "Intensiv & Kräftig", desc: "Markant, langanhaltend — bleibt in Erinnerung", note: "Parfum 20–25%" },
];

export default function CreatePage() {
  const [mode, setMode] = useState<"beginner" | "pro" | null>(null);
  const [wizardStep, setWizardStep] = useState(0);

  const [name, setName] = useState("");
  const [sizeMl, setSizeMl] = useState("50");
  const [priceEuro, setPriceEuro] = useState("39.90");
  const [accords, setAccords] = useState<Accord[]>([]);
  const [draftAccords, setDraftAccords] = useState<DraftAccordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userPreferences, setUserPreferences] = useState<FragrancePreferences>({});

  // Beginner state
  const [selectedAccordIds, setSelectedAccordIds] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<"light" | "moderate" | "strong" | null>(null);
  const [selectedSizeMl, setSelectedSizeMl] = useState(50);
  const [selectedSizePrice, setSelectedSizePrice] = useState("39.90");

  // Pro state
  const [selectedAccordId, setSelectedAccordId] = useState("");
  const [newAccordPercentage, setNewAccordPercentage] = useState("");

  // AI state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    async function loadData() {
      const [{ data, error }, profile] = await Promise.all([
        supabase.from("accords").select("id, name, description, is_active").eq("is_active", true).order("name", { ascending: true }),
        getOwnProfile(),
      ]);
      if (!error) {
        setAccords((data ?? []).map((r: DbAccordRow) => ({ id: r.id, name: r.name, description: r.description ?? "", isActive: r.is_active })));
      }
      if (profile?.fragrance_preferences) setUserPreferences(profile.fragrance_preferences);
      setLoading(false);
    }
    loadData();
  }, []);

  const accordMap = useMemo(() => new Map(accords.map((a) => [a.id, a])), [accords]);
  const accordPercentageSum = useMemo(() => draftAccords.reduce((s, r) => s + r.percentage, 0), [draftAccords]);

  function toggleAccordSelection(id: string) {
    setSelectedAccordIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 6 ? [...prev, id] : prev,
    );
  }

  function normalizeDraftRows(rows: DraftAccordRow[]) {
    const total = rows.reduce((s, r) => s + r.percentage, 0);
    if (total <= 0) return rows;
    return rows.map((r) => ({ ...r, percentage: Number(((r.percentage / total) * 100).toFixed(4)) }));
  }

  function buildCompositionObject(rows: DraftAccordRow[]) {
    return Object.fromEntries(rows.map((r) => [r.accordId, r.percentage]));
  }

  function normalizeDraftTo100() {
    setDraftAccords((prev) => normalizeDraftRows(prev));
  }

  function addAccordToDraft() {
    const parsed = Number(newAccordPercentage);
    if (!selectedAccordId || Number.isNaN(parsed) || parsed <= 0) return;
    if (draftAccords.find((r) => r.accordId === selectedAccordId)) return;
    setDraftAccords((prev) => [...prev, { accordId: selectedAccordId, percentage: parsed }]);
    setSelectedAccordId("");
    setNewAccordPercentage("");
  }

  function updateDraftAccord(accordId: string, val: string) {
    const parsed = Number(val);
    setDraftAccords((prev) =>
      prev.map((r) => r.accordId === accordId ? { ...r, percentage: Number.isNaN(parsed) ? 0 : parsed } : r),
    );
  }

  function removeDraftAccord(accordId: string) {
    setDraftAccords((prev) => prev.filter((r) => r.accordId !== accordId));
  }

  async function generateAISuggestion() {
    if (!aiPrompt.trim()) { setAiError("Bitte beschreibe den gewünschten Duft."); return; }
    setAiLoading(true); setAiError(""); setAiSuggestion("");
    try {
      const res = await authFetch("/api/ai-suggest", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt, preferences: userPreferences, availableAccords: accords.map((a) => a.name) }),
      });
      const json = await res.json() as { suggestion?: string; error?: string };
      if (json.error) setAiError(json.error); else setAiSuggestion(json.suggestion ?? "");
    } catch (err) { setAiError(String(err)); }
    finally { setAiLoading(false); }
  }

  function applyAISuggestion() {
    const parsed: { name: string; percentage: number }[] = [];
    for (const line of aiSuggestion.split("\n")) {
      const m = line.match(/^-\s+(.+?):\s*(\d+(?:\.\d+)?)\s*%/);
      if (m) parsed.push({ name: m[1].trim(), percentage: Number(m[2]) });
    }
    if (parsed.length === 0) { setAiError("Konnte keine Accord-Anteile parsen."); return; }
    const newDraft: DraftAccordRow[] = [];
    const notFound: string[] = [];
    for (const item of parsed) {
      const nl = item.name.toLowerCase();
      const found = accords.find((a) => a.name.toLowerCase() === nl || a.name.toLowerCase().includes(nl) || nl.includes(a.name.toLowerCase()));
      if (found) newDraft.push({ accordId: found.id, percentage: item.percentage });
      else notFound.push(item.name);
    }
    if (newDraft.length === 0) { setAiError("Keine bekannten Accorde gefunden."); return; }
    setDraftAccords(newDraft);
    setAiOpen(false);
    if (notFound.length > 0) setAiError(`Nicht gefunden: ${notFound.join(", ")}`);
  }

  async function saveFragrance(opts?: { draftRows?: DraftAccordRow[]; sizeMlStr?: string; priceEuroStr?: string }) {
    const rows = opts?.draftRows ?? draftAccords;
    const parsedSizeMl = Number(opts?.sizeMlStr ?? sizeMl);
    const parsedPriceEuro = Number(opts?.priceEuroStr ?? priceEuro);

    if (!name.trim() || Number.isNaN(parsedSizeMl) || parsedSizeMl <= 0 || Number.isNaN(parsedPriceEuro) || parsedPriceEuro < 0 || rows.length === 0) return;

    const normalizedRows = normalizeDraftRows(rows);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const fragranceId = crypto.randomUUID();
    const priceCents = Math.round(parsedPriceEuro * 100);
    const compositionObject = buildCompositionObject(normalizedRows);
    const total = Number(normalizedRows.reduce((s, r) => s + r.percentage, 0).toFixed(4));

    const { error: fragranceError } = await supabase.from("fragrances").insert({
      id: fragranceId, name: name.trim(), composition: compositionObject, total,
      owner_id: user.id, creator_id: user.id, is_public: false,
      price_cents: priceCents, status: "draft", size_ml: parsedSizeMl,
      sample_status: "not_requested", description: "", category: "",
    });
    if (fragranceError) { setSaving(false); return; }

    const { error: accordError } = await supabase.from("fragrance_accords").insert(
      normalizedRows.map((r) => ({ id: crypto.randomUUID(), fragrance_id: fragranceId, accord_id: r.accordId, percentage: r.percentage })),
    );
    if (accordError) { setSaving(false); return; }

    window.location.href = `/fragrance/${fragranceId}/edit`;
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

  // ── Step 0: Mode picker ──────────────────────────────────────────────────
  if (mode === null) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <div className="mb-2 flex justify-end">
            <Link href="/my-fragrances" className="text-xs text-white/30 hover:text-white/60 transition-colors">Meine Düfte →</Link>
          </div>
          <p className="text-center text-[10px] uppercase tracking-[0.3em] text-white/30 mb-2">Fragrance OS</p>
          <h1 className="text-center text-4xl font-bold text-white mb-2">Duft kreieren</h1>
          <p className="text-center text-sm text-white/40 mb-12">Wie möchtest du vorgehen?</p>

          <div className="grid gap-4">
            <button
              onClick={() => { setMode("beginner"); setWizardStep(1); }}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-left hover:border-[#C9A96E]/50 transition-all active:scale-[0.98]"
            >
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-[#C9A96E]/8" />
              <div className="relative">
                <span className="mb-3 inline-block rounded-full bg-[#C9A96E]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#C9A96E]">Empfohlen</span>
                <h2 className="text-xl font-bold text-white mb-2">Für Einsteiger</h2>
                <p className="text-sm text-white/50 leading-relaxed">Wähle Duft-Noten visuell aus, bestimme Größe und Intensität — fertig. Kein Vorwissen nötig.</p>
                <div className="mt-5 flex items-center gap-3 text-xs text-white/30">
                  <span>◈ Geführter Assistent</span>
                  <span>·</span>
                  <span>3 Schritte</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setMode("pro"); setWizardStep(1); }}
              className="group rounded-3xl border border-white/10 bg-white/5 p-8 text-left hover:border-white/30 transition-all active:scale-[0.98]"
            >
              <h2 className="text-xl font-bold text-white mb-2">Profi-Modus</h2>
              <p className="text-sm text-white/50 leading-relaxed">Volle Kontrolle über Accord-Anteile in Prozent, KI-Assistent und manuelle Normalisierung.</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-white/30">
                <span>◉ Manuelle Eingabe</span>
                <span>·</span>
                <span>KI-Assistent</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Beginner wizard ──────────────────────────────────────────────────────
  if (mode === "beginner") {
    const TOTAL = 3;

    function BeginnerHeader() {
      return (
        <div className="bg-[#0A0A0A] px-5 pt-20 pb-6">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => { if (wizardStep === 1) { setMode(null); } else setWizardStep((s) => s - 1); }}
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                ← Zurück
              </button>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Schritt {wizardStep} / {TOTAL}</p>
              <button onClick={() => setMode(null)} className="text-xs text-white/30 hover:text-white/60 transition-colors">✕</button>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < wizardStep ? "bg-[#C9A96E]" : "bg-white/15"}`} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Step 1: Accord cards
    if (wizardStep === 1) {
      return (
        <main className="min-h-screen bg-[#FAFAF8]">
          <BeginnerHeader />
          <div className="mx-auto max-w-xl px-5 py-8">
            <h2 className="text-2xl font-bold text-[#0A0A0A]">Welche Noten soll dein Duft haben?</h2>
            <p className="mt-2 text-sm text-[#6E6860]">
              Wähle 1–6 Accorde. Die Anteile werden gleichmäßig verteilt und lassen sich danach noch anpassen.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {accords.map((accord) => {
                const sel = selectedAccordIds.includes(accord.id);
                const idx = selectedAccordIds.indexOf(accord.id);
                return (
                  <button
                    key={accord.id}
                    type="button"
                    onClick={() => toggleAccordSelection(accord.id)}
                    disabled={!sel && selectedAccordIds.length >= 6}
                    className={`relative rounded-2xl border p-4 text-left transition-all active:scale-95 disabled:opacity-30 ${
                      sel ? "border-[#0A0A0A] bg-[#0A0A0A] text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]" : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#C9A96E]/60 hover:shadow-sm"
                    }`}
                  >
                    {sel && (
                      <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#C9A96E] text-[9px] font-bold text-[#0A0A0A]">
                        {idx + 1}
                      </span>
                    )}
                    <p className="text-sm font-semibold pr-5 leading-tight">{accord.name}</p>
                    {accord.description && (
                      <p className={`mt-1 text-[10px] line-clamp-2 leading-snug ${sel ? "text-white/50" : "text-[#9E9890]"}`}>{accord.description}</p>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="sticky bottom-6 mt-8 flex items-center justify-between rounded-2xl bg-white border border-[#E5E0D8] px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <p className="text-xs text-[#9E9890]">
                {selectedAccordIds.length === 0 ? "Mindestens 1 auswählen" : `${selectedAccordIds.length} von 6 ausgewählt`}
              </p>
              <button
                onClick={() => setWizardStep(2)}
                disabled={selectedAccordIds.length === 0}
                className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-30"
              >
                Weiter →
              </button>
            </div>
          </div>
        </main>
      );
    }

    // Step 2: Size + Intensity
    if (wizardStep === 2) {
      return (
        <main className="min-h-screen bg-[#FAFAF8]">
          <BeginnerHeader />
          <div className="mx-auto max-w-xl px-5 py-8">
            <h2 className="text-2xl font-bold text-[#0A0A0A]">Größe & Intensität</h2>
            <p className="mt-2 text-sm text-[#6E6860]">Wie viel und wie stark soll dein Duft sein?</p>

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Flaschengröße</p>
              <div className="grid grid-cols-3 gap-3">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.ml}
                    type="button"
                    onClick={() => { setSelectedSizeMl(opt.ml); setSelectedSizePrice(opt.priceEuro); }}
                    className={`rounded-2xl border p-4 text-center transition-all active:scale-95 ${
                      selectedSizeMl === opt.ml ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#C9A96E]/60"
                    }`}
                  >
                    <p className="text-2xl font-bold leading-none">{opt.ml}</p>
                    <p className={`mt-0.5 text-[10px] ${selectedSizeMl === opt.ml ? "text-white/50" : "text-[#9E9890]"}`}>ml</p>
                    <p className={`mt-3 text-[11px] font-medium ${selectedSizeMl === opt.ml ? "text-white/60" : "text-[#9E9890]"}`}>{opt.desc}</p>
                    <p className={`mt-1 text-sm font-bold ${selectedSizeMl === opt.ml ? "text-[#C9A96E]" : "text-[#0A0A0A]"}`}>{opt.priceEuro} €</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#9E9890] mb-3">Intensität</p>
              <div className="space-y-2.5">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIntensity(opt.key)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                      intensity === opt.key ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#E5E0D8] bg-white text-[#0A0A0A] hover:border-[#C9A96E]/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{opt.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${intensity === opt.key ? "bg-white/10 text-white/50" : "bg-[#F0EDE8] text-[#9E9890]"}`}>
                        {opt.note}
                      </span>
                    </div>
                    <p className={`mt-1 text-[11px] ${intensity === opt.key ? "text-white/60" : "text-[#9E9890]"}`}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setWizardStep(3)}
                disabled={!intensity}
                className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white active:scale-95 transition-all disabled:opacity-30"
              >
                Weiter →
              </button>
            </div>
          </div>
        </main>
      );
    }

    // Step 3: Name + Confirm
    if (wizardStep === 3) {
      const equalPct = Number((100 / selectedAccordIds.length).toFixed(1));
      const intensityLabel = INTENSITY_OPTIONS.find((o) => o.key === intensity)?.label ?? "";

      return (
        <main className="min-h-screen bg-[#FAFAF8]">
          <BeginnerHeader />
          <div className="mx-auto max-w-xl px-5 py-8">
            <h2 className="text-2xl font-bold text-[#0A0A0A]">Namen vergeben & abschließen</h2>
            <p className="mt-2 text-sm text-[#6E6860]">Fast fertig — gib deiner Kreation einen Namen.</p>

            <div className="mt-8">
              <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Duft-Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Midnight Bloom"
                autoFocus
                className="w-full rounded-2xl border border-[#E5E0D8] bg-white px-4 py-3 text-lg font-medium text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
              />
            </div>

            {/* Summary */}
            <div className="mt-6 overflow-hidden rounded-3xl border border-[#E5E0D8] bg-white">
              <div className="relative overflow-hidden bg-[#0A0A0A] px-5 py-6">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #C9A96E 0%, transparent 60%)" }} />
                <div className="relative">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Deine Kreation</p>
                  <p className="mt-1.5 text-2xl font-bold text-white leading-tight">
                    {name || <span className="text-white/20">Duft-Name</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/60">{selectedSizeMl} ml</span>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-white/60">{selectedSizePrice} €</span>
                    <span className="rounded-full bg-[#C9A96E]/20 px-3 py-1 text-[10px] text-[#C9A96E]">{intensityLabel}</span>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="mb-3 text-[10px] uppercase tracking-wider text-[#9E9890]">Accord-Mischung · {selectedAccordIds.length} Noten à {equalPct}%</p>
                <div className="space-y-2.5">
                  {selectedAccordIds.map((id, idx) => {
                    const accord = accordMap.get(id);
                    return (
                      <div key={id} className="flex items-center gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F0EDE8] text-[9px] font-bold text-[#9E9890]">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-[#0A0A0A]">{accord?.name ?? "—"}</span>
                            <span className="text-[10px] font-bold text-[#C9A96E]">{equalPct}%</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-[#F5F0EA]">
                            <div className="h-full rounded-full" style={{ width: `${equalPct}%`, background: "linear-gradient(90deg, #C9A96E, #E8C99A)" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-[10px] text-[#C5C0B8]">Anteile lassen sich im nächsten Schritt anpassen.</p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!name.trim() || selectedAccordIds.length === 0) return;
                const equalPctRaw = Number((100 / selectedAccordIds.length).toFixed(4));
                const beginnerDraft = selectedAccordIds.map((id) => ({ accordId: id, percentage: equalPctRaw }));
                await saveFragrance({ draftRows: beginnerDraft, sizeMlStr: String(selectedSizeMl), priceEuroStr: selectedSizePrice });
              }}
              disabled={saving || !name.trim()}
              className="mt-6 w-full rounded-full bg-[#0A0A0A] py-4 text-sm font-bold uppercase tracking-widest text-white hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-30"
            >
              {saving ? "Wird gespeichert…" : "Duft anlegen →"}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#C5C0B8]">Du kannst alle Details danach noch anpassen.</p>
          </div>
        </main>
      );
    }
  }

  // ── Pro mode ─────────────────────────────────────────────────────────────
  const totalAccords = draftAccords.length;
  const sumDisplay = accordPercentageSum.toFixed(1);
  const sumOver = accordPercentageSum > 100;

  return (
    <main className="min-h-screen bg-[#FAFAF8] pb-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#0A0A0A]">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #C9A96E 0%, transparent 50%), radial-gradient(circle at 80% 20%, #ffffff 0%, transparent 40%)" }} />
        <div className="relative mx-auto max-w-5xl px-5 pt-14 pb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <button onClick={() => setMode(null)} className="mb-3 text-xs text-white/30 hover:text-white/60 transition-colors">← Modus wechseln</button>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Fragrance OS · Profi-Modus</p>
              <h1 className="mt-2 text-4xl font-bold text-white leading-tight">
                Duft <span className="text-[#C9A96E]">kreieren</span>
              </h1>
              <p className="mt-2 text-sm text-white/50 max-w-sm">Stelle deine Accord-Mischung präzise zusammen oder lass die KI inspirieren.</p>
            </div>
            <Link href="/my-fragrances" className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/60 hover:border-white/50 hover:text-white transition-all">
              Meine Düfte
            </Link>
          </div>

          <div className="mt-8 flex items-center gap-3">
            {[
              { n: "1", label: "Grunddaten", done: !!(name && sizeMl && priceEuro) },
              { n: "2", label: "Komposition", done: totalAccords > 0 },
              { n: "3", label: "Speichern", done: false },
            ].map((step, i) => (
              <div key={step.n} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-white/20" />}
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${step.done ? "bg-[#C9A96E] border-[#C9A96E] text-[#0A0A0A]" : "border-white/20 text-white/40"}`}>
                  {step.done ? "✓" : step.n}
                </div>
                <span className={`hidden text-[10px] uppercase tracking-wider sm:block ${step.done ? "text-[#C9A96E]" : "text-white/30"}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {/* Grunddaten */}
            <div className="overflow-hidden rounded-3xl border border-[#E5E0D8] bg-white">
              <div className="flex items-center gap-3 border-b border-[#F0EDE8] px-6 py-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0A0A] text-[10px] font-bold text-white">1</span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9E9890]">Grunddaten</p>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Duft-Name *</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-base font-medium text-[#0A0A0A] placeholder:text-[#C5C0B8] focus:border-[#0A0A0A] focus:outline-none transition-colors"
                    placeholder="z.B. Midnight Bloom"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Größe (ml)</label>
                  <div className="flex flex-wrap gap-2">
                    {SIZE_OPTIONS.map((opt) => (
                      <button key={opt.ml} type="button" onClick={() => { setSizeMl(String(opt.ml)); setPriceEuro(opt.priceEuro); }}
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${sizeMl === String(opt.ml) ? "border-[#0A0A0A] bg-[#0A0A0A] text-white" : "border-[#E5E0D8] text-[#6E6860] hover:border-[#0A0A0A]"}`}>
                        {opt.label}
                      </button>
                    ))}
                    <input type="number" min={1} value={sizeMl} onChange={(e) => setSizeMl(e.target.value)}
                      className="w-24 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2 text-xs text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none" />
                  </div>
                </div>
                <div>
                  {(() => {
                    const currentOpt = SIZE_OPTIONS.find((o) => String(o.ml) === sizeMl);
                    const minP = currentOpt?.minPrice ?? 0;
                    const maxP = currentOpt?.maxPrice ?? 999;
                    const parsed = Number(priceEuro);
                    const outOfRange = !Number.isNaN(parsed) && (parsed < minP || parsed > maxP);
                    const commission = !Number.isNaN(parsed) ? (parsed * CREATOR_COMMISSION).toFixed(2) : null;
                    return (
                      <>
                        <label className="mb-1.5 flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-[#9E9890]">Preis (€)</span>
                          {currentOpt && (
                            <span className="text-[10px] text-[#C5C0B8]">
                              Erlaubt: {minP.toFixed(2)} – {maxP.toFixed(2)} €
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min={minP}
                          max={maxP}
                          step="0.10"
                          value={priceEuro}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (!Number.isNaN(val)) {
                              setPriceEuro(String(Math.min(maxP, Math.max(minP, val)).toFixed(2)));
                            } else {
                              setPriceEuro(e.target.value);
                            }
                          }}
                          className={`w-full rounded-2xl border px-4 py-3 text-sm text-[#0A0A0A] focus:outline-none transition-colors ${
                            outOfRange
                              ? "border-red-300 bg-red-50 focus:border-red-500"
                              : "border-[#E5E0D8] bg-[#FAFAF8] focus:border-[#0A0A0A]"
                          }`}
                        />
                        {outOfRange && (
                          <p className="mt-1 text-[10px] text-red-500">
                            Preis außerhalb des erlaubten Bereichs ({minP.toFixed(2)} – {maxP.toFixed(2)} €).
                          </p>
                        )}
                        {commission && !outOfRange && (
                          <p className="mt-1.5 rounded-lg bg-[#F5F0EA] px-3 py-1.5 text-[10px] text-[#6E6860]">
                            Deine Provision (25%): <strong className="text-[#0A0A0A]">{commission} €</strong> pro Verkauf
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Komposition */}
            <div className="overflow-hidden rounded-3xl border border-[#E5E0D8] bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-[#F0EDE8] px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0A0A] text-[10px] font-bold text-white">2</span>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9E9890]">Komposition</p>
                </div>
                <div className={`rounded-full px-3 py-1 text-[10px] font-bold ${sumOver ? "bg-red-50 text-red-600" : "bg-[#F5F0EA] text-[#9E9890]"}`}>
                  {sumDisplay}% {sumOver ? "⚠ über 100" : "gesamt"}
                </div>
              </div>

              <div className="border-b border-[#F0EDE8] px-6 pt-5 pb-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Accord</label>
                    <select value={selectedAccordId} onChange={(e) => setSelectedAccordId(e.target.value)}
                      className="w-full rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#6E6860] focus:border-[#0A0A0A] focus:outline-none transition-colors">
                      <option value="">Bitte wählen</option>
                      {accords.filter((a) => !draftAccords.find((d) => d.accordId === a.id)).map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#9E9890]">Anteil %</label>
                    <input type="number" min={0} step="0.01" value={newAccordPercentage} onChange={(e) => setNewAccordPercentage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addAccordToDraft(); }}
                      placeholder="25"
                      className="w-full rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] px-4 py-3 text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none transition-colors" />
                  </div>
                  <button onClick={addAccordToDraft}
                    className="shrink-0 rounded-full bg-[#0A0A0A] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#1a1a1a] active:scale-95 transition-all">
                    + Add
                  </button>
                </div>
              </div>

              <div className="p-6">
                {draftAccords.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-[#E5E0D8] py-10 text-center">
                    <p className="text-2xl text-[#E5E0D8] mb-2">◈</p>
                    <p className="text-xs text-[#C5C0B8]">Noch keine Accorde hinzugefügt.</p>
                    <p className="text-[10px] text-[#C5C0B8] mt-1">Oder nutze die KI unten →</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draftAccords.map((row) => {
                      const accord = accordMap.get(row.accordId);
                      const barWidth = Math.min((row.percentage / Math.max(accordPercentageSum, 100)) * 100, 100);
                      return (
                        <div key={row.accordId} className="group rounded-2xl border border-[#E5E0D8] p-4 hover:border-[#C9A96E]/40 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <p className="truncate text-sm font-semibold text-[#0A0A0A]">{accord?.name ?? "Unbekannter Accord"}</p>
                                <span className="shrink-0 text-xs font-bold text-[#C9A96E]">{row.percentage}%</span>
                              </div>
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F0EA]">
                                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barWidth}%`, background: "linear-gradient(90deg, #C9A96E, #E8C99A)" }} />
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <input type="number" min={0} step="0.01" value={row.percentage} onChange={(e) => updateDraftAccord(row.accordId, e.target.value)}
                                className="w-20 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] px-3 py-2 text-center text-sm text-[#0A0A0A] focus:border-[#0A0A0A] focus:outline-none transition-colors" />
                              <button onClick={() => removeDraftAccord(row.accordId)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0EDE8] text-sm text-[#C5C0B8] hover:border-red-200 hover:text-red-400 transition-all">
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={normalizeDraftTo100}
                      className="w-full rounded-2xl border border-dashed border-[#E5E0D8] py-3 text-xs font-medium text-[#9E9890] hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors">
                      Auf 100% normalisieren
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* KI Assistent */}
            <div className="relative overflow-hidden rounded-3xl bg-[#0A0A0A]">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #C9A96E 0%, transparent 60%)" }} />
              <div className="relative p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[#C9A96E]">✦</span>
                      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C9A96E]">KI-Assistent</p>
                    </div>
                    <p className="text-sm font-semibold text-white">Lass die KI eine Mischung generieren</p>
                    <p className="mt-1 text-xs text-white/40">Beschreibe in Worten, wie dein Duft riechen soll.</p>
                  </div>
                  <button type="button" onClick={() => { setAiOpen((v) => !v); setAiError(""); }}
                    className="shrink-0 rounded-full border border-white/20 px-4 py-2 text-xs font-medium text-white/70 hover:border-[#C9A96E]/60 hover:text-[#C9A96E] transition-colors">
                    {aiOpen ? "Schließen" : "Starten"}
                  </button>
                </div>

                {aiOpen && (
                  <div className="mt-6 space-y-4">
                    {(userPreferences.families?.length || userPreferences.intensity) ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
                        Dein Profil wird berücksichtigt: {[userPreferences.families?.join(", "), userPreferences.intensity].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                    <div>
                      <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-white/40">Dein Wunsch</label>
                      <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3}
                        placeholder='z.B. "Ein frischer Sommerduft mit Zitrusnoten, leicht holzig, für den Alltag"'
                        className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-[#C9A96E]/50 focus:outline-none transition-colors" />
                    </div>
                    <button type="button" onClick={generateAISuggestion} disabled={aiLoading}
                      className="rounded-full bg-[#C9A96E] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#E8C99A] active:scale-95 transition-all disabled:opacity-40">
                      {aiLoading ? "KI generiert…" : "✦ Vorschlag generieren"}
                    </button>
                    {aiError && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">{aiError}</p>}
                    {aiSuggestion && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="mb-3 text-[10px] uppercase tracking-wider text-white/40">KI-Vorschlag</p>
                        <pre className="whitespace-pre-wrap font-mono text-sm text-white/80">{aiSuggestion}</pre>
                        <button type="button" onClick={applyAISuggestion}
                          className="mt-5 rounded-full bg-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0A0A0A] hover:bg-[#C9A96E] active:scale-95 transition-colors">
                          Mischung übernehmen →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: live preview */}
          <div className="h-fit lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-[#E5E0D8] bg-white">
              <div className="bg-gradient-to-br from-[#0A0A0A] to-[#1A1512] px-5 py-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Vorschau</p>
                <p className="mt-2 text-xl font-bold leading-tight text-white">
                  {name || <span className="text-white/20">Duft-Name</span>}
                </p>
                <p className="mt-1 text-sm text-[#C9A96E]">
                  {sizeMl ? `${sizeMl} ml` : "–"} · {priceEuro ? `${priceEuro} €` : "–"}
                </p>
              </div>
              <div className="p-5">
                <p className="mb-3 text-[10px] uppercase tracking-wider text-[#9E9890]">Accord-Pyramide</p>
                {draftAccords.length === 0 ? (
                  <p className="py-4 text-center text-xs text-[#C5C0B8]">Noch keine Accorde</p>
                ) : (
                  <div className="space-y-2.5">
                    {[...draftAccords].sort((a, b) => b.percentage - a.percentage).slice(0, 8).map((row) => {
                      const accord = accordMap.get(row.accordId);
                      const norm = accordPercentageSum > 0 ? (row.percentage / accordPercentageSum) * 100 : 0;
                      return (
                        <div key={row.accordId}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-[#0A0A0A]">{accord?.name ?? "—"}</span>
                            <span className="text-[10px] font-bold text-[#C9A96E]">{row.percentage}%</span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-[#F5F0EA]">
                            <div className="h-full rounded-full" style={{ width: `${norm}%`, background: "linear-gradient(90deg, #C9A96E, #E8C99A)" }} />
                          </div>
                        </div>
                      );
                    })}
                    {draftAccords.length > 8 && <p className="text-center text-[10px] text-[#9E9890]">+{draftAccords.length - 8} weitere</p>}
                  </div>
                )}
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => saveFragrance()} disabled={saving || !name || draftAccords.length === 0}
                  className="w-full rounded-full bg-[#0A0A0A] py-3.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-[#1a1a1a] active:scale-[0.98] transition-all disabled:opacity-30">
                  {saving ? "Wird gespeichert…" : "Duft speichern →"}
                </button>
                <p className="mt-2 text-center text-[10px] text-[#C5C0B8]">Du kannst alle Details danach noch anpassen.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
