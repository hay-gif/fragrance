"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { buildReleaseGate } from "@/lib/releaseGate";
import { evaluateFragranceComplianceRules } from "@/lib/fragranceCompliance";

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

type FragranceAccord = {
  accordId: string;
  percentage: number;
};

type Accord = {
  id: string;
  name: string;
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
  category: string;
};

type RawMaterialSubstance = {
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type FragranceDocument = {
  id: string;
  documentType: string;
  title: string;
};

type RawMaterialDocument = {
  id: string;
  rawMaterialId: string;
  documentType: string;
  title: string;
  validUntil: string;
};

type SubstanceToxicologyProfile = {
  id: string;
  inciName: string;
  substanceName: string;
  casNumber: string;
  ecNumber: string;
  noaelMgPerKgBwDay: number | null;
  systemicThresholdNote: string;
  toxicologicalEndpoint: string;
  sourceReference: string;
  notes: string;
};

type ReleaseDossier = {
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
  batchCodeScheme: string;
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
  labelLanguage: string;
  cpnpCategory: string;
  cpnpFrameFormulation: string;
  cpnpNanomatNote: string;
  exposureNotes: string;
  toxicologyNotes: string;
  mosNotes: string;
  releaseNotes: string;
  labelInciText: string;
  exposureProductType: string;
  exposureAmountGPerDay: string;
  exposureFrequencyPerDay: string;
  exposureBodyWeightKg: string;
  exposureRetentionFactor: string;
  exposureBioavailabilityFactor: string;
};

type FlattenedSubstance = {
  key: string;
  substanceName: string;
  inciName: string;
  totalPercentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
  noaelMgPerKgBwDay: number | null;
  sourceReference: string;
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

type DbFragranceAccordRow = {
  accord_id: string;
  percentage: number;
};

type DbAccordRow = {
  id: string;
  name: string;
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
  category: string | null;
};

type DbRawMaterialSubstanceRow = {
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage: number;
  is_allergen: boolean;
  is_declarable: boolean;
};

type DbFragranceDocumentRow = {
  id: string;
  document_type: string;
  title: string;
};

type DbRawMaterialDocumentRow = {
  id: string;
  raw_material_id: string;
  document_type: string;
  title: string;
  valid_until: string | null;
};

type DbToxicologyRow = {
  id: string;
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

type DbDossierRow = {
  product_name: string | null;
  brand_name: string | null;
  responsible_person: string | null;
  responsible_person_address: string | null;
  intended_use: string | null;
  product_form: string | null;
  target_market: string | null;
  application_area: string | null;
  consumer_group: string | null;
  formula_version: string | null;
  batch_code_scheme: string | null;
  nominal_content: string | null;
  storage_conditions: string | null;
  shelf_life_text: string | null;
  pao_text: string | null;
  manufacturing_site: string | null;
  manufacturing_method_summary: string | null;
  gmp_notes: string | null;
  label_claims: string | null;
  warning_text: string | null;
  usage_text: string | null;
  label_language: string | null;
  cpnp_category: string | null;
  cpnp_frame_formulation: string | null;
  cpnp_nanomat_note: string | null;
  exposure_notes: string | null;
  toxicology_notes: string | null;
  mos_notes: string | null;
  release_notes: string | null;
  label_inci_text: string | null;
  exposure_product_type: string | null;
  exposure_amount_g_per_day: number | null;
  exposure_frequency_per_day: number | null;
  exposure_body_weight_kg: number | null;
  exposure_retention_factor: number | null;
  exposure_bioavailability_factor: number | null;
};

function getDefaultDossier(fragrance: Fragrance): ReleaseDossier {
  return {
    productName: fragrance.name,
    brandName: "",
    responsiblePerson: "",
    responsiblePersonAddress: "",
    intendedUse: "Parfüm zur äußeren Anwendung auf der Haut.",
    productForm: "alcohol_based_perfume",
    targetMarket: "EU",
    applicationArea: "external_use",
    consumerGroup: "general_population",
    formulaVersion: "v1",
    batchCodeScheme: "",
    nominalContent: `${fragrance.sizeMl} ml`,
    storageConditions: "Kühl, trocken und lichtgeschützt lagern.",
    shelfLifeText: "",
    paoText: "",
    manufacturingSite: "",
    manufacturingMethodSummary: "",
    gmpNotes: "",
    labelClaims: "",
    warningText: "Nur zur äußeren Anwendung. Kontakt mit Augen vermeiden.",
    usageText: "Auf die Haut aufsprühen.",
    labelLanguage: "de",
    cpnpCategory: "",
    cpnpFrameFormulation: "",
    cpnpNanomatNote: "",
    exposureNotes: "",
    toxicologyNotes: "",
    mosNotes: "",
    releaseNotes: "",
    labelInciText: "",
    exposureProductType: "fine_fragrance",
    exposureAmountGPerDay: "0.75",
    exposureFrequencyPerDay: "1",
    exposureBodyWeightKg: "60",
    exposureRetentionFactor: "1",
    exposureBioavailabilityFactor: "1",
  };
}

function getExposurePreset(productType: string) {
  if (productType === "fine_fragrance") {
    return {
      amountGPerDay: "0.75",
      frequencyPerDay: "1",
      bodyWeightKg: "60",
      retentionFactor: "1",
      bioavailabilityFactor: "1",
    };
  }

  if (productType === "body_mist") {
    return {
      amountGPerDay: "1.5",
      frequencyPerDay: "2",
      bodyWeightKg: "60",
      retentionFactor: "1",
      bioavailabilityFactor: "1",
    };
  }

  return {
    amountGPerDay: "0.75",
    frequencyPerDay: "1",
    bodyWeightKg: "60",
    retentionFactor: "1",
    bioavailabilityFactor: "1",
  };
}

function analyzeDocumentCoverage(
  materials: RawMaterial[],
  documents: RawMaterialDocument[],
) {
  const missing: string[] = [];
  const expired: string[] = [];
  const expiringSoon: string[] = [];
  const ok: string[] = [];

  const now = new Date();
  const soon = new Date();
  soon.setMonth(soon.getMonth() + 1);

  for (const material of materials) {
    const docs = documents.filter((d) => d.rawMaterialId === material.id);

    const sdsDocs = docs.filter((d) => d.documentType === "sds");
    const ifraDocs = docs.filter((d) => d.documentType === "ifra");

    if (sdsDocs.length === 0 || ifraDocs.length === 0) {
      missing.push(material.name);
      continue;
    }

    const relevantDates = [...sdsDocs, ...ifraDocs]
      .map((doc) => doc.validUntil)
      .filter(Boolean)
      .map((value) => new Date(value));

    if (relevantDates.length === 0) {
      missing.push(material.name);
      continue;
    }

    const hasExpired = relevantDates.some((date) => date < now);
    const hasExpiringSoon = relevantDates.some(
      (date) => date >= now && date < soon,
    );

    if (hasExpired) {
      expired.push(material.name);
    } else if (hasExpiringSoon) {
      expiringSoon.push(material.name);
    } else {
      ok.push(material.name);
    }
  }

  return { missing, expired, expiringSoon, ok };
}

export default function FragranceDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [documentCoverage, setDocumentCoverage] = useState<{
    missing: string[];
    expired: string[];
    expiringSoon: string[];
    ok: string[];
  }>({
    missing: [],
    expired: [],
    expiringSoon: [],
    ok: [],
  });
  const [complianceRules, setComplianceRules] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [fragrance, setFragrance] = useState<Fragrance | null>(null);
  const [dossier, setDossier] = useState<ReleaseDossier | null>(null);

  const [fragranceAccords, setFragranceAccords] = useState<FragranceAccord[]>(
    [],
  );
  const [accords, setAccords] = useState<Accord[]>([]);
  const [accordComponents, setAccordComponents] = useState<AccordComponent[]>(
    [],
  );
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [rawMaterialSubstances, setRawMaterialSubstances] = useState<
    RawMaterialSubstance[]
  >([]);
  const [fragranceDocuments, setFragranceDocuments] = useState<
    FragranceDocument[]
  >([]);
  const [rawMaterialDocuments, setRawMaterialDocuments] = useState<
    RawMaterialDocument[]
  >([]);
  const [toxicologyProfiles, setToxicologyProfiles] = useState<
    SubstanceToxicologyProfile[]
  >([]);

  useEffect(() => {    async function loadData() {
      const resolvedParams = await params;

      const { data: complianceRuleRows, error: complianceRuleError } =
        await supabase
          .from("compliance_rules")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

      if (complianceRuleError) {
        console.error(
          "Fehler beim Laden der Compliance-Regeln:",
          complianceRuleError,
        );
      } else {
        setComplianceRules(complianceRuleRows ?? []);
      }

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

      const [
        dossierResult,
        fragranceAccordResult,
        accordResult,
        fragranceDocumentResult,
      ] = await Promise.all([
        supabase
          .from("fragrance_release_dossiers")
          .select("*")
          .eq("fragrance_id", resolvedParams.id)
          .maybeSingle(),
        supabase
          .from("fragrance_accords")
          .select("accord_id, percentage")
          .eq("fragrance_id", resolvedParams.id),
        supabase.from("accords").select("id, name"),
        supabase
          .from("fragrance_documents")
          .select("id, document_type, title")
          .eq("fragrance_id", resolvedParams.id),
      ]);

      if (
        fragranceAccordResult.error ||
        accordResult.error ||
        fragranceDocumentResult.error
      ) {
        console.error(
          "Fehler beim Laden der Dossier-Basisdaten:",
          fragranceAccordResult.error ||
            accordResult.error ||
            fragranceDocumentResult.error,
        );
        setLoading(false);
        return;
      }

      if (dossierResult.error) {
        console.error("Fehler beim Laden des Dossiers:", dossierResult.error);
        setDossier(getDefaultDossier(mappedFragrance));
      } else if (!dossierResult.data) {
        setDossier(getDefaultDossier(mappedFragrance));
      } else {
        const row = dossierResult.data as DbDossierRow;
        setDossier({
          productName: row.product_name ?? mappedFragrance.name,
          brandName: row.brand_name ?? "",
          responsiblePerson: row.responsible_person ?? "",
          responsiblePersonAddress: row.responsible_person_address ?? "",
          intendedUse: row.intended_use ?? "",
          productForm: row.product_form ?? "alcohol_based_perfume",
          targetMarket: row.target_market ?? "EU",
          applicationArea: row.application_area ?? "",
          consumerGroup: row.consumer_group ?? "general_population",
          formulaVersion: row.formula_version ?? "v1",
          batchCodeScheme: row.batch_code_scheme ?? "",
          nominalContent: row.nominal_content ?? `${mappedFragrance.sizeMl} ml`,
          storageConditions: row.storage_conditions ?? "",
          shelfLifeText: row.shelf_life_text ?? "",
          paoText: row.pao_text ?? "",
          manufacturingSite: row.manufacturing_site ?? "",
          manufacturingMethodSummary: row.manufacturing_method_summary ?? "",
          gmpNotes: row.gmp_notes ?? "",
          labelClaims: row.label_claims ?? "",
          warningText: row.warning_text ?? "",
          usageText: row.usage_text ?? "",
          labelLanguage: row.label_language ?? "de",
          cpnpCategory: row.cpnp_category ?? "",
          cpnpFrameFormulation: row.cpnp_frame_formulation ?? "",
          cpnpNanomatNote: row.cpnp_nanomat_note ?? "",
          exposureNotes: row.exposure_notes ?? "",
          toxicologyNotes: row.toxicology_notes ?? "",
          mosNotes: row.mos_notes ?? "",
          releaseNotes: row.release_notes ?? "",
          labelInciText: row.label_inci_text ?? "",
          exposureProductType: row.exposure_product_type ?? "fine_fragrance",
          exposureAmountGPerDay:
            row.exposure_amount_g_per_day === null
              ? "0.75"
              : String(row.exposure_amount_g_per_day),
          exposureFrequencyPerDay:
            row.exposure_frequency_per_day === null
              ? "1"
              : String(row.exposure_frequency_per_day),
          exposureBodyWeightKg:
            row.exposure_body_weight_kg === null
              ? "60"
              : String(row.exposure_body_weight_kg),
          exposureRetentionFactor:
            row.exposure_retention_factor === null
              ? "1"
              : String(row.exposure_retention_factor),
          exposureBioavailabilityFactor:
            row.exposure_bioavailability_factor === null
              ? "1"
              : String(row.exposure_bioavailability_factor),
        });
      }

      const mappedFragranceAccords: FragranceAccord[] = (
        fragranceAccordResult.data ?? []
      ).map((row: DbFragranceAccordRow) => ({
        accordId: row.accord_id,
        percentage: Number(row.percentage),
      }));

      setFragranceAccords(mappedFragranceAccords);

      setAccords(
        (accordResult.data ?? []).map((row: DbAccordRow) => ({
          id: row.id,
          name: row.name,
        })),
      );

      setFragranceDocuments(
        (fragranceDocumentResult.data ?? []).map(
          (row: DbFragranceDocumentRow) => ({
            id: row.id,
            documentType: row.document_type,
            title: row.title,
          }),
        ),
      );

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

      if (rawMaterialIds.length > 0) {
        const [
          rawMaterialResult,
          rawMaterialSubstancesResult,
          rawMaterialDocumentsResult,
        ] = await Promise.all([
          supabase
            .from("raw_materials")
            .select("id, name, inci_label_name, category")
            .in("id", rawMaterialIds),
          supabase
            .from("raw_material_substances")
            .select(
              "raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable",
            )
            .in("raw_material_id", rawMaterialIds),
          supabase
            .from("raw_material_documents")
            .select("id, raw_material_id, document_type, title, valid_until")
            .in("raw_material_id", rawMaterialIds),
        ]);

        if (
          rawMaterialResult.error ||
          rawMaterialSubstancesResult.error ||
          rawMaterialDocumentsResult.error
        ) {
          console.error(
            "Fehler beim Laden der Rohstoffdaten:",
            rawMaterialResult.error ||
              rawMaterialSubstancesResult.error ||
              rawMaterialDocumentsResult.error,
          );
          setLoading(false);
          return;
        }

        const mappedRawMaterials = (rawMaterialResult.data ?? []).map(
          (row: DbRawMaterialRow) => ({
            id: row.id,
            name: row.name,
            inciLabelName: row.inci_label_name ?? "",
            category: row.category ?? "",
          }),
        );

        const mappedSubstances = (rawMaterialSubstancesResult.data ?? []).map(
          (row: DbRawMaterialSubstanceRow) => ({
            rawMaterialId: row.raw_material_id,
            substanceName: row.substance_name,
            inciName: row.inci_name ?? "",
            percentage: Number(row.percentage),
            isAllergen: row.is_allergen,
            isDeclarable: row.is_declarable,
          }),
        );

        const mappedRawMaterialDocuments = (
          rawMaterialDocumentsResult.data ?? []
        ).map((row: DbRawMaterialDocumentRow) => ({
          id: row.id,
          rawMaterialId: row.raw_material_id,
          documentType: row.document_type,
          title: row.title,
          validUntil: row.valid_until ?? "",
        }));

        setRawMaterials(mappedRawMaterials);
        setRawMaterialSubstances(mappedSubstances);
        setRawMaterialDocuments(mappedRawMaterialDocuments);

        const possibleInciNames = Array.from(
          new Set(
            mappedSubstances
              .map((row) => row.inciName.trim() || row.substanceName.trim())
              .filter(Boolean),
          ),
        );

        if (possibleInciNames.length > 0) {
          const { data: toxRows, error: toxError } = await supabase
            .from("substance_toxicology_profiles")
            .select("*")
            .in("inci_name", possibleInciNames);

          if (toxError) {
            console.error(
              "Fehler beim Laden der Toxikologie-Profile:",
              toxError,
            );
          } else {
            setToxicologyProfiles(
              (toxRows ?? []).map((row: DbToxicologyRow) => ({
                id: row.id,
                inciName: row.inci_name,
                substanceName: row.substance_name,
                casNumber: row.cas_number ?? "",
                ecNumber: row.ec_number ?? "",
                noaelMgPerKgBwDay:
                  row.noael_mg_per_kg_bw_day === null
                    ? null
                    : Number(row.noael_mg_per_kg_bw_day),
                systemicThresholdNote: row.systemic_threshold_note ?? "",
                toxicologicalEndpoint: row.toxicological_endpoint ?? "",
                sourceReference: row.source_reference ?? "",
                notes: row.notes ?? "",
              })),
            );
          }
        }
      }

      setLoading(false);
    }

    loadData();
  }, [params]);

  useEffect(() => {
    if (!rawMaterials.length) return;

    const coverage = analyzeDocumentCoverage(
      rawMaterials,
      rawMaterialDocuments,
    );
    setDocumentCoverage(coverage);
  }, [rawMaterials, rawMaterialDocuments]);

  const accordMap = useMemo(
    () => new Map(accords.map((accord) => [accord.id, accord.name])),
    [accords],
  );

  const rawMaterialMap = useMemo(
    () => new Map(rawMaterials.map((material) => [material.id, material])),
    [rawMaterials],
  );

  const toxicologyMap = useMemo(
    () => new Map(toxicologyProfiles.map((row) => [row.inciName, row])),
    [toxicologyProfiles],
  );

  const formulaSum = useMemo(
    () => fragranceAccords.reduce((sum, row) => sum + row.percentage, 0),
    [fragranceAccords],
  );

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
        noaelMgPerKgBwDay: number | null;
        sourceReference: string;
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

        const inciKey =
          substance.inciName.trim() || substance.substanceName.trim();
        const tox = toxicologyMap.get(inciKey);

        const key = `${inciKey}::${substance.isAllergen ? "1" : "0"}::${
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
            noaelMgPerKgBwDay: tox?.noaelMgPerKgBwDay ?? null,
            sourceReference: tox?.sourceReference ?? "",
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
        noaelMgPerKgBwDay: value.noaelMgPerKgBwDay,
        sourceReference: value.sourceReference,
      }))
      .sort((a, b) => b.totalPercentage - a.totalPercentage);
  }, [flattenedRawMaterials, rawMaterialSubstances, toxicologyMap]);

  const declarableSubstances = useMemo(
    () => flattenedSubstances.filter((row) => row.isDeclarable),
    [flattenedSubstances],
  );

  const allergenSubstances = useMemo(
    () => flattenedSubstances.filter((row) => row.isAllergen),
    [flattenedSubstances],
  );

  const exposureInputs = useMemo(() => {
    const amountGPerDay = Number(dossier?.exposureAmountGPerDay ?? "0");
    const frequencyPerDay = Number(dossier?.exposureFrequencyPerDay ?? "0");
    const bodyWeightKg = Number(dossier?.exposureBodyWeightKg ?? "0");
    const retentionFactor = Number(dossier?.exposureRetentionFactor ?? "0");
    const bioavailabilityFactor = Number(
      dossier?.exposureBioavailabilityFactor ?? "0",
    );

    return {
      amountGPerDay: Number.isNaN(amountGPerDay) ? 0 : amountGPerDay,
      frequencyPerDay: Number.isNaN(frequencyPerDay) ? 0 : frequencyPerDay,
      bodyWeightKg: Number.isNaN(bodyWeightKg) ? 0 : bodyWeightKg,
      retentionFactor: Number.isNaN(retentionFactor) ? 0 : retentionFactor,
      bioavailabilityFactor: Number.isNaN(bioavailabilityFactor)
        ? 0
        : bioavailabilityFactor,
    };
  }, [dossier]);

  const estimatedDailyProductExposureG = useMemo(() => {
    return exposureInputs.amountGPerDay * exposureInputs.frequencyPerDay;
  }, [exposureInputs]);

  const substanceExposureRows = useMemo(() => {
    if (exposureInputs.bodyWeightKg <= 0) return [];

    return flattenedSubstances.map((row) => {
      const concentrationFraction = row.totalPercentage / 100;

      const dailySubstanceExposureG =
        estimatedDailyProductExposureG *
        concentrationFraction *
        exposureInputs.retentionFactor;

      const systemicExposureMgPerKgBwDay =
        exposureInputs.bodyWeightKg > 0
          ? (dailySubstanceExposureG *
              1000 *
              exposureInputs.bioavailabilityFactor) /
            exposureInputs.bodyWeightKg
          : null;

      const mos =
        row.noaelMgPerKgBwDay !== null &&
        systemicExposureMgPerKgBwDay !== null &&
        systemicExposureMgPerKgBwDay > 0
          ? row.noaelMgPerKgBwDay / systemicExposureMgPerKgBwDay
          : null;

      return {
        ...row,
        dailySubstanceExposureG,
        systemicExposureMgPerKgBwDay,
        mos,
      };
    });
  }, [flattenedSubstances, estimatedDailyProductExposureG, exposureInputs]);

  const generatedInci = useMemo(() => {
    return Array.from(
      new Set(
        declarableSubstances
          .map((row) => row.inciName.trim() || row.substanceName.trim())
          .filter(Boolean),
      ),
    ).join(", ");
  }, [declarableSubstances]);

  const formulaSheet = useMemo(() => {
    return fragranceAccords.map((row, index) => ({
      index,
      accordName: accordMap.get(row.accordId) ?? "Unbekannter Accord",
      percentage: row.percentage,
    }));
  }, [fragranceAccords, accordMap]);

  const rawMaterialDocumentCoverage = useMemo(() => {
    return flattenedRawMaterials.map((row) => {
      const docs = rawMaterialDocuments.filter(
        (doc) => doc.rawMaterialId === row.rawMaterialId,
      );
      const hasSds = docs.some((doc) => doc.documentType === "sds");
      const hasIfra = docs.some((doc) => doc.documentType === "ifra");

      return {
        rawMaterialId: row.rawMaterialId,
        name: row.name,
        hasSds,
        hasIfra,
        docs,
      };
    });
  }, [flattenedRawMaterials, rawMaterialDocuments]);

  const dossierStatus = useMemo(() => {
    const missingToxicology = flattenedSubstances.filter(
      (row) => row.noaelMgPerKgBwDay === null,
    ).length;

    const missingSds = rawMaterialDocumentCoverage.filter(
      (row) => !row.hasSds,
    ).length;
    const missingIfra = rawMaterialDocumentCoverage.filter(
      (row) => !row.hasIfra,
    ).length;

    return {
      formulaReady: formulaSum > 0 && Math.abs(formulaSum - 100) <= 0.01,
      inciReady: generatedInci.trim().length > 0,
      allergensReady: allergenSubstances.length > 0,
      sdsCoverageReady: missingSds === 0,
      ifraCoverageReady: missingIfra === 0,
      toxicologyCoverageReady: missingToxicology === 0,
      documentUploads: fragranceDocuments.length,
    };
  }, [
    formulaSum,
    generatedInci,
    allergenSubstances.length,
    rawMaterialDocumentCoverage,
    flattenedSubstances,
    fragranceDocuments.length,
  ]);
  const fragranceRuleResults = useMemo(() => {
    return evaluateFragranceComplianceRules({
      rules: complianceRules.map((rule: any) => ({
        id: rule.id,
        ruleName: rule.rule_name,
        ruleScope: rule.rule_scope,
        targetName: rule.target_name ?? "",
        secondaryTargetName: rule.secondary_target_name ?? "",
        targetType: rule.target_type ?? "name",
        productType: rule.product_type ?? "all",
        appliesToStage: rule.applies_to_stage ?? "all",
        ruleType: rule.rule_type,
        operator: rule.operator ?? "gt",
        thresholdPercentage:
          rule.threshold_percentage === null
            ? null
            : Number(rule.threshold_percentage),
        severity: rule.severity,
        groupName: rule.group_name ?? "",
        isActive: rule.is_active,
      })),
      rawMaterials: flattenedRawMaterials.map((row) => ({
        rawMaterialName: row.name,
        percentage: row.effectivePercentage,
        category: rawMaterialMap.get(row.rawMaterialId)?.category ?? "",
      })),
      substances: flattenedSubstances.map((row) => ({
        substanceName: row.substanceName,
        inciName: row.inciName,
        percentage: row.totalPercentage,
        isAllergen: row.isAllergen,
        isDeclarable: row.isDeclarable,
      })),
      stage: "fragrance",
      productType: dossier?.exposureProductType || "fine_fragrance",
    });
  }, [
    complianceRules,
    flattenedRawMaterials,
    flattenedSubstances,
    rawMaterialMap,
    dossier,
  ]);
  const fragranceComplianceSummary = useMemo(() => {
    const blockers = fragranceRuleResults
      .filter((row) => row.severity === "block")
      .map((row) => row.message);

    const warnings = fragranceRuleResults
      .filter((row) => row.severity === "warning")
      .map((row) => row.message);

    const formulaOk = formulaSum > 0 && Math.abs(formulaSum - 100) <= 0.01;
    const inciOk = generatedInci.trim().length > 0;
    const toxOk = dossierStatus.toxicologyCoverageReady;
    const docsOk =
      dossierStatus.sdsCoverageReady && dossierStatus.ifraCoverageReady;

    if (!formulaOk) {
      blockers.push(`Formelsumme ist ${formulaSum.toFixed(4)}% statt 100%.`);
    }

    if (!inciOk) {
      blockers.push("INCI ist aktuell nicht generierbar.");
    }

    if (!docsOk) {
      blockers.push("SDS- oder IFRA-Coverage ist unvollständig.");
    }

    if (!toxOk) {
      blockers.push("Toxikologie-Coverage ist unvollständig.");
    }

    const level: "green" | "yellow" | "red" =
      blockers.length > 0 ? "red" : warnings.length > 0 ? "yellow" : "green";

    let score = 100;
    score -= blockers.length * 20;
    score -= warnings.length * 8;
    if (score < 0) score = 0;

    return {
      level,
      score,
      blockers,
      warnings,
      readyRecommended: blockers.length === 0,
    };
  }, [fragranceRuleResults, formulaSum, generatedInci, dossierStatus]);
  const releaseGate = useMemo(() => {
    if (!fragrance) {
      return {
        isReady: false,
        blockers: ["Duftdaten werden noch geladen."],
      };
    }

    const baseGate = buildReleaseGate({
      sampleStatus: fragrance.sampleStatus,
      formulaReady: dossierStatus.formulaReady,
      inciReady: dossierStatus.inciReady,
      sdsCoverageReady: dossierStatus.sdsCoverageReady,
      ifraCoverageReady: dossierStatus.ifraCoverageReady,
      toxicologyCoverageReady: dossierStatus.toxicologyCoverageReady,
      missingDocuments: documentCoverage.missing,
      expiredDocuments: documentCoverage.expired,
    });

    const fragranceBlockers = fragranceComplianceSummary.readyRecommended
      ? []
      : fragranceComplianceSummary.blockers;

    return {
      isReady: baseGate.isReady && fragranceComplianceSummary.readyRecommended,
      blockers: [...baseGate.blockers, ...fragranceBlockers],
    };
  }, [fragrance, dossierStatus, documentCoverage, fragranceComplianceSummary]);

  function generateAutoDossier() {
    if (!fragrance || !dossier) return;

    const preset = getExposurePreset(
      dossier.exposureProductType.trim() || "fine_fragrance",
    );

    const missingSdsNames = rawMaterialDocumentCoverage
      .filter((row) => !row.hasSds)
      .map((row) => row.name);

    const missingIfraNames = rawMaterialDocumentCoverage
      .filter((row) => !row.hasIfra)
      .map((row) => row.name);

    const missingToxicologyNames = flattenedSubstances
      .filter((row) => row.noaelMgPerKgBwDay === null)
      .map((row) => row.inciName.trim() || row.substanceName.trim());

    const lowMosNames = substanceExposureRows
      .filter((row) => row.mos !== null && row.mos < 100)
      .map((row) => row.inciName.trim() || row.substanceName.trim());

    const nonCalculableMosNames = substanceExposureRows
      .filter((row) => row.mos === null)
      .map((row) => row.inciName.trim() || row.substanceName.trim());

    const generatedReleaseNotesParts: string[] = [];

    if (documentCoverage.missing.length > 0) {
      generatedReleaseNotesParts.push("Fehlende Rohstoffdokumente vorhanden.");
    }
    if (fragrance.sampleStatus !== "tested") {
      generatedReleaseNotesParts.push("Sample wurde noch nicht getestet.");
    }

    if (documentCoverage.expired.length > 0) {
      generatedReleaseNotesParts.push(
        `Abgelaufene Rohstoffdokumente: ${documentCoverage.expired.join(", ")}`,
      );
    }

    if (documentCoverage.expiringSoon.length > 0) {
      generatedReleaseNotesParts.push(
        `Bald ablaufende Rohstoffdokumente: ${documentCoverage.expiringSoon.join(", ")}`,
      );
    }

    if (missingSdsNames.length > 0) {
      generatedReleaseNotesParts.push(
        `Fehlende SDS für: ${missingSdsNames.join(", ")}`,
      );
    }

    if (missingIfraNames.length > 0) {
      generatedReleaseNotesParts.push(
        `Fehlende IFRA-Unterlagen für: ${missingIfraNames.join(", ")}`,
      );
    }

    if (missingToxicologyNames.length > 0) {
      generatedReleaseNotesParts.push(
        `Fehlende toxikologische Referenzwerte für: ${missingToxicologyNames.join(
          ", ",
        )}`,
      );
    }

    if (lowMosNames.length > 0) {
      generatedReleaseNotesParts.push(
        `MOS unter 100 für: ${lowMosNames.join(", ")}`,
      );
    }

    if (nonCalculableMosNames.length > 0) {
      generatedReleaseNotesParts.push(
        `MOS aktuell nicht berechenbar für: ${nonCalculableMosNames.join(", ")}`,
      );
    }

    if (formulaSum > 0 && Math.abs(formulaSum - 100) > 0.01) {
      generatedReleaseNotesParts.push(
        `Formelsumme ist aktuell ${formulaSum.toFixed(4)}% und nicht 100%.`,
      );
    }


    setDossier((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        productName: prev.productName.trim() || fragrance.name,
        intendedUse:
          prev.intendedUse.trim() ||
          "Parfüm zur äußeren Anwendung auf der Haut.",
        productForm: prev.productForm.trim() || "alcohol_based_perfume",
        targetMarket: prev.targetMarket.trim() || "EU",
        applicationArea: prev.applicationArea.trim() || "external_use",
        consumerGroup: prev.consumerGroup.trim() || "general_population",
        formulaVersion: prev.formulaVersion.trim() || "v1",
        nominalContent: prev.nominalContent.trim() || `${fragrance.sizeMl} ml`,
        storageConditions:
          prev.storageConditions.trim() ||
          "Kühl, trocken und lichtgeschützt lagern.",
        warningText:
          prev.warningText.trim() ||
          "Nur zur äußeren Anwendung. Kontakt mit Augen vermeiden.",
        usageText: prev.usageText.trim() || "Auf die Haut aufsprühen.",
        labelLanguage: prev.labelLanguage.trim() || "de",
        labelInciText: prev.labelInciText.trim() || generatedInci,

        manufacturingMethodSummary:
          prev.manufacturingMethodSummary.trim() ||
          "Rohstoffe gemäß freigegebener Formel dosieren, homogen mischen, reifen lassen, filtrieren sofern erforderlich, in Primärverpackung abfüllen, verschließen, etikettieren und dokumentieren.",

        gmpNotes:
          prev.gmpNotes.trim() ||
          "Herstellung nach dokumentiertem internen Prozess mit Chargenbezug, Rohstoffprüfung, Abfüllkontrolle und Freigabedokumentation.",

        toxicologyNotes:
          prev.toxicologyNotes.trim() ||
          (missingToxicologyNames.length > 0
            ? `Für folgende Stoffe fehlen noch toxikologische Referenzwerte: ${missingToxicologyNames.join(
                ", ",
              )}`
            : "Toxikologische Referenzwerte sind für die aktuell erkannten Stoffe weitgehend hinterlegt oder es bestehen keine offenen Hinweise aus der Vorprüfung."),

        mosNotes:
          prev.mosNotes.trim() ||
          "MOS-Berechnung vorbereiten, sobald Expositionsparameter und NOAEL-Werte vollständig vorliegen.",

        cpnpNanomatNote:
          prev.cpnpNanomatNote.trim() ||
          "Aktuell keine Nanomaterial-Angabe automatisch erkannt. Manuelle Prüfung erforderlich.",

        labelClaims:
          prev.labelClaims.trim() ||
          (fragrance.category.trim()
            ? `Duftkategorie: ${fragrance.category}`
            : ""),

        releaseNotes:
          prev.releaseNotes.trim() || generatedReleaseNotesParts.join("\n"),

        exposureProductType:
          prev.exposureProductType.trim() || "fine_fragrance",
        exposureAmountGPerDay:
          prev.exposureAmountGPerDay.trim() || preset.amountGPerDay,
        exposureFrequencyPerDay:
          prev.exposureFrequencyPerDay.trim() || preset.frequencyPerDay,
        exposureBodyWeightKg:
          prev.exposureBodyWeightKg.trim() || preset.bodyWeightKg,
        exposureRetentionFactor:
          prev.exposureRetentionFactor.trim() || preset.retentionFactor,
        exposureBioavailabilityFactor:
          prev.exposureBioavailabilityFactor.trim() ||
          preset.bioavailabilityFactor,
      };
    });

    setMessage("Automatische Vorbefüllung erzeugt.");
  }

  async function setFragranceReleaseState(nextIsPublic: boolean) {
    if (!fragrance) return;

    if (nextIsPublic && !releaseGate.isReady) {
      alert(
        `Dieser Duft ist nicht release-fähig.\n\nBlocker:\n${releaseGate.blockers.join("\n")}`,
      );
      return;
    }

    const { error } = await supabase
      .from("fragrances")
      .update({
        is_public: nextIsPublic,
        status: nextIsPublic ? "active" : "draft",
      })
      .eq("id", fragrance.id);

    if (error) {
      console.error("Fehler beim Aktualisieren des Release-Status:", error);
      setMessage("Release-Status konnte nicht gespeichert werden.");
      return;
    }

    setFragrance((prev) =>
      prev
        ? {
            ...prev,
            isPublic: nextIsPublic,
            status: nextIsPublic ? "active" : "draft",
          }
        : prev,
    );

    setMessage(
      nextIsPublic
        ? "Duft wurde freigegeben."
        : "Duft wurde zurück auf privat gesetzt.",
    );
  }
  async function saveDossier() {
    if (!fragrance || !dossier) return;

    setSaving(true);
    setMessage("");

    const currentDossier = dossier;

    const payload = {
      fragrance_id: fragrance.id,
      updated_at: new Date().toISOString(),

      product_name: currentDossier.productName.trim(),
      brand_name: currentDossier.brandName.trim(),
      responsible_person: currentDossier.responsiblePerson.trim(),
      responsible_person_address:
        currentDossier.responsiblePersonAddress.trim(),

      intended_use: currentDossier.intendedUse.trim(),
      product_form: currentDossier.productForm.trim(),
      target_market: currentDossier.targetMarket.trim(),
      application_area: currentDossier.applicationArea.trim(),
      consumer_group: currentDossier.consumerGroup.trim(),

      formula_version: currentDossier.formulaVersion.trim(),
      batch_code_scheme: currentDossier.batchCodeScheme.trim(),
      nominal_content: currentDossier.nominalContent.trim(),

      storage_conditions: currentDossier.storageConditions.trim(),
      shelf_life_text: currentDossier.shelfLifeText.trim(),
      pao_text: currentDossier.paoText.trim(),

      manufacturing_site: currentDossier.manufacturingSite.trim(),
      manufacturing_method_summary:
        currentDossier.manufacturingMethodSummary.trim(),
      gmp_notes: currentDossier.gmpNotes.trim(),

      label_claims: currentDossier.labelClaims.trim(),
      warning_text: currentDossier.warningText.trim(),
      usage_text: currentDossier.usageText.trim(),
      label_language: currentDossier.labelLanguage.trim(),
      label_inci_text: currentDossier.labelInciText.trim(),

      cpnp_category: currentDossier.cpnpCategory.trim(),
      cpnp_frame_formulation: currentDossier.cpnpFrameFormulation.trim(),
      cpnp_nanomat_note: currentDossier.cpnpNanomatNote.trim(),

      exposure_notes: currentDossier.exposureNotes.trim(),
      toxicology_notes: currentDossier.toxicologyNotes.trim(),
      mos_notes: currentDossier.mosNotes.trim(),

      release_notes: currentDossier.releaseNotes.trim(),

      exposure_product_type: currentDossier.exposureProductType.trim(),
      exposure_amount_g_per_day:
        currentDossier.exposureAmountGPerDay.trim() === ""
          ? null
          : Number(currentDossier.exposureAmountGPerDay),
      exposure_frequency_per_day:
        currentDossier.exposureFrequencyPerDay.trim() === ""
          ? null
          : Number(currentDossier.exposureFrequencyPerDay),
      exposure_body_weight_kg:
        currentDossier.exposureBodyWeightKg.trim() === ""
          ? null
          : Number(currentDossier.exposureBodyWeightKg),
      exposure_retention_factor:
        currentDossier.exposureRetentionFactor.trim() === ""
          ? null
          : Number(currentDossier.exposureRetentionFactor),
      exposure_bioavailability_factor:
        currentDossier.exposureBioavailabilityFactor.trim() === ""
          ? null
          : Number(currentDossier.exposureBioavailabilityFactor),
    };

    const { error } = await supabase
      .from("fragrance_release_dossiers")
      .upsert(payload as never);

    if (error) {
      console.error("Fehler beim Speichern des Dossiers:", error);
      setMessage("Dossier konnte nicht gespeichert werden.");
      setSaving(false);
      return;
    }
    if (fragrance.isPublic && !releaseGate.isReady) {
      const { error: unpublishError } = await supabase
        .from("fragrances")
        .update({
          is_public: false,
          status: "draft",
        })
        .eq("id", fragrance.id);

      if (!unpublishError) {
        setFragrance((prev) =>
          prev
            ? {
                ...prev,
                isPublic: false,
                status: "draft",
              }
            : prev,
        );

        setMessage(
          "Dossier gespeichert. Der Duft wurde automatisch auf privat gesetzt, weil die Release-Bedingungen nicht mehr erfüllt sind.",
        );
        setSaving(false);
        return;
      }
    }

    setMessage("Dossier gespeichert.");
    setSaving(false);
  }

  if (loading || !fragrance || !dossier) {
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
          href={`/fragrance/${fragrance.id}/documentation`}
          className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-sm transition-all hover:bg-white/20"
        >
          ← Zurück
        </Link>
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Fragrance OS</p>
        <h1 className="mt-2 text-3xl font-bold text-white">PIF / Release Dossier</h1>
        <p className="mt-1 text-sm text-white/50">{fragrance.name}</p>
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/fragrance/${fragrance.id}/pif`}
              className="inline-flex items-center gap-2 rounded-full bg-[#C9A96E] px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-[#0A0A0A] hover:bg-[#E8C99A] transition-colors"
            >
              PIF als PDF exportieren →
            </Link>
            <Link
              href={`/fragrance/${fragrance.id}/label`}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-white/10 transition-colors"
            >
              Etikett drucken →
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Formel</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {dossierStatus.formulaReady ? "OK" : "Offen"}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">INCI</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {dossierStatus.inciReady ? "OK" : "Offen"}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">SDS/IFRA</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {dossierStatus.sdsCoverageReady && dossierStatus.ifraCoverageReady
                ? "OK"
                : "Offen"}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Tox.</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {dossierStatus.toxicologyCoverageReady ? "OK" : "Offen"}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-4">
            <p className="text-[10px] uppercase tracking-widest text-[#9E9890]">Gate</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">
              {releaseGate.isReady ? "READY" : "BLOCKED"}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Compliance Panel</h2>

          <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
            <p>
              <span className="font-medium">Ampel:</span>{" "}
              {fragranceComplianceSummary.level === "green"
                ? "🟢 Grün"
                : fragranceComplianceSummary.level === "yellow"
                  ? "🟡 Gelb"
                  : "🔴 Rot"}
            </p>
            <p className="mt-2">
              <span className="font-medium">Score:</span>{" "}
              {fragranceComplianceSummary.score}/100
            </p>
            <p className="mt-2">
              <span className="font-medium">Ready empfohlen:</span>{" "}
              {fragranceComplianceSummary.readyRecommended ? "Ja" : "Nein"}
            </p>
          </div>

          {fragranceComplianceSummary.blockers.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
              <p className="text-sm font-medium text-[#0A0A0A]">Blocker</p>
              <div className="mt-2 space-y-2">
                {fragranceComplianceSummary.blockers.map(
                  (item: string, index: number) => (
                    <p key={index} className="text-sm text-[#6E6860]">
                      {item}
                    </p>
                  ),
                )}
              </div>
            </div>
          )}

          {fragranceComplianceSummary.warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
              <p className="text-sm font-medium text-[#0A0A0A]">Warnungen</p>
              <div className="mt-2 space-y-2">
                {fragranceComplianceSummary.warnings.map(
                  (item: string, index: number) => (
                    <p key={index} className="text-sm text-[#6E6860]">
                      {item}
                    </p>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Dokumentenstatus</h2>

          {documentCoverage.missing.length > 0 && (
            <p className="mt-3 text-sm text-red-600">
              Fehlend: {documentCoverage.missing.join(", ")}
            </p>
          )}

          {documentCoverage.expired.length > 0 && (
            <p className="mt-3 text-sm text-red-600">
              Abgelaufen: {documentCoverage.expired.join(", ")}
            </p>
          )}

          {documentCoverage.expiringSoon.length > 0 && (
            <p className="mt-3 text-sm text-orange-600">
              Läuft bald ab: {documentCoverage.expiringSoon.join(", ")}
            </p>
          )}

          {documentCoverage.ok.length > 0 && (
            <p className="mt-3 text-sm text-[#6E6860]">
              OK: {documentCoverage.ok.length} Materialien
            </p>
          )}
        </div>
        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Release-Freigabe</h2>

          <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
            <p className="font-medium">
              Status:{" "}
              {releaseGate.isReady
                ? "Für Release geeignet"
                : "Release blockiert"}
            </p>
          </div>

          {releaseGate.blockers.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Aktuell wurden keine kritischen Blocker erkannt.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {releaseGate.blockers.map((blocker, index) => (
                <div key={index} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
                  {blocker}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Release Gate</h2>

          <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
            <p>
              <span className="font-medium">Aktueller Status:</span>{" "}
              {fragrance.isPublic ? "Öffentlich" : "Privat"}
            </p>
            <p className="mt-2">
              <span className="font-medium">Release erlaubt:</span>{" "}
              {fragranceComplianceSummary.readyRecommended ? "Ja" : "Nein"}
            </p>
          </div>

          {fragranceComplianceSummary.blockers.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
              <p className="text-sm font-medium text-[#0A0A0A]">Release-Blocker</p>
              <div className="mt-2 space-y-2">
                {fragranceComplianceSummary.blockers.map(
                  (item: string, index: number) => (
                    <p key={index} className="text-sm text-[#6E6860]">
                      {item}
                    </p>
                  ),
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setFragranceReleaseState(true)}
              disabled={!releaseGate.isReady || fragrance.isPublic}
              className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Öffentlich freigeben
            </button>

            <button
              onClick={() => setFragranceReleaseState(false)}
              disabled={!fragrance.isPublic}
              className="rounded-full border border-[#E5E0D8] px-6 py-2.5 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Auf privat setzen
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Produktbeschreibung / PIF Basis
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Produktname
                </label>
                <input
                  value={dossier.productName}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, productName: e.target.value } : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Marke</label>
                <input
                  value={dossier.brandName}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, brandName: e.target.value } : prev,
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
                  value={dossier.responsiblePerson}
                  onChange={(e) =>
                    setDossier((prev) =>
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
                  Nominal Content
                </label>
                <input
                  value={dossier.nominalContent}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, nominalContent: e.target.value } : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Responsible Person Address
                </label>
                <textarea
                  value={dossier.responsiblePersonAddress}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev
                        ? { ...prev, responsiblePersonAddress: e.target.value }
                        : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Intended Use
                </label>
                <textarea
                  value={dossier.intendedUse}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, intendedUse: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">GMP Light / Herstellung</h2>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Formula Version
                </label>
                <input
                  value={dossier.formulaVersion}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, formulaVersion: e.target.value } : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Batch Code Scheme
                </label>
                <input
                  value={dossier.batchCodeScheme}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev
                        ? { ...prev, batchCodeScheme: e.target.value }
                        : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Manufacturing Site
                </label>
                <input
                  value={dossier.manufacturingSite}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev
                        ? { ...prev, manufacturingSite: e.target.value }
                        : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Manufacturing Method Summary
                </label>
                <textarea
                  value={dossier.manufacturingMethodSummary}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev
                        ? {
                            ...prev,
                            manufacturingMethodSummary: e.target.value,
                          }
                        : prev,
                    )
                  }
                  rows={4}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  GMP Notes
                </label>
                <textarea
                  value={dossier.gmpNotes}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, gmpNotes: e.target.value } : prev,
                    )
                  }
                  rows={4}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              INCI / Allergene / Formelblatt
            </h2>

            <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
              <p>
                <span className="font-medium">INCI Preview:</span>{" "}
                {generatedInci || "Noch nicht generierbar"}
              </p>
              <p className="mt-2">
                <span className="font-medium">Allergenliste:</span>{" "}
                {allergenSubstances.length > 0
                  ? allergenSubstances
                      .map((row) => row.inciName || row.substanceName)
                      .join(", ")
                  : "Keine"}
              </p>
              <p className="mt-2">
                <span className="font-medium">Formelsumme:</span>{" "}
                {formulaSum.toFixed(4)}%
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {formulaSheet.map((row) => (
                <div
                  key={`${row.index}-${row.accordName}`}
                  className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3"
                >
                  <p className="font-medium">{row.accordName}</p>
                  <p className="text-xs text-[#9E9890]">
                    {row.percentage.toFixed(4)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Produktlabel / CPNP / Safety Notes
            </h2>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">Claims</label>
                <textarea
                  value={dossier.labelClaims}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, labelClaims: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Label INCI Text
                </label>
                <textarea
                  value={dossier.labelInciText}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, labelInciText: e.target.value } : prev,
                    )
                  }
                  rows={4}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  placeholder={generatedInci}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Warning Text
                </label>
                <textarea
                  value={dossier.warningText}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, warningText: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Usage Text
                </label>
                <textarea
                  value={dossier.usageText}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, usageText: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  CPNP Category
                </label>
                <input
                  value={dossier.cpnpCategory}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, cpnpCategory: e.target.value } : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  CPNP Frame Formulation
                </label>
                <input
                  value={dossier.cpnpFrameFormulation}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev
                        ? { ...prev, cpnpFrameFormulation: e.target.value }
                        : prev,
                    )
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Exposure Notes
                </label>
                <textarea
                  value={dossier.exposureNotes}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, exposureNotes: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  Toxicology Notes
                </label>
                <textarea
                  value={dossier.toxicologyNotes}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev
                        ? { ...prev, toxicologyNotes: e.target.value }
                        : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                  MOS Notes
                </label>
                <textarea
                  value={dossier.mosNotes}
                  onChange={(e) =>
                    setDossier((prev) =>
                      prev ? { ...prev, mosNotes: e.target.value } : prev,
                    )
                  }
                  rows={3}
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">
            Expositionsberechnung / MOS-Vorstufe
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Exposure Product Type
              </label>
              <input
                value={dossier.exposureProductType}
                onChange={(e) =>
                  setDossier((prev) =>
                    prev
                      ? { ...prev, exposureProductType: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Amount g/day
              </label>
              <input
                value={dossier.exposureAmountGPerDay}
                onChange={(e) =>
                  setDossier((prev) =>
                    prev
                      ? { ...prev, exposureAmountGPerDay: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Frequency / day
              </label>
              <input
                value={dossier.exposureFrequencyPerDay}
                onChange={(e) =>
                  setDossier((prev) =>
                    prev
                      ? { ...prev, exposureFrequencyPerDay: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Body Weight kg
              </label>
              <input
                value={dossier.exposureBodyWeightKg}
                onChange={(e) =>
                  setDossier((prev) =>
                    prev
                      ? { ...prev, exposureBodyWeightKg: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Retention Factor
              </label>
              <input
                value={dossier.exposureRetentionFactor}
                onChange={(e) =>
                  setDossier((prev) =>
                    prev
                      ? { ...prev, exposureRetentionFactor: e.target.value }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-[#9E9890]">
                Bioavailability Factor
              </label>
              <input
                value={dossier.exposureBioavailabilityFactor}
                onChange={(e) =>
                  setDossier((prev) =>
                    prev
                      ? {
                          ...prev,
                          exposureBioavailabilityFactor: e.target.value,
                        }
                      : prev,
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3 text-sm text-[#3A3530]">
            <p>
              <span className="font-medium">
                Geschätzte tägliche Produktmenge:
              </span>{" "}
              {estimatedDailyProductExposureG.toFixed(6)} g/Tag
            </p>
          </div>

          {substanceExposureRows.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Stoffe oder unvollständige Expositionsparameter
              vorhanden.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {substanceExposureRows.map((row) => (
                <div key={row.key} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                  <p className="font-medium">
                    {row.inciName || row.substanceName}
                  </p>
                  <p className="text-xs text-[#9E9890]">
                    Stoffanteil im Produkt: {row.totalPercentage.toFixed(6)}%
                  </p>
                  <p className="text-xs text-[#9E9890]">
                    Tägliche Stoffexposition:{" "}
                    {row.dailySubstanceExposureG.toFixed(8)} g/Tag
                  </p>
                  <p className="text-xs text-[#9E9890]">
                    Systemische Exposition:{" "}
                    {row.systemicExposureMgPerKgBwDay === null
                      ? "—"
                      : `${row.systemicExposureMgPerKgBwDay.toFixed(8)} mg/kg bw/day`}
                  </p>
                  <p className="text-xs text-[#9E9890]">
                    MOS:{" "}
                    {row.mos === null
                      ? "nicht berechenbar"
                      : row.mos.toFixed(4)}
                  </p>
                  <p className="text-xs text-[#9E9890]">
                    NOAEL:{" "}
                    {row.noaelMgPerKgBwDay === null
                      ? "nicht gepflegt"
                      : `${row.noaelMgPerKgBwDay} mg/kg bw/day`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Rohstoffdokumente / SDS / IFRA
            </h2>

            {rawMaterialDocumentCoverage.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Keine Rohstoffdaten vorhanden.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {rawMaterialDocumentCoverage.map((row) => (
                  <div
                    key={row.rawMaterialId}
                    className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3"
                  >
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-[#9E9890]">
                      SDS: {row.hasSds ? "Ja" : "Nein"} · IFRA:{" "}
                      {row.hasIfra ? "Ja" : "Nein"}
                    </p>
                    {row.docs.length > 0 && (
                      <p className="mt-2 text-xs text-[#9E9890]">
                        {row.docs
                          .map(
                            (doc) =>
                              `${doc.documentType}${doc.validUntil ? ` bis ${doc.validUntil}` : ""}`,
                          )
                          .join(" | ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              Toxikologie / CPSR Teil A Vorstufe
            </h2>

            {flattenedSubstances.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Keine Stoffdaten vorhanden.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {flattenedSubstances.map((row) => (
                  <div key={row.key} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                    <p className="font-medium">
                      {row.inciName || row.substanceName}
                    </p>
                    <p className="text-xs text-[#9E9890]">
                      Anteil: {row.totalPercentage.toFixed(6)}%
                    </p>
                    <p className="text-xs text-[#9E9890]">
                      NOAEL:{" "}
                      {row.noaelMgPerKgBwDay === null
                        ? "nicht gepflegt"
                        : `${row.noaelMgPerKgBwDay} mg/kg bw/day`}
                    </p>
                    {row.sourceReference && (
                      <p className="text-xs text-[#9E9890]">
                        Quelle: {row.sourceReference}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Duftdokumente / PIF-Anhänge</h2>
          {fragranceDocuments.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Noch keine Duftdokumente hochgeladen.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {fragranceDocuments.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-xs text-[#9E9890]">{doc.documentType}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={generateAutoDossier}
            className="rounded-full border border-[#E5E0D8] px-6 py-2.5 text-sm text-[#6E6860] transition-all hover:shadow-md active:scale-95"
          >
            Automatisch aus Daten generieren
          </button>

          <button
            onClick={saveDossier}
            disabled={saving}
            className="rounded-full bg-[#0A0A0A] px-6 py-2.5 text-sm text-white transition-all active:scale-95 disabled:opacity-40"
          >
            {saving ? "Bitte warten..." : "Dossier speichern"}
          </button>
        </div>
        <div className="mt-4 text-sm">
          {releaseGate.isReady ? (
            <p className="text-green-700">
              Dieser Duft erfüllt aktuell die Mindestanforderungen für eine
              Release-Freigabe.
            </p>
          ) : (
            <p className="text-red-700">
              Dieser Duft ist aktuell nicht release-fähig. Bitte die Blocker
              oben abarbeiten.
            </p>
          )}
        </div>

        {message && <p className="mt-3 text-sm text-[#6E6860]">{message}</p>}
      </div>
    </main>
  );
}
