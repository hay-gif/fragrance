"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Fragrance = {
  id: string;
  name: string;
  description: string;
  category: string;
  sizeMl: number;
  status: "draft" | "active";
  isPublic: boolean;
  sampleStatus: "not_requested" | "requested" | "shipped" | "tested";
  imageUrl: string;
};
type FragranceDocument = {
  id: string;
  documentType: string;
};
type Accord = {
  id: string;
  name: string;
};

type FragranceAccord = {
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
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type ComplianceProfile = {
  productName: string;
  intendedUse: string;
  targetMarket: string;
  productForm: string;
  applicationArea: string;
  responsiblePerson: string;
  internalFormulaVersion: string;
  labelInciText: string;
  labelWarningText: string;
  labelUsageText: string;
  hasCpsr: boolean;
  hasIfraDocument: boolean;
  hasSdsDocuments: boolean;
  hasAllergenReview: boolean;
  hasLabelReview: boolean;
  hasPackagingReview: boolean;
  hasStabilityReview: boolean;
  hasMicroReview: boolean;
  releaseNotes: string;
};

type FlattenedSubstance = {
  key: string;
  substanceName: string;
  inciName: string;
  totalPercentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type DbFragranceRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  size_ml: number;
  status: "draft" | "active";
  is_public: boolean;
  sample_status: "not_requested" | "requested" | "shipped" | "tested";
  image_url: string | null;
};

type DbAccordRow = {
  id: string;
  name: string;
};

type DbFragranceAccordRow = {
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
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage: number;
  is_allergen: boolean;
  is_declarable: boolean;
};

type DbComplianceRow = {
  product_name: string | null;
  intended_use: string | null;
  target_market: string | null;
  product_form: string | null;
  application_area: string | null;
  responsible_person: string | null;
  internal_formula_version: string | null;
  label_inci_text: string | null;
  label_warning_text: string | null;
  label_usage_text: string | null;
  has_cpsr: boolean;
  has_ifra_document: boolean;
  has_sds_documents: boolean;
  has_allergen_review: boolean;
  has_label_review: boolean;
  has_packaging_review: boolean;
  has_stability_review: boolean;
  has_micro_review: boolean;
  release_notes: string | null;
};

function defaultComplianceProfile(fragranceName: string): ComplianceProfile {
  return {
    productName: fragranceName,
    intendedUse: "Parfüm zur äußeren Anwendung auf der Haut.",
    targetMarket: "EU",
    productForm: "alcohol_based_perfume",
    applicationArea: "external_use",
    responsiblePerson: "",
    internalFormulaVersion: "v1",
    labelInciText: "",
    labelWarningText: "Nur zur äußeren Anwendung. Kontakt mit Augen vermeiden.",
    labelUsageText: "Auf die Haut aufsprühen.",
    hasCpsr: false,
    hasIfraDocument: false,
    hasSdsDocuments: false,
    hasAllergenReview: false,
    hasLabelReview: false,
    hasPackagingReview: false,
    hasStabilityReview: false,
    hasMicroReview: false,
    releaseNotes: "",
  };
}

export default function FragranceDocumentationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<FragranceDocument[]>([]);
  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
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
  const [profile, setProfile] = useState<ComplianceProfile | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await params;

      
      const { data: fragranceRow, error: fragranceError } = await supabase
        .from("fragrances")
        .select(
          "id, name, description, category, size_ml, status, is_public, sample_status, image_url",
        )
        .eq("id", resolvedParams.id)
        .single();

      if (fragranceError || !fragranceRow) {
        console.error("Fehler beim Laden des Dufts:", fragranceError);
        setLoading(false);
        return;
      }
            const { data: documentRows, error: documentsError } = await supabase
              .from("fragrance_documents")
              .select("id, document_type")
              .eq("fragrance_id", resolvedParams.id);

            if (documentsError) {
              console.error(
                "Fehler beim Laden der Duft-Dokumente:",
                documentsError,
              );
            } else {
              setDocuments(
                (documentRows ?? []).map(
                  (row: { id: string; document_type: string }) => ({
                    id: row.id,
                    documentType: row.document_type,
                  }),
                ),
              );
            }

      const mappedFragrance: Fragrance = {
        id: fragranceRow.id,
        name: fragranceRow.name,
        description: fragranceRow.description ?? "",
        category: fragranceRow.category ?? "",
        sizeMl: fragranceRow.size_ml,
        status: fragranceRow.status,
        isPublic: fragranceRow.is_public,
        sampleStatus: fragranceRow.sample_status,
        imageUrl: fragranceRow.image_url ?? "",
      };

      setFragrance(mappedFragrance);

      const [accordRowsResult, fragranceAccordRowsResult, complianceResult] =
        await Promise.all([
          supabase.from("accords").select("id, name"),
          supabase
            .from("fragrance_accords")
            .select("accord_id, percentage")
            .eq("fragrance_id", resolvedParams.id),
          supabase
            .from("fragrance_compliance_profiles")
            .select("*")
            .eq("fragrance_id", resolvedParams.id)
            .maybeSingle(),
        ]);

      if (accordRowsResult.error) {
        console.error("Fehler beim Laden der Accorde:", accordRowsResult.error);
        setLoading(false);
        return;
      }

      if (fragranceAccordRowsResult.error) {
        console.error(
          "Fehler beim Laden der Duft-Accorde:",
          fragranceAccordRowsResult.error,
        );
        setLoading(false);
        return;
      }

      const mappedAccords: Accord[] = (accordRowsResult.data ?? []).map(
        (row: DbAccordRow) => ({
          id: row.id,
          name: row.name,
        }),
      );

      const mappedFragranceAccords: FragranceAccord[] = (
        fragranceAccordRowsResult.data ?? []
      ).map((row: DbFragranceAccordRow) => ({
        accordId: row.accord_id,
        percentage: Number(row.percentage),
      }));

      setAccords(mappedAccords);
      setFragranceAccords(mappedFragranceAccords);

      const accordIds = Array.from(
        new Set(mappedFragranceAccords.map((row) => row.accordId)),
      );

      let mappedAccordComponents: AccordComponent[] = [];
      if (accordIds.length > 0) {
        const { data, error } = await supabase
          .from("accord_components")
          .select("accord_id, raw_material_id, percentage")
          .in("accord_id", accordIds);

        if (error) {
          console.error("Fehler beim Laden der Accord-Komponenten:", error);
          setLoading(false);
          return;
        }

        mappedAccordComponents = (data ?? []).map(
          (row: DbAccordComponentRow) => ({
            accordId: row.accord_id,
            rawMaterialId: row.raw_material_id,
            percentage: Number(row.percentage),
          }),
        );
      }

      setAccordComponents(mappedAccordComponents);

      const rawMaterialIds = Array.from(
        new Set(mappedAccordComponents.map((row) => row.rawMaterialId)),
      );

      let mappedRawMaterials: RawMaterial[] = [];
      let mappedSubstances: RawMaterialSubstance[] = [];

      if (rawMaterialIds.length > 0) {
        const [rawMaterialsResult, rawMaterialSubstancesResult] =
          await Promise.all([
            supabase
              .from("raw_materials")
              .select("id, name, inci_label_name")
              .in("id", rawMaterialIds),
            supabase
              .from("raw_material_substances")
              .select(
                "raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable",
              )
              .in("raw_material_id", rawMaterialIds),
          ]);

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
            "Fehler beim Laden der Rohstoff-Bestandteile:",
            rawMaterialSubstancesResult.error,
          );
          setLoading(false);
          return;
        }

        mappedRawMaterials = (rawMaterialsResult.data ?? []).map(
          (row: DbRawMaterialRow) => ({
            id: row.id,
            name: row.name,
            inciLabelName: row.inci_label_name ?? "",
          }),
        );

        mappedSubstances = (rawMaterialSubstancesResult.data ?? []).map(
          (row: DbRawMaterialSubstanceRow) => ({
            rawMaterialId: row.raw_material_id,
            substanceName: row.substance_name,
            inciName: row.inci_name ?? "",
            percentage: Number(row.percentage),
            isAllergen: row.is_allergen,
            isDeclarable: row.is_declarable,
          }),
        );
      }

      setRawMaterials(mappedRawMaterials);
      setRawMaterialSubstances(mappedSubstances);

      if (complianceResult.error) {
        console.error(
          "Fehler beim Laden des Compliance-Profils:",
          complianceResult.error,
        );
        setProfile(defaultComplianceProfile(mappedFragrance.name));
      } else if (!complianceResult.data) {
        setProfile(defaultComplianceProfile(mappedFragrance.name));
      } else {
        const row = complianceResult.data as DbComplianceRow;
        setProfile({
          productName: row.product_name ?? mappedFragrance.name,
          intendedUse: row.intended_use ?? "",
          targetMarket: row.target_market ?? "EU",
          productForm: row.product_form ?? "alcohol_based_perfume",
          applicationArea: row.application_area ?? "external_use",
          responsiblePerson: row.responsible_person ?? "",
          internalFormulaVersion: row.internal_formula_version ?? "v1",
          labelInciText: row.label_inci_text ?? "",
          labelWarningText: row.label_warning_text ?? "",
          labelUsageText: row.label_usage_text ?? "",
          hasCpsr: row.has_cpsr,
          hasIfraDocument: row.has_ifra_document,
          hasSdsDocuments: row.has_sds_documents,
          hasAllergenReview: row.has_allergen_review,
          hasLabelReview: row.has_label_review,
          hasPackagingReview: row.has_packaging_review,
          hasStabilityReview: row.has_stability_review,
          hasMicroReview: row.has_micro_review,
          releaseNotes: row.release_notes ?? "",
        });
      }

      setLoading(false);
    }

    loadData();
  }, [params]);

  const accordMap = useMemo(
    () => new Map(accords.map((accord) => [accord.id, accord.name])),
    [accords],
  );

  const rawMaterialMap = useMemo(
    () => new Map(rawMaterials.map((material) => [material.id, material])),
    [rawMaterials],
  );

  const formulaSum = useMemo(() => {
    return fragranceAccords.reduce((sum, row) => sum + row.percentage, 0);
  }, [fragranceAccords]);

  const flattenedRawMaterials = useMemo(() => {
    const usage = new Map<
      string,
      { name: string; inciLabelName: string; effectivePercentage: number }
    >();

    for (const fragranceAccord of fragranceAccords) {
      const components = accordComponents.filter(
        (component) => component.accordId === fragranceAccord.accordId,
      );

      for (const component of components) {
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
        ...value,
      }))
      .sort((a, b) => b.effectivePercentage - a.effectivePercentage);
  }, [fragranceAccords, accordComponents, rawMaterialMap]);

  const flattenedSubstances = useMemo<FlattenedSubstance[]>(() => {
    const aggregated = new Map<
      string,
      {
        substanceName: string;
        inciName: string;
        totalPercentage: number;
        isAllergen: boolean;
        isDeclarable: boolean;
      }
    >();

    for (const rawMaterialUsage of flattenedRawMaterials) {
      const matchingSubstances = rawMaterialSubstances.filter(
        (substance) =>
          substance.rawMaterialId === rawMaterialUsage.rawMaterialId,
      );

      for (const substance of matchingSubstances) {
        const effectiveSubstancePercentage =
          (rawMaterialUsage.effectivePercentage * substance.percentage) / 100;

        const key = `${substance.inciName || substance.substanceName}::${
          substance.isAllergen ? "1" : "0"
        }::${substance.isDeclarable ? "1" : "0"}`;

        const existing = aggregated.get(key);

        if (!existing) {
          aggregated.set(key, {
            substanceName: substance.substanceName,
            inciName: substance.inciName,
            totalPercentage: effectiveSubstancePercentage,
            isAllergen: substance.isAllergen,
            isDeclarable: substance.isDeclarable,
          });
          continue;
        }

        existing.totalPercentage += effectiveSubstancePercentage;
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
      }))
      .sort((a, b) => b.totalPercentage - a.totalPercentage);
  }, [flattenedRawMaterials, rawMaterialSubstances]);

  const allergenSubstances = useMemo(
    () => flattenedSubstances.filter((row) => row.isAllergen),
    [flattenedSubstances],
  );

  const declarableSubstances = useMemo(
    () => flattenedSubstances.filter((row) => row.isDeclarable),
    [flattenedSubstances],
  );

  const generatedInciPreview = useMemo(() => {
    const unique = Array.from(
      new Set(
        declarableSubstances
          .map((row) => row.inciName.trim() || row.substanceName.trim())
          .filter(Boolean),
      ),
    );
    return unique.join(", ");
  }, [declarableSubstances]);

  const releaseBlockers = useMemo(() => {
    if (!fragrance || !profile) return [];

    const blockers: string[] = [];

    const hasIfraUpload = documents.some((doc) => doc.documentType === "ifra");
    const hasSdsUpload = documents.some((doc) => doc.documentType === "sds");
    const hasCpsrUpload = documents.some((doc) => doc.documentType === "cpsr");

    if (!hasIfraUpload) {
      blockers.push("IFRA-Datei wurde noch nicht hochgeladen.");
    }

    if (!hasSdsUpload) {
      blockers.push("SDS-Datei wurde noch nicht hochgeladen.");
    }

    if (!hasCpsrUpload) {
      blockers.push("CPSR-Datei wurde noch nicht hochgeladen.");
    }

    if (fragrance.sampleStatus !== "tested") {
      blockers.push("Sample wurde noch nicht getestet.");
    }

    if (!fragrance.category.trim()) {
      blockers.push("Kategorie fehlt.");
    }

    if (!fragrance.description.trim()) {
      blockers.push("Beschreibung fehlt.");
    }

    if (!fragrance.imageUrl.trim()) {
      blockers.push("Produktbild fehlt.");
    }

    if (fragranceAccords.length === 0) {
      blockers.push("Keine Accord-Mischung hinterlegt.");
    }

    if (formulaSum <= 0) {
      blockers.push("Formelsumme ist 0%.");
    }

    if (Math.abs(formulaSum - 100) > 0.01) {
      blockers.push(
        `Formelsumme ist nicht 100% (aktuell ${formulaSum.toFixed(4)}%).`,
      );
    }

    if (!profile.productName.trim()) {
      blockers.push("Produktname in der Dokumentation fehlt.");
    }

    if (!profile.intendedUse.trim()) {
      blockers.push("Intended Use fehlt.");
    }

    if (!profile.responsiblePerson.trim()) {
      blockers.push("Responsible Person fehlt.");
    }

    if (!profile.hasIfraDocument) {
      blockers.push("IFRA-Dokumentation fehlt.");
    }

    if (!profile.hasSdsDocuments) {
      blockers.push("SDS-Dokumentation fehlt.");
    }

    if (!profile.hasAllergenReview) {
      blockers.push("Allergen-Review fehlt.");
    }

    if (!profile.hasLabelReview) {
      blockers.push("Label-Review fehlt.");
    }

    if (!profile.hasPackagingReview) {
      blockers.push("Packaging-Review fehlt.");
    }

    if (!profile.hasCpsr) {
      blockers.push("CPSR fehlt.");
    }

    if (!profile.hasStabilityReview) {
      blockers.push("Stability-Review fehlt.");
    }

    return blockers;
  }, [fragrance, profile, fragranceAccords, formulaSum, documents]);

  async function saveProfile() {
    if (!fragrance || !profile) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("fragrance_compliance_profiles")
      .upsert({
        fragrance_id: fragrance.id,
        updated_at: new Date().toISOString(),
        product_name: profile.productName.trim(),
        intended_use: profile.intendedUse.trim(),
        target_market: profile.targetMarket.trim(),
        product_form: profile.productForm.trim(),
        application_area: profile.applicationArea.trim(),
        responsible_person: profile.responsiblePerson.trim(),
        internal_formula_version: profile.internalFormulaVersion.trim(),
        label_inci_text: profile.labelInciText.trim(),
        label_warning_text: profile.labelWarningText.trim(),
        label_usage_text: profile.labelUsageText.trim(),
        has_cpsr: profile.hasCpsr,
        has_ifra_document: profile.hasIfraDocument,
        has_sds_documents: profile.hasSdsDocuments,
        has_allergen_review: profile.hasAllergenReview,
        has_label_review: profile.hasLabelReview,
        has_packaging_review: profile.hasPackagingReview,
        has_stability_review: profile.hasStabilityReview,
        has_micro_review: profile.hasMicroReview,
        release_notes: profile.releaseNotes.trim(),
      });

    if (error) {
      console.error("Fehler beim Speichern des Compliance-Profils:", error);
      setMessage("Dokumentation konnte nicht gespeichert werden.");
      setSaving(false);
      return;
    }

    setMessage("Dokumentation gespeichert.");
    setSaving(false);
  }

  if (loading || !fragrance || !profile) {
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
      <div className="bg-[#0A0A0A] px-5 pt-20 pb-8 relative">
        <Link
          href={`/fragrance/${fragrance.id}/edit`}
          className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-sm transition-all hover:bg-white/20"
        >
          ← Zurück
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Release-Dokumentation</h1>
        <p className="mt-1 text-sm text-white/50">{fragrance.name}</p>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Accorde</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{fragranceAccords.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Rohstoffe</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {flattenedRawMaterials.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Allergene</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {allergenSubstances.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Blocker</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{releaseBlockers.length}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Produktbasis</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-[#3A3530]">
            <p>
              <span className="font-medium">Name:</span> {fragrance.name}
            </p>
            <p>
              <span className="font-medium">Größe:</span> {fragrance.sizeMl} ml
            </p>
            <p>
              <span className="font-medium">Kategorie:</span>{" "}
              {fragrance.category || "—"}
            </p>
            <p>
              <span className="font-medium">Sample:</span>{" "}
              {fragrance.sampleStatus}
            </p>
            <p>
              <span className="font-medium">Status:</span> {fragrance.status}
            </p>
            <p>
              <span className="font-medium">Öffentlich:</span>{" "}
              {fragrance.isPublic ? "Ja" : "Nein"}
            </p>
            <p className="md:col-span-2">
              <span className="font-medium">Beschreibung:</span>{" "}
              {fragrance.description || "—"}
            </p>
            <p className="md:col-span-2">
              <span className="font-medium">Formelsumme:</span>{" "}
              {formulaSum.toFixed(4)}%
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Automatisch generierte Voransicht
          </h2>
          <div className="mt-4 space-y-3 text-sm text-[#3A3530]">
            <p>
              <span className="font-medium">INCI Preview:</span>{" "}
              {generatedInciPreview ||
                "Noch keine deklarationsrelevanten Stoffe vorhanden."}
            </p>
            <p>
              <span className="font-medium">Allergene:</span>{" "}
              {allergenSubstances.length > 0
                ? allergenSubstances
                    .map((row) => row.inciName || row.substanceName)
                    .join(", ")
                : "Keine gepflegt"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Dokumentationsfelder</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Produktname
              </label>
              <input
                type="text"
                value={profile.productName}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, productName: e.target.value } : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Responsible Person
              </label>
              <input
                type="text"
                value={profile.responsiblePerson}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, responsiblePerson: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Target Market
              </label>
              <input
                type="text"
                value={profile.targetMarket}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, targetMarket: e.target.value } : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Formula Version
              </label>
              <input
                type="text"
                value={profile.internalFormulaVersion}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, internalFormulaVersion: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Intended Use
              </label>
              <textarea
                value={profile.intendedUse}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, intendedUse: e.target.value } : prev,
                  )
                }
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Label INCI Text
              </label>
              <textarea
                value={profile.labelInciText}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, labelInciText: e.target.value } : prev,
                  )
                }
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder={generatedInciPreview}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Warning Text
              </label>
              <textarea
                value={profile.labelWarningText}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, labelWarningText: e.target.value } : prev,
                  )
                }
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Usage Text
              </label>
              <textarea
                value={profile.labelUsageText}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, labelUsageText: e.target.value } : prev,
                  )
                }
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasIfraDocument}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, hasIfraDocument: e.target.checked }
                      : prev,
                  )
                }
              />
              IFRA-Dokument vorhanden
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasSdsDocuments}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, hasSdsDocuments: e.target.checked }
                      : prev,
                  )
                }
              />
              SDS-Dokumente vorhanden
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasAllergenReview}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, hasAllergenReview: e.target.checked }
                      : prev,
                  )
                }
              />
              Allergen-Review abgeschlossen
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasLabelReview}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, hasLabelReview: e.target.checked } : prev,
                  )
                }
              />
              Label-Review abgeschlossen
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasPackagingReview}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, hasPackagingReview: e.target.checked }
                      : prev,
                  )
                }
              />
              Packaging-Review abgeschlossen
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasStabilityReview}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev
                      ? { ...prev, hasStabilityReview: e.target.checked }
                      : prev,
                  )
                }
              />
              Stability-Review abgeschlossen
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasMicroReview}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, hasMicroReview: e.target.checked } : prev,
                  )
                }
              />
              Micro-Review abgeschlossen
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.hasCpsr}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, hasCpsr: e.target.checked } : prev,
                  )
                }
              />
              CPSR vorhanden
            </label>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium">
              Release Notes
            </label>
            <textarea
              value={profile.releaseNotes}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, releaseNotes: e.target.value } : prev,
                )
              }
              rows={4}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="mt-6 rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:opacity-40"
          >
            {saving ? "Bitte warten..." : "Dokumentation speichern"}
          </button>

          {message && <p className="mt-3 text-sm text-[#6E6860]">{message}</p>}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Formel-Bausteine</h2>
            {fragranceAccords.length === 0 ? (
              <p className="mt-4 text-sm text-[#9E9890]">
                Keine Accorde vorhanden.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {fragranceAccords.map((row, index) => (
                  <div
                    key={`${row.accordId}-${index}`}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3"
                  >
                    <p className="text-sm font-medium text-[#0A0A0A]">
                      {accordMap.get(row.accordId) ?? "Unbekannter Accord"}
                    </p>
                    <p className="text-xs text-[#9E9890]">
                      Anteil: {row.percentage.toFixed(4)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Release-Blocker
            </h2>
            {releaseBlockers.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Aktuell sind keine offensichtlichen Blocker erkannt.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {releaseBlockers.map((blocker, index) => (
                  <div key={index} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
                    {blocker}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Deklarationsrelevante Stoffe
            </h2>
            {declarableSubstances.length === 0 ? (
              <p className="mt-4 text-sm text-[#9E9890]">Keine vorhanden.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {declarableSubstances.map((row) => (
                  <div key={row.key} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                    <p className="text-sm font-medium text-[#0A0A0A]">
                      {row.inciName || row.substanceName}
                    </p>
                    <p className="text-xs text-[#9E9890]">
                      Anteil: {row.totalPercentage.toFixed(6)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Allergene</h2>
            {allergenSubstances.length === 0 ? (
              <p className="mt-4 text-sm text-[#9E9890]">Keine vorhanden.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {allergenSubstances.map((row) => (
                  <div key={row.key} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                    <p className="text-sm font-medium text-[#0A0A0A]">
                      {row.inciName || row.substanceName}
                    </p>
                    <p className="text-xs text-[#9E9890]">
                      Anteil: {row.totalPercentage.toFixed(6)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
