"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ToxicologyProfile = {
  id: string;
  createdAt: string;
  inciName: string;
  substanceName: string;
  casNumber: string;
  ecNumber: string;
  noaelMgPerKgBwDay: string;
  systemicThresholdNote: string;
  toxicologicalEndpoint: string;
  sourceReference: string;
  notes: string;
};

type DbToxicologyRow = {
  id: string;
  created_at: string;
  inci_name: string;
  substance_name: string;
  cas_number: string | null;
  ec_number: string | null;
  noael_mg_per_kg_bw_day: number | null;
  systemic_threshold_note: string | null;
  toxicological_endpoint: string | null;
  source_reference: string | null;
  notes: string | null;
};

type RawMaterialSubstance = {
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type DbRawMaterialSubstanceRow = {
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage: number;
  is_allergen: boolean;
  is_declarable: boolean;
};

type MissingToxicologyCandidate = {
  key: string;
  inciName: string;
  substanceName: string;
  occurrences: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type SubstanceAlias = {
  id: string;
  aliasName: string;
  normalizedAlias: string;
  targetInciName: string;
  targetSubstanceName: string;
  notes: string;
};

type DbSubstanceAliasRow = {
  id: string;
  alias_name: string;
  normalized_alias: string;
  target_inci_name: string | null;
  target_substance_name: string | null;
  notes: string | null;
};

function normalizeChemicalName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[()]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

export default function ToxicologyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const [aliases, setAliases] = useState<SubstanceAlias[]>([]);
  const [rawMaterialSubstances, setRawMaterialSubstances] = useState<
    RawMaterialSubstance[]
  >([]);
  const [profiles, setProfiles] = useState<ToxicologyProfile[]>([]);

  const [substanceName, setSubstanceName] = useState("");
  const [inciName, setInciName] = useState("");
  const [casNumber, setCasNumber] = useState("");
  const [ecNumber, setEcNumber] = useState("");
  const [noaelMgPerKgBwDay, setNoaelMgPerKgBwDay] = useState("");
  const [systemicThresholdNote, setSystemicThresholdNote] = useState("");
  const [toxicologicalEndpoint, setToxicologicalEndpoint] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadData() {
      const [toxResult, substancesResult, aliasResult] = await Promise.all([
        supabase
          .from("substance_toxicology_profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("raw_material_substances")
          .select(
            "raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable",
          ),
        supabase
          .from("substance_aliases")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (toxResult.error) {
        console.error(
          "Fehler beim Laden der Toxikologie-Profile:",
          toxResult.error,
        );
        setLoading(false);
        return;
      }

      if (substancesResult.error) {
        console.error(
          "Fehler beim Laden der Rohstoff-Bestandteile:",
          substancesResult.error,
        );
        setLoading(false);
        return;
      }

      if (aliasResult.error) {
        console.error("Fehler beim Laden der Stoff-Aliase:", aliasResult.error);
        setLoading(false);
        return;
      }

      const mappedProfiles: ToxicologyProfile[] = (toxResult.data ?? []).map(
        (row: DbToxicologyRow) => ({
          id: row.id,
          createdAt: row.created_at,
          inciName: row.inci_name,
          substanceName: row.substance_name,
          casNumber: row.cas_number ?? "",
          ecNumber: row.ec_number ?? "",
          noaelMgPerKgBwDay:
            row.noael_mg_per_kg_bw_day === null
              ? ""
              : String(row.noael_mg_per_kg_bw_day),
          systemicThresholdNote: row.systemic_threshold_note ?? "",
          toxicologicalEndpoint: row.toxicological_endpoint ?? "",
          sourceReference: row.source_reference ?? "",
          notes: row.notes ?? "",
        }),
      );

      const mappedSubstances: RawMaterialSubstance[] = (
        substancesResult.data ?? []
      ).map((row: DbRawMaterialSubstanceRow) => ({
        rawMaterialId: row.raw_material_id,
        substanceName: row.substance_name,
        inciName: row.inci_name ?? "",
        percentage: Number(row.percentage),
        isAllergen: row.is_allergen,
        isDeclarable: row.is_declarable,
      }));

      const mappedAliases: SubstanceAlias[] = (aliasResult.data ?? []).map(
        (row: DbSubstanceAliasRow) => ({
          id: row.id,
          aliasName: row.alias_name,
          normalizedAlias: row.normalized_alias,
          targetInciName: row.target_inci_name ?? "",
          targetSubstanceName: row.target_substance_name ?? "",
          notes: row.notes ?? "",
        }),
      );

      setProfiles(mappedProfiles);
      setRawMaterialSubstances(mappedSubstances);
      setAliases(mappedAliases);
      setLoading(false);
    }

    loadData();
  }, []);

  async function addProfile() {
    if (!inciName.trim()) {
      setMessage("Bitte INCI Name eingeben.");
      return;
    }

    if (!substanceName.trim()) {
      setMessage("Bitte Stoffname eingeben.");
      return;
    }

    if (
      noaelMgPerKgBwDay.trim() !== "" &&
      (Number.isNaN(Number(noaelMgPerKgBwDay)) || Number(noaelMgPerKgBwDay) < 0)
    ) {
      setMessage("Bitte einen gültigen NOAEL-Wert eingeben.");
      return;
    }

    setSaving(true);
    setMessage("");

    const id = crypto.randomUUID();

    const payload = {
      id,
      inci_name: inciName.trim(),
      substance_name: substanceName.trim(),
      cas_number: casNumber.trim(),
      ec_number: ecNumber.trim(),
      noael_mg_per_kg_bw_day:
        noaelMgPerKgBwDay.trim() === "" ? null : Number(noaelMgPerKgBwDay),
      systemic_threshold_note: systemicThresholdNote.trim(),
      toxicological_endpoint: toxicologicalEndpoint.trim(),
      source_reference: sourceReference.trim(),
      notes: notes.trim(),
    };

    const { error } = await supabase
      .from("substance_toxicology_profiles")
      .insert(payload as never);

    if (error) {
      console.error("Fehler beim Speichern des Toxikologie-Profils:", error);
      setMessage("Profil konnte nicht gespeichert werden.");
      setSaving(false);
      return;
    }

    setProfiles((prev) => [
      {
        id,
        createdAt: new Date().toISOString(),
        inciName: inciName.trim(),
        substanceName: substanceName.trim(),
        casNumber: casNumber.trim(),
        ecNumber: ecNumber.trim(),
        noaelMgPerKgBwDay: noaelMgPerKgBwDay.trim(),
        systemicThresholdNote: systemicThresholdNote.trim(),
        toxicologicalEndpoint: toxicologicalEndpoint.trim(),
        sourceReference: sourceReference.trim(),
        notes: notes.trim(),
      },
      ...prev,
    ]);

    setSubstanceName("");
    setInciName("");
    setCasNumber("");
    setEcNumber("");
    setNoaelMgPerKgBwDay("");
    setSystemicThresholdNote("");
    setToxicologicalEndpoint("");
    setSourceReference("");
    setNotes("");

    setMessage("Toxikologie-Profil gespeichert.");
    setSaving(false);
  }

  async function updateProfile(profile: ToxicologyProfile) {
    if (!profile.inciName.trim() || !profile.substanceName.trim()) {
      setMessage("INCI Name und Stoffname sind Pflicht.");
      return;
    }

    if (
      profile.noaelMgPerKgBwDay.trim() !== "" &&
      (Number.isNaN(Number(profile.noaelMgPerKgBwDay)) ||
        Number(profile.noaelMgPerKgBwDay) < 0)
    ) {
      setMessage("Bitte einen gültigen NOAEL-Wert eingeben.");
      return;
    }

    setUpdatingId(profile.id);
    setMessage("");

    const payload = {
      inci_name: profile.inciName.trim(),
      substance_name: profile.substanceName.trim(),
      cas_number: profile.casNumber.trim(),
      ec_number: profile.ecNumber.trim(),
      noael_mg_per_kg_bw_day:
        profile.noaelMgPerKgBwDay.trim() === ""
          ? null
          : Number(profile.noaelMgPerKgBwDay),
      systemic_threshold_note: profile.systemicThresholdNote.trim(),
      toxicological_endpoint: profile.toxicologicalEndpoint.trim(),
      source_reference: profile.sourceReference.trim(),
      notes: profile.notes.trim(),
    };

    const { error } = await supabase
      .from("substance_toxicology_profiles")
      .update(payload as never)
      .eq("id", profile.id);

    if (error) {
      console.error(
        "Fehler beim Aktualisieren des Toxikologie-Profils:",
        error,
      );
      setMessage("Profil konnte nicht aktualisiert werden.");
      setUpdatingId(null);
      return;
    }

    setMessage("Profil aktualisiert.");
    setUpdatingId(null);
  }

  function useMissingCandidate(candidate: MissingToxicologyCandidate) {
    setInciName(candidate.inciName);
    setSubstanceName(candidate.substanceName);
    setMessage("Stoff in Formular übernommen.");
  }

  async function createDraftProfileFromCandidate(
    candidate: MissingToxicologyCandidate,
  ) {
    setSaving(true);
    setMessage("");

    const id = crypto.randomUUID();

    const payload = {
      id,
      inci_name: candidate.inciName.trim() || candidate.substanceName.trim(),
      substance_name:
        candidate.substanceName.trim() || candidate.inciName.trim(),
      cas_number: "",
      ec_number: "",
      noael_mg_per_kg_bw_day: null,
      systemic_threshold_note: "",
      toxicological_endpoint: "",
      source_reference: "",
      notes: `Automatisch als fehlender Stoff erkannt. Vorkommen: ${
        candidate.occurrences
      }. Allergen: ${
        candidate.isAllergen ? "Ja" : "Nein"
      }. Deklarationsrelevant: ${candidate.isDeclarable ? "Ja" : "Nein"}.`,
    };

    const { error } = await supabase
      .from("substance_toxicology_profiles")
      .insert(payload as never);

    if (error) {
      console.error("Fehler beim Erstellen des Draft-Profils:", error);
      setMessage("Draft-Profil konnte nicht angelegt werden.");
      setSaving(false);
      return;
    }

    setProfiles((prev) => [
      {
        id,
        createdAt: new Date().toISOString(),
        inciName: payload.inci_name,
        substanceName: payload.substance_name,
        casNumber: "",
        ecNumber: "",
        noaelMgPerKgBwDay: "",
        systemicThresholdNote: "",
        toxicologicalEndpoint: "",
        sourceReference: "",
        notes: payload.notes,
      },
      ...prev,
    ]);

    setMessage("Draft-Toxikologieprofil automatisch angelegt.");
    setSaving(false);
  }

  const normalizedProfileKeys = useMemo(() => {
    const set = new Set<string>();

    for (const profile of profiles) {
      if (profile.inciName.trim()) {
        set.add(`inci:${normalizeChemicalName(profile.inciName)}`);
      }
      if (profile.substanceName.trim()) {
        set.add(`substance:${normalizeChemicalName(profile.substanceName)}`);
      }
    }

    return set;
  }, [profiles]);

  const missingCandidates = useMemo<MissingToxicologyCandidate[]>(() => {
    const map = new Map<string, MissingToxicologyCandidate>();

    for (const substance of rawMaterialSubstances) {
      const normalizedInci = normalizeChemicalName(substance.inciName.trim());
      const normalizedSubstance = normalizeChemicalName(
        substance.substanceName.trim(),
      );

      const hasInciMatch = normalizedInci
        ? normalizedProfileKeys.has(`inci:${normalizedInci}`)
        : false;

      const hasSubstanceMatch = normalizedSubstance
        ? normalizedProfileKeys.has(`substance:${normalizedSubstance}`)
        : false;

      const aliasMatch = aliases.find(
        (alias) =>
          alias.normalizedAlias === normalizedInci ||
          alias.normalizedAlias === normalizedSubstance,
      );

      const hasAliasTargetMatch = aliasMatch
        ? !!(
            (aliasMatch.targetInciName &&
              normalizedProfileKeys.has(
                `inci:${normalizeChemicalName(aliasMatch.targetInciName)}`,
              )) ||
            (aliasMatch.targetSubstanceName &&
              normalizedProfileKeys.has(
                `substance:${normalizeChemicalName(
                  aliasMatch.targetSubstanceName,
                )}`,
              ))
          )
        : false;

      if (hasInciMatch || hasSubstanceMatch || hasAliasTargetMatch) {
        continue;
      }

      const key = `${substance.inciName.trim()}::${substance.substanceName.trim()}`;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          inciName: substance.inciName.trim(),
          substanceName: substance.substanceName.trim(),
          occurrences: 1,
          isAllergen: substance.isAllergen,
          isDeclarable: substance.isDeclarable,
        });
        continue;
      }

      existing.occurrences += 1;
      existing.isAllergen = existing.isAllergen || substance.isAllergen;
      existing.isDeclarable = existing.isDeclarable || substance.isDeclarable;
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      return (a.inciName || a.substanceName).localeCompare(
        b.inciName || b.substanceName,
      );
    });
  }, [rawMaterialSubstances, normalizedProfileKeys, aliases]);

  const matchedBySubstanceOnlyCount = useMemo(() => {
    let count = 0;

    for (const substance of rawMaterialSubstances) {
      const normalizedInci = normalizeChemicalName(substance.inciName.trim());
      const normalizedSubstance = normalizeChemicalName(
        substance.substanceName.trim(),
      );

      const hasInciMatch = normalizedInci
        ? normalizedProfileKeys.has(`inci:${normalizedInci}`)
        : false;

      const hasSubstanceMatch = normalizedSubstance
        ? normalizedProfileKeys.has(`substance:${normalizedSubstance}`)
        : false;

      if (!hasInciMatch && hasSubstanceMatch) {
        count += 1;
      }
    }

    return count;
  }, [rawMaterialSubstances, normalizedProfileKeys]);

  const stats = useMemo(() => {
    return {
      total: profiles.length,
      withNoael: profiles.filter((p) => p.noaelMgPerKgBwDay.trim() !== "")
        .length,
      withoutNoael: profiles.filter((p) => p.noaelMgPerKgBwDay.trim() === "")
        .length,
      missingProfiles: missingCandidates.length,
      matchedBySubstanceOnly: matchedBySubstanceOnlyCount,
    };
  }, [profiles, missingCandidates, matchedBySubstanceOnlyCount]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Toxicology Profiles</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
            <Link href="/inventory/raw-material-documents" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Material Documents</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Profile gesamt</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Mit NOAEL</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.withNoael}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Ohne NOAEL</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.withoutNoael}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Fehlende Profile</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.missingProfiles}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Nur Name-Match</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.matchedBySubstanceOnly}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Neues Toxikologie-Profil</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">INCI Name</label>
              <input
                value={inciName}
                onChange={(e) => setInciName(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. Limonene"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Stoffname</label>
              <input
                value={substanceName}
                onChange={(e) => setSubstanceName(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. Limonene"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">CAS Number</label>
              <input
                value={casNumber}
                onChange={(e) => setCasNumber(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">EC Number</label>
              <input
                value={ecNumber}
                onChange={(e) => setEcNumber(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">NOAEL mg/kg bw/day</label>
              <input
                value={noaelMgPerKgBwDay}
                onChange={(e) => setNoaelMgPerKgBwDay(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Toxicological Endpoint</label>
              <input
                value={toxicologicalEndpoint}
                onChange={(e) => setToxicologicalEndpoint(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. repeated dose toxicity"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Source Reference</label>
              <input
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. SCCS Opinion / Supplier dossier / PubChem / internal reference"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Systemic Threshold Note</label>
              <textarea
                value={systemicThresholdNote}
                onChange={(e) => setSystemicThresholdNote(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <button
            onClick={addProfile}
            disabled={saving}
            className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
          >
            {saving ? "Bitte warten..." : "Profil speichern"}
          </button>

          {message && <p className="mt-3 text-sm text-[#6E6860]">{message}</p>}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Fehlende toxikologische Profile</h2>

          {missingCandidates.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Aktuell wurden keine fehlenden Stoffprofile erkannt.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {missingCandidates.map((candidate) => (
                <div key={candidate.key} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0A0A0A]">
                        {candidate.inciName || candidate.substanceName}
                      </h3>
                      <p className="text-xs text-[#9E9890] mt-1">Stoffname: {candidate.substanceName || "—"}</p>
                      <p className="text-xs text-[#9E9890]">INCI Name: {candidate.inciName || "—"}</p>
                      <p className="text-xs text-[#9E9890]">Vorkommen: {candidate.occurrences}</p>
                      <p className="text-xs text-[#9E9890]">Allergen: {candidate.isAllergen ? "Ja" : "Nein"} · deklarationsrelevant: {candidate.isDeclarable ? "Ja" : "Nein"}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => useMissingCandidate(candidate)}
                        className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-[#F0EDE8]"
                      >
                        Ins Formular übernehmen
                      </button>

                      <button
                        onClick={() => createDraftProfileFromCandidate(candidate)}
                        className="rounded-full bg-[#0A0A0A] text-white px-4 py-1.5 text-xs font-medium uppercase tracking-wider"
                      >
                        Draft-Profil anlegen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Bestehende Profile</h2>

          {profiles.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Toxikologie-Profile vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">INCI Name</label>
                      <input
                        value={profile.inciName}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, inciName: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Stoffname</label>
                      <input
                        value={profile.substanceName}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, substanceName: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">CAS Number</label>
                      <input
                        value={profile.casNumber}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, casNumber: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">EC Number</label>
                      <input
                        value={profile.ecNumber}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, ecNumber: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">NOAEL mg/kg bw/day</label>
                      <input
                        value={profile.noaelMgPerKgBwDay}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, noaelMgPerKgBwDay: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Toxicological Endpoint</label>
                      <input
                        value={profile.toxicologicalEndpoint}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, toxicologicalEndpoint: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Source Reference</label>
                      <input
                        value={profile.sourceReference}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, sourceReference: e.target.value } : row,
                            ),
                          )
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Systemic Threshold Note</label>
                      <textarea
                        value={profile.systemicThresholdNote}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, systemicThresholdNote: e.target.value } : row,
                            ),
                          )
                        }
                        rows={3}
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
                      <textarea
                        value={profile.notes}
                        onChange={(e) =>
                          setProfiles((prev) =>
                            prev.map((row) =>
                              row.id === profile.id ? { ...row, notes: e.target.value } : row,
                            ),
                          )
                        }
                        rows={3}
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => updateProfile(profile)}
                    disabled={updatingId === profile.id}
                    className="mt-4 rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs font-medium uppercase tracking-wider hover:bg-[#F0EDE8]"
                  >
                    {updatingId === profile.id ? "Speichert..." : "Änderungen speichern"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
