"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ComplianceRule = {
  id: string;
  ruleName: string;
  ruleScope: string;
  targetName: string;
  secondaryTargetName: string;
  targetType: string;
  productType: string;
  appliesToStage: string;
  ruleType: string;
  operator: string;
  thresholdPercentage: number | null;
  severity: string;
  groupName: string;
  notes: string;
  isActive: boolean;
};

type DbComplianceRuleRow = {
  id: string;
  rule_name: string;
  rule_scope: string;
  target_name: string;
  secondary_target_name: string | null;
  target_type: string | null;
  product_type: string | null;
  applies_to_stage: string | null;
  rule_type: string;
  operator: string | null;
  threshold_percentage: number | null;
  severity: string;
  group_name: string | null;
  notes: string | null;
  is_active: boolean;
};

type RawMaterialSubstance = {
  id: string;
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

type DbRawMaterialSubstanceRow = {
  id: string;
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
  percentage: number;
  is_allergen: boolean;
  is_declarable: boolean;
};

type AccordApprovalStatus = "draft" | "pending_review" | "approved" | "rejected";

type NoteCategory = "top" | "heart" | "base" | "all";

type Accord = {
  id: string;
  createdAt: string;
  name: string;
  description: string;
  notes: string;
  isActive: boolean;
  isReady: boolean;
  visibleToCreators: boolean;
  visibleToCustomers: boolean;
  approvalNotes: string;
  approvalStatus: AccordApprovalStatus;
  submittedForReviewAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  noteCategory: NoteCategory;
  imageUrl: string | null;
};

type RawMaterial = {
  id: string;
  name: string;
  category: string;
  unit: string;
  costPerUnitCents: number;
  stockQuantity: number;
  isActive: boolean;
  isApprovedForUse: boolean;
  visibleInAccordBuilder: boolean;
  purityPercent: number | null;
  dilutionPercent: number | null;
  dilutionMedium: string;
  recommendedMaxPercentage: number | null;
};

type RawMaterialDocument = {
  id: string;
  rawMaterialId: string;
  documentType: string;
  title: string;
  validUntil: string;
};

type DbRawMaterialDocumentRow = {
  id: string;
  raw_material_id: string;
  document_type: string;
  title: string;
  valid_until: string | null;
};

type AccordComponent = {
  id: string;
  createdAt: string;
  accordId: string;
  rawMaterialId: string;
  percentage: number;
};

type DbAccordRow = {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  notes: string | null;
  is_active: boolean;
  is_ready: boolean;
  visible_to_creators: boolean;
  visible_to_customers: boolean;
  approval_notes: string | null;
  approval_status: string | null;
  submitted_for_review_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  note_category: string | null;
  image_url: string | null;
};

type DbRawMaterialRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost_per_unit_cents: number;
  stock_quantity: number;
  is_active: boolean;
  is_approved_for_use: boolean;
  visible_in_accord_builder: boolean;
  purity_percent: number | null;
  dilution_percent: number | null;
  dilution_medium: string | null;
  recommended_max_percentage: number | null;
};

type DbAccordComponentRow = {
  id: string;
  created_at: string;
  accord_id: string;
  raw_material_id: string;
  percentage: number;
};

type EditingAccord = {
  isReady: boolean;
  visibleToCreators: boolean;
  visibleToCustomers: boolean;
  approvalNotes: string;
  noteCategory: NoteCategory;
};

function centsToEuroString(cents: number): string {
  return (cents / 100).toFixed(4);
}

function getRawMaterialUsageWarning(
  material: RawMaterial | null,
  percentage: number,
): string | null {
  if (!material) return null;

  if (
    material.recommendedMaxPercentage !== null &&
    percentage > material.recommendedMaxPercentage
  ) {
    return `Warnung: ${material.name} liegt mit ${percentage.toFixed(
      4,
    )}% über der empfohlenen Maximalgrenze von ${material.recommendedMaxPercentage.toFixed(
      4,
    )}%.`;
  }

  return null;
}

function normalizeAccordRows(rows: AccordComponent[]): AccordComponent[] {
  const total = rows.reduce((sum, row) => sum + row.percentage, 0);

  if (total <= 0) return rows;

  return rows.map((row) => ({
    ...row,
    percentage: Number(((row.percentage / total) * 100).toFixed(4)),
  }));
}

export default function AccordsPage() {
  const [rawMaterialSubstances, setRawMaterialSubstances] = useState<
    RawMaterialSubstance[]
  >([]);

  const [accords, setAccords] = useState<Accord[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [components, setComponents] = useState<AccordComponent[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserRole, setCurrentUserRole] = useState<string>("user");
  const [accordIsReady, setAccordIsReady] = useState(false);
  const [accordVisibleToCreators, setAccordVisibleToCreators] = useState(false);
  const [accordVisibleToCustomers, setAccordVisibleToCustomers] =
    useState(false);
  const [accordApprovalNotes, setAccordApprovalNotes] = useState("");
  const [submittingAccordReviewId, setSubmittingAccordReviewId] = useState<string | null>(null);
  const [approvingAccordId, setApprovingAccordId] = useState<string | null>(null);
  const [rejectingAccordId, setRejectingAccordId] = useState<string | null>(null);

  const [savingAccord, setSavingAccord] = useState(false);
  const [savingComponent, setSavingComponent] = useState(false);
  const [updatingComponentId, setUpdatingComponentId] = useState<string | null>(
    null,
  );
  const [deletingComponentId, setDeletingComponentId] = useState<string | null>(
    null,
  );
  const [updatingAccordId, setUpdatingAccordId] = useState<string | null>(null);
  const [normalizingAccordId, setNormalizingAccordId] = useState<string | null>(
    null,
  );
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);

  const [rawMaterialDocuments, setRawMaterialDocuments] = useState<
    RawMaterialDocument[]
  >([]);

  const [accordName, setAccordName] = useState("");
  const [accordDescription, setAccordDescription] = useState("");
  const [accordNotes, setAccordNotes] = useState("");
  const [accordNoteCategory, setAccordNoteCategory] = useState<NoteCategory>("all");
  const [uploadingAccordImageId, setUploadingAccordImageId] = useState<string | null>(null);

  const [selectedAccordId, setSelectedAccordId] = useState("");
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState("");
  const [componentPercentage, setComponentPercentage] = useState("");

  const [editingPercentages, setEditingPercentages] = useState<
    Record<string, string>
  >({});

  const [editingAccords, setEditingAccords] = useState<
    Record<string, EditingAccord>
  >({});

  useEffect(() => {
    async function loadData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        setCurrentUserRole(profile?.role ?? "user");
      }

      const {
        data: rawMaterialSubstanceRows,
        error: rawMaterialSubstancesError,
      } = await supabase
        .from("raw_material_substances")
        .select(
          "id, raw_material_id, substance_name, inci_name, percentage, is_allergen, is_declarable",
        )
        .order("created_at", { ascending: false });

      if (rawMaterialSubstancesError) {
        console.error(
          "Fehler beim Laden der Rohstoff-Stoffdaten:",
          rawMaterialSubstancesError,
        );
        setLoading(false);
        return;
      }

      const { data: accordRows, error: accordsError } = await supabase
        .from("accords")
        .select("*")
        .order("created_at", { ascending: false });

      if (accordsError) {
        console.error("Fehler beim Laden der Accorde:", accordsError);
        setLoading(false);
        return;
      }

      const { data: rawMaterialRows, error: rawMaterialsError } = await supabase
        .from("raw_materials")
        .select(
          "id, name, category, unit, cost_per_unit_cents, stock_quantity, is_active, is_approved_for_use, visible_in_accord_builder, purity_percent, dilution_percent, dilution_medium, recommended_max_percentage",
        )
        .eq("is_active", true)
        .eq("is_approved_for_use", true)
        .eq("visible_in_accord_builder", true)
        .order("name", { ascending: true });

      if (rawMaterialsError) {
        console.error("Fehler beim Laden der Rohstoffe:", rawMaterialsError);
        setLoading(false);
        return;
      }

      const { data: complianceRuleRows, error: complianceRulesError } =
        await supabase
          .from("compliance_rules")
          .select("*")
          .eq("is_active", true)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false });

          if (complianceRulesError) {
            console.error(
              "Fehler beim Laden der Compliance-Regeln:",
              complianceRulesError,
            );
            setLoading(false);
            return;
          }

      const { data: componentRows, error: componentsError } = await supabase
        .from("accord_components")
        .select("*")
        .order("created_at", { ascending: false });

      if (componentsError) {
        console.error(
          "Fehler beim Laden der Accord-Bestandteile:",
          componentsError,
        );
        setLoading(false);
        return;
      }

      const mappedAccords: Accord[] = (accordRows ?? []).map(
        (row: DbAccordRow) => ({
          id: row.id,
          createdAt: row.created_at,
          name: row.name,
          description: row.description ?? "",
          notes: row.notes ?? "",
          isActive: row.is_active,
          isReady: row.is_ready,
          visibleToCreators: row.visible_to_creators,
          visibleToCustomers: row.visible_to_customers,
          approvalNotes: row.approval_notes ?? "",
          approvalStatus: (row.approval_status ?? "draft") as AccordApprovalStatus,
          submittedForReviewAt: row.submitted_for_review_at ?? null,
          approvedBy: row.approved_by ?? null,
          approvedAt: row.approved_at ?? null,
          rejectionReason: row.rejection_reason ?? null,
          noteCategory: (row.note_category ?? "all") as NoteCategory,
          imageUrl: row.image_url ?? null,
        }),
      );

      const mappedRawMaterialSubstances: RawMaterialSubstance[] = (
        rawMaterialSubstanceRows ?? []
      ).map((row: DbRawMaterialSubstanceRow) => ({
        id: row.id,
        rawMaterialId: row.raw_material_id,
        substanceName: row.substance_name,
        inciName: row.inci_name ?? "",
        percentage: Number(row.percentage),
        isAllergen: row.is_allergen,
        isDeclarable: row.is_declarable,
      }));
      const mappedComplianceRules: ComplianceRule[] = (
        complianceRuleRows ?? []
      ).map((row: DbComplianceRuleRow) => ({
        id: row.id,
        ruleName: row.rule_name,
        ruleScope: row.rule_scope,
        targetName: row.target_name,
        secondaryTargetName: row.secondary_target_name ?? "",
        targetType: row.target_type ?? "name",
        productType: row.product_type ?? "all",
        appliesToStage: row.applies_to_stage ?? "all",
        ruleType: row.rule_type,
        operator: row.operator ?? "gt",
        thresholdPercentage:
          row.threshold_percentage === null
            ? null
            : Number(row.threshold_percentage),
        severity: row.severity,
        groupName: row.group_name ?? "",
        notes: row.notes ?? "",
        isActive: row.is_active,
      }));

      const mappedRawMaterials: RawMaterial[] = (rawMaterialRows ?? []).map(
        (row: DbRawMaterialRow) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          unit: row.unit,
          costPerUnitCents: Number(row.cost_per_unit_cents),
          stockQuantity: Number(row.stock_quantity),
          isActive: row.is_active,
          isApprovedForUse: row.is_approved_for_use,
          visibleInAccordBuilder: row.visible_in_accord_builder,
          purityPercent:
            row.purity_percent === null ? null : Number(row.purity_percent),
          dilutionPercent:
            row.dilution_percent === null ? null : Number(row.dilution_percent),
          dilutionMedium: row.dilution_medium ?? "",
          recommendedMaxPercentage:
            row.recommended_max_percentage === null
              ? null
              : Number(row.recommended_max_percentage),
        }),
      );

      const mappedComponents: AccordComponent[] = (componentRows ?? []).map(
        (row: DbAccordComponentRow) => ({
          id: row.id,
          createdAt: row.created_at,
          accordId: row.accord_id,
          rawMaterialId: row.raw_material_id,
          percentage: Number(row.percentage),
        }),
      );

      const initialEditing: Record<string, string> = {};
      for (const component of mappedComponents) {
        initialEditing[component.id] = String(component.percentage);
      }

      const initialEditingAccords: Record<string, EditingAccord> = {};
      for (const accord of mappedAccords) {
        initialEditingAccords[accord.id] = {
          isReady: accord.isReady,
          visibleToCreators: accord.visibleToCreators,
          visibleToCustomers: accord.visibleToCustomers,
          approvalNotes: accord.approvalNotes,
          noteCategory: accord.noteCategory,
        };
      }
      const {
        data: rawMaterialDocumentRows,
        error: rawMaterialDocumentsError,
      } = await supabase
        .from("raw_material_documents")
        .select("id, raw_material_id, document_type, title, valid_until")
        .order("created_at", { ascending: false });
        

        if (rawMaterialDocumentsError) {
          console.error(
            "Fehler beim Laden der Rohstoff-Dokumente:",
            rawMaterialDocumentsError,
          );
          setLoading(false);
          return;
        }
        const mappedRawMaterialDocuments: RawMaterialDocument[] = (
          rawMaterialDocumentRows ?? []
        ).map((row: DbRawMaterialDocumentRow) => ({
          id: row.id,
          rawMaterialId: row.raw_material_id,
          documentType: row.document_type,
          title: row.title,
          validUntil: row.valid_until ?? "",
        }));

    
    
      setComplianceRules(mappedComplianceRules);
      setAccords(mappedAccords);
      setRawMaterialDocuments(mappedRawMaterialDocuments);
      setRawMaterials(mappedRawMaterials);
      setComponents(mappedComponents);
      setEditingPercentages(initialEditing);
      setEditingAccords(initialEditingAccords);
      setRawMaterialSubstances(mappedRawMaterialSubstances);

      if (mappedAccords.length > 0) {
        setSelectedAccordId(mappedAccords[0].id);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  async function addAccord() {
    if (!accordName.trim()) {
      alert("Bitte gib einen Accord-Namen ein.");
      return;
    }

    setSavingAccord(true);

    const id = crypto.randomUUID();

    const { error } = await supabase.from("accords").insert({
      id,
      name: accordName.trim(),
      description: accordDescription.trim(),
      notes: accordNotes.trim(),
      is_active: true,
      is_ready: accordIsReady,
      visible_to_creators: false,
      visible_to_customers: false,
      approval_notes: accordApprovalNotes.trim(),
      approval_status: "draft",
      note_category: accordNoteCategory,
    });

    if (error) {
      console.error("Fehler beim Speichern des Accords:", error);
      alert("Accord konnte nicht gespeichert werden.");
      setSavingAccord(false);
      return;
    }

    const newAccord: Accord = {
      id,
      createdAt: new Date().toISOString(),
      name: accordName.trim(),
      description: accordDescription.trim(),
      notes: accordNotes.trim(),
      isActive: true,
      isReady: accordIsReady,
      visibleToCreators: false,
      visibleToCustomers: false,
      approvalNotes: accordApprovalNotes.trim(),
      approvalStatus: "draft",
      submittedForReviewAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      noteCategory: accordNoteCategory,
      imageUrl: null,
    };

    setAccords((prev) => [newAccord, ...prev]);
    setEditingAccords((prev) => ({
      ...prev,
      [id]: {
        isReady: newAccord.isReady,
        visibleToCreators: newAccord.visibleToCreators,
        visibleToCustomers: newAccord.visibleToCustomers,
        approvalNotes: newAccord.approvalNotes,
        noteCategory: newAccord.noteCategory,
      },
    }));
    setSelectedAccordId(id);

    setAccordName("");
    setAccordDescription("");
    setAccordNotes("");
    setSavingAccord(false);
    setAccordIsReady(false);
    setAccordVisibleToCreators(false);
    setAccordVisibleToCustomers(false);
    setAccordApprovalNotes("");
  }

  async function updateAccordSettings(accordId: string) {
    const values = editingAccords[accordId];
    if (!values) return;

    const currentAccord = accords.find((a) => a.id === accordId);
    if (currentAccord && currentAccord.approvalStatus !== "approved") {
      alert(
        "Dieser Accord ist noch nicht freigegeben. Bitte erst zur Prüfung einreichen und die Freigabe abwarten.",
      );
      return;
    }

    if (accordId === selectedAccordId) {
      if (
        values.visibleToCreators &&
        !selectedAccordComplianceSummary.readyRecommended
      ) {
        alert(
          "Dieser Accord ist nicht ready und darf nicht für Creator sichtbar sein.",
        );
        return;
      }

      if (
        values.visibleToCustomers &&
        !selectedAccordComplianceSummary.readyRecommended
      ) {
        alert(
          "Dieser Accord ist nicht ready und darf nicht für Kunden sichtbar sein.",
        );
        return;
      }
    }
    if (
      values.visibleToCreators &&
      !selectedAccordComplianceSummary.readyRecommended &&
      accordId === selectedAccordId
    ) {
      alert(
        "Dieser Accord ist nicht ready und darf nicht für Creator sichtbar sein.",
      );
      setUpdatingAccordId(null);
      return;
    }

    if (
      values.visibleToCustomers &&
      !selectedAccordComplianceSummary.readyRecommended &&
      accordId === selectedAccordId
    ) {
      alert(
        "Dieser Accord ist nicht ready und darf nicht für Kunden sichtbar sein.",
      );
      setUpdatingAccordId(null);
      return;
    }

    setUpdatingAccordId(accordId);

    const { error } = await supabase
      .from("accords")
      .update({
        is_ready: values.isReady,
        visible_to_creators: values.visibleToCreators,
        visible_to_customers: values.visibleToCustomers,
        approval_notes: values.approvalNotes.trim(),
        note_category: values.noteCategory,
      })
      .eq("id", accordId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Accord-Status:", error);
      alert("Accord-Einstellungen konnten nicht gespeichert werden.");
      setUpdatingAccordId(null);
      return;
    }

    setAccords((prev) =>
      prev.map((accord) =>
        accord.id === accordId
          ? {
              ...accord,
              isReady: values.isReady,
              visibleToCreators: values.visibleToCreators,
              visibleToCustomers: values.visibleToCustomers,
              approvalNotes: values.approvalNotes.trim(),
              noteCategory: values.noteCategory,
            }
          : accord,
      ),
    );

    setUpdatingAccordId(null);
  }

  async function applyReadyRecommendationToSelectedAccord() {
    if (!selectedAccordId) {
      alert("Bitte zuerst einen Accord auswählen.");
      return;
    }

    if (!selectedAccordComplianceSummary.readyRecommended) {
      alert(
        `Accord ist nicht ready.\n\nBlocker:\n${selectedAccordComplianceSummary.blockers.join("\n")}`,
      );
      return;
    }

    const { error } = await supabase
      .from("accords")
      .update({
        is_ready: true,
        approval_notes: accordApprovalNotes || null,
      })
      .eq("id", selectedAccordId);

    if (error) {
      console.error(error);
      alert("Ready-Status konnte nicht gespeichert werden.");
      return;
    }

    setAccords((prev) =>
      prev.map((accord) =>
        accord.id === selectedAccordId ? { ...accord, isReady: true } : accord,
      ),
    );

    setEditingAccords((prev) => ({
      ...prev,
      [selectedAccordId]: {
        ...(prev[selectedAccordId] ?? {
          isReady: false,
          visibleToCreators: false,
          visibleToCustomers: false,
          approvalNotes: "",
          noteCategory: "all" as NoteCategory,
        }),
        isReady: true,
      },
    }));

    alert("Accord wurde erfolgreich als READY markiert.");
  }
  async function addComponent() {
    const parsedPercentage = Number(componentPercentage);

    if (!selectedAccordId) {
      alert("Bitte wähle zuerst einen Accord aus.");
      return;
    }

    if (!selectedRawMaterialId) {
      alert("Bitte wähle einen Rohstoff aus.");
      return;
    }

    if (Number.isNaN(parsedPercentage) || parsedPercentage <= 0) {
      alert("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    const selectedMaterial =
      rawMaterials.find((material) => material.id === selectedRawMaterialId) ??
      null;

    const usageWarning = getRawMaterialUsageWarning(
      selectedMaterial,
      parsedPercentage,
    );

    if (usageWarning) {
      const proceed = window.confirm(`${usageWarning}\n\nTrotzdem hinzufügen?`);
      if (!proceed) {
        return;
      }
    }

    const existingSameMaterial = components.find(
      (component) =>
        component.accordId === selectedAccordId &&
        component.rawMaterialId === selectedRawMaterialId,
    );

    if (existingSameMaterial) {
      alert("Dieser Rohstoff ist dem Accord bereits zugeordnet.");
      return;
    }

    setSavingComponent(true);

    const id = crypto.randomUUID();

    const { error } = await supabase.from("accord_components").insert({
      id,
      accord_id: selectedAccordId,
      raw_material_id: selectedRawMaterialId,
      percentage: parsedPercentage,
    });

    if (error) {
      console.error("Fehler beim Speichern des Accord-Bestandteils:", error);
      alert("Bestandteil konnte nicht gespeichert werden.");
      setSavingComponent(false);
      return;
    }

    
    const newComponent: AccordComponent = {
      id,
      createdAt: new Date().toISOString(),
      accordId: selectedAccordId,
      rawMaterialId: selectedRawMaterialId,
      percentage: parsedPercentage,
    };

    setComponents((prev) => [newComponent, ...prev]);
    setEditingPercentages((prev) => ({
      ...prev,
      [id]: String(parsedPercentage),
    }));

    setSelectedRawMaterialId("");
    setComponentPercentage("");
    setSavingComponent(false);
  }

  async function updateComponent(componentId: string) {
    const value = editingPercentages[componentId];
    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed < 0) {
      alert("Bitte gib einen gültigen Prozentwert ein.");
      return;
    }

    const component =
      components.find((item) => item.id === componentId) ?? null;
    const material = component
      ? (rawMaterials.find((item) => item.id === component.rawMaterialId) ??
        null)
      : null;

    const usageWarning = getRawMaterialUsageWarning(material, parsed);

    if (usageWarning) {
      const proceed = window.confirm(`${usageWarning}\n\nTrotzdem speichern?`);
      if (!proceed) {
        return;
      }
    }

    setUpdatingComponentId(componentId);

    const { error } = await supabase
      .from("accord_components")
      .update({ percentage: parsed })
      .eq("id", componentId);

    if (error) {
      console.error("Fehler beim Aktualisieren des Bestandteils:", error);
      alert("Bestandteil konnte nicht aktualisiert werden.");
      setUpdatingComponentId(null);
      return;
    }

    setComponents((prev) =>
      prev.map((component) =>
        component.id === componentId
          ? { ...component, percentage: parsed }
          : component,
      ),
    );

    setUpdatingComponentId(null);
  }

  async function deleteComponent(componentId: string) {
    setDeletingComponentId(componentId);

    const { error } = await supabase
      .from("accord_components")
      .delete()
      .eq("id", componentId);

    if (error) {
      console.error("Fehler beim Löschen des Bestandteils:", error);
      alert("Bestandteil konnte nicht gelöscht werden.");
      setDeletingComponentId(null);
      return;
    }

    setComponents((prev) =>
      prev.filter((component) => component.id !== componentId),
    );
    setDeletingComponentId(null);
  }

  async function normalizeSelectedAccordTo100() {
    if (!selectedAccordId) {
      alert("Bitte zuerst einen Accord auswählen.");
      return;
    }

    const rows = components.filter((row) => row.accordId === selectedAccordId);
    if (rows.length === 0) {
      alert("Dieser Accord hat noch keine Bestandteile.");
      return;
    }

    const normalizedRows = normalizeAccordRows(rows);
    setNormalizingAccordId(selectedAccordId);

    for (const row of normalizedRows) {
      const { error } = await supabase
        .from("accord_components")
        .update({ percentage: row.percentage })
        .eq("id", row.id);

      if (error) {
        console.error("Fehler beim Normalisieren des Accords:", error);
        alert("Accord konnte nicht normalisiert werden.");
        setNormalizingAccordId(null);
        return;
      }
    }

    setComponents((prev) =>
      prev.map((component) => {
        const updated = normalizedRows.find((row) => row.id === component.id);
        return updated ? updated : component;
      }),
    );

    setEditingPercentages((prev) => {
      const next = { ...prev };
      for (const row of normalizedRows) {
        next[row.id] = String(row.percentage);
      }
      return next;
    });

    setNormalizingAccordId(null);
  }
  


  async function uploadAccordImage(accordId: string, file: File) {
    setUploadingAccordImageId(accordId);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `accords/${accordId}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("accord-images")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      alert("Bild konnte nicht hochgeladen werden.");
      setUploadingAccordImageId(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("accord-images")
      .getPublicUrl(path);

    const publicUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("accords")
      .update({ image_url: publicUrl })
      .eq("id", accordId);

    if (updateError) {
      alert("Bild-URL konnte nicht gespeichert werden.");
      setUploadingAccordImageId(null);
      return;
    }

    setAccords((prev) =>
      prev.map((a) =>
        a.id === accordId ? { ...a, imageUrl: publicUrl } : a,
      ),
    );
    setUploadingAccordImageId(null);
  }

  async function submitAccordForReview(accordId: string) {
    setSubmittingAccordReviewId(accordId);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("accords")
      .update({ approval_status: "pending_review", submitted_for_review_at: now })
      .eq("id", accordId);

    if (error) {
      alert("Fehler beim Einreichen des Accords zur Prüfung.");
      setSubmittingAccordReviewId(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase.from("audit_logs").insert({
      table_name: "accords",
      record_id: accordId,
      action: "submit_for_review",
      user_id: session?.user.id ?? null,
    });

    setAccords((prev) =>
      prev.map((a) =>
        a.id === accordId
          ? { ...a, approvalStatus: "pending_review" as AccordApprovalStatus, submittedForReviewAt: now }
          : a,
      ),
    );
    setSubmittingAccordReviewId(null);
  }

  async function approveAccord(accordId: string) {
    setApprovingAccordId(accordId);
    const now = new Date().toISOString();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("accords")
      .update({
        approval_status: "approved",
        approved_by: session?.user.id ?? null,
        approved_at: now,
        rejection_reason: null,
      })
      .eq("id", accordId);

    if (error) {
      alert("Fehler beim Freigeben des Accords.");
      setApprovingAccordId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      table_name: "accords",
      record_id: accordId,
      action: "approve",
      user_id: session?.user.id ?? null,
    });

    setAccords((prev) =>
      prev.map((a) =>
        a.id === accordId
          ? {
              ...a,
              approvalStatus: "approved" as AccordApprovalStatus,
              approvedBy: session?.user.id ?? null,
              approvedAt: now,
              rejectionReason: null,
            }
          : a,
      ),
    );
    setApprovingAccordId(null);
  }

  async function rejectAccord(accordId: string) {
    const reason = window.prompt("Begründung für die Ablehnung (optional):");
    if (reason === null) return;

    setRejectingAccordId(accordId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("accords")
      .update({
        approval_status: "rejected",
        rejection_reason: reason.trim() || null,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", accordId);

    if (error) {
      alert("Fehler beim Ablehnen des Accords.");
      setRejectingAccordId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      table_name: "accords",
      record_id: accordId,
      action: "reject",
      new_data: { rejection_reason: reason.trim() || null },
      user_id: session?.user.id ?? null,
    });

    setAccords((prev) =>
      prev.map((a) =>
        a.id === accordId
          ? {
              ...a,
              approvalStatus: "rejected" as AccordApprovalStatus,
              rejectionReason: reason.trim() || null,
              approvedBy: null,
              approvedAt: null,
            }
          : a,
      ),
    );
    setRejectingAccordId(null);
  }

  const currentProductType = "all";
  const currentStage = "accord";

  const selectedAccord = useMemo(
    () => accords.find((accord) => accord.id === selectedAccordId) ?? null,
    [accords, selectedAccordId],
  );

  const selectedAccordComponents = useMemo(() => {
    return components
      .filter((component) => component.accordId === selectedAccordId)
      .sort((a, b) => b.percentage - a.percentage);
  }, [components, selectedAccordId]);

  const rawMaterialMap = useMemo(() => {
    return new Map(rawMaterials.map((material) => [material.id, material]));
  }, [rawMaterials]);

  const selectedAccordPercentageSum = useMemo(() => {
    return selectedAccordComponents.reduce(
      (sum, component) => sum + component.percentage,
      0,
    );
  }, [selectedAccordComponents]);

  const selectedAccordMaterialCostPer100UnitsCents = useMemo(() => {
    return selectedAccordComponents.reduce((sum, component) => {
      const rawMaterial = rawMaterialMap.get(component.rawMaterialId);
      if (!rawMaterial) return sum;

      return sum + (rawMaterial.costPerUnitCents * component.percentage) / 100;
    }, 0);
  }, [selectedAccordComponents, rawMaterialMap]);

  const selectedAddMaterial = useMemo(() => {
    return (
      rawMaterials.find((material) => material.id === selectedRawMaterialId) ??
      null
    );
  }, [rawMaterials, selectedRawMaterialId]);

  const addMaterialWarning = useMemo(() => {
    const parsedPercentage = Number(componentPercentage);
    if (
      !selectedAddMaterial ||
      Number.isNaN(parsedPercentage) ||
      parsedPercentage <= 0
    ) {
      return null;
    }

    return getRawMaterialUsageWarning(selectedAddMaterial, parsedPercentage);
  }, [selectedAddMaterial, componentPercentage]);

  const selectedAccordFlattenedSubstances = useMemo(() => {
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

    for (const component of selectedAccordComponents) {
      const matchingSubstances = rawMaterialSubstances.filter(
        (substance) => substance.rawMaterialId === component.rawMaterialId,
      );

      for (const substance of matchingSubstances) {
        const effectiveSubstancePercentage =
          (component.percentage * substance.percentage) / 100;

        const key = `${
          substance.inciName.trim() || substance.substanceName.trim()
        }::${substance.isAllergen ? "1" : "0"}::${
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
  }, [selectedAccordComponents, rawMaterialSubstances]);

  const selectedAccordDeclarableSubstances = useMemo(() => {
    return selectedAccordFlattenedSubstances.filter((row) => row.isDeclarable);
  }, [selectedAccordFlattenedSubstances]);

  const selectedAccordAllergenSubstances = useMemo(() => {
    return selectedAccordFlattenedSubstances.filter((row) => row.isAllergen);
  }, [selectedAccordFlattenedSubstances]);

  const selectedAccordInciPreview = useMemo(() => {
    return Array.from(
      new Set(
        selectedAccordDeclarableSubstances
          .map((row) => row.inciName.trim() || row.substanceName.trim())
          .filter(Boolean),
      ),
    ).join(", ");
  }, [selectedAccordDeclarableSubstances]);

  

  const stats = useMemo(() => {
    return {
      accordCount: accords.length,
      activeAccords: accords.filter((accord) => accord.isActive).length,
      componentRows: components.length,
      readyAccords: accords.filter((accord) => accord.isReady).length,
      creatorVisibleAccords: accords.filter(
        (accord) => accord.visibleToCreators,
      ).length,
    };
  }, [accords, components]);
  const selectedAccordDocumentCoverage = useMemo(() => {
    return selectedAccordComponents.map((component) => {
      const material = rawMaterialMap.get(component.rawMaterialId);
      const docs = rawMaterialDocuments.filter(
        (doc) => doc.rawMaterialId === component.rawMaterialId,
      );

      const hasSds = docs.some((doc) => doc.documentType === "sds");
      const hasIfra = docs.some((doc) => doc.documentType === "ifra");
      const hasCoa = docs.some((doc) => doc.documentType === "coa");

      return {
        rawMaterialId: component.rawMaterialId,
        materialName: material?.name ?? "Unbekannter Rohstoff",
        hasSds,
        hasIfra,
        hasCoa,
        docs,
      };
    });
  }, [selectedAccordComponents, rawMaterialDocuments, rawMaterialMap]);

  const selectedAccordDocumentScore = useMemo(() => {
    if (!selectedAccordId || selectedAccordDocumentCoverage.length === 0) {
      return {
        level: "red" as "green" | "yellow" | "red",
        missingSds: [] as string[],
        missingIfra: [] as string[],
      };
    }

    const missingSds = selectedAccordDocumentCoverage
      .filter((row) => !row.hasSds)
      .map((row) => row.materialName);

    const missingIfra = selectedAccordDocumentCoverage
      .filter((row) => !row.hasIfra)
      .map((row) => row.materialName);

    let level: "green" | "yellow" | "red" = "green";

    if (missingSds.length > 0) {
      level = "red";
    } else if (missingIfra.length > 0) {
      level = "yellow";
    }

    return {
      level,
      missingSds,
      missingIfra,
    };
  }, [selectedAccordId, selectedAccordDocumentCoverage]);

  const selectedAccordRuleResults = useMemo(() => {
    const results: {
      key: string;
      ruleName: string;
      severity: string;
      message: string;
    }[] = [];

    const normalizedRawMaterials = selectedAccordComponents.map((component) => {
      const material = rawMaterialMap.get(component.rawMaterialId);

      return {
        materialName: material?.name.trim().toLowerCase() ?? "",
        category: material?.category.trim().toLowerCase() ?? "",
        percentage: component.percentage,
      };
    });

    const normalizedSubstances = selectedAccordFlattenedSubstances.map(
      (row) => ({
        substanceName: row.substanceName.trim().toLowerCase(),
        inciName: row.inciName.trim().toLowerCase(),
        percentage: row.totalPercentage,
        isAllergen: row.isAllergen,
        isDeclarable: row.isDeclarable,
      }),
    );

    const activeRules = complianceRules.filter((rule) => {
      if (!rule.isActive) return false;

      const stageMatches =
        rule.appliesToStage === "all" || rule.appliesToStage === currentStage;

      const productMatches =
        rule.productType === "all" || rule.productType === currentProductType;

      return stageMatches && productMatches;
    });

    for (const rule of activeRules) {
      const normalizedTarget = rule.targetName.trim().toLowerCase();
      const normalizedSecondaryTarget = rule.secondaryTargetName
        .trim()
        .toLowerCase();
      const normalizedGroup = rule.groupName.trim().toLowerCase();

      if (rule.ruleScope === "raw_material") {
        for (const item of normalizedRawMaterials) {
          const matches =
            rule.targetType === "category"
              ? item.category === normalizedTarget
              : item.materialName === normalizedTarget;

          if (!matches) continue;

          if (rule.ruleType === "forbidden") {
            results.push({
              key: `${rule.id}-${item.materialName}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `${item.materialName} ist durch Regel "${rule.ruleName}" nicht erlaubt.`,
            });
          }

          if (
            rule.ruleType === "max_percentage" &&
            rule.thresholdPercentage !== null &&
            item.percentage > rule.thresholdPercentage
          ) {
            results.push({
              key: `${rule.id}-${item.materialName}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `${item.materialName} liegt mit ${item.percentage.toFixed(
                4,
              )}% über dem Regel-Limit von ${rule.thresholdPercentage.toFixed(4)}%.`,
            });
          }

          if (rule.ruleType === "warning_only") {
            results.push({
              key: `${rule.id}-${item.materialName}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `${item.materialName}: Hinweis aus Regel "${rule.ruleName}".`,
            });
          }
        }
      }

      if (rule.ruleScope === "substance") {
        for (const item of normalizedSubstances) {
          const matches =
            rule.targetType === "inci"
              ? item.inciName === normalizedTarget
              : item.substanceName === normalizedTarget ||
                item.inciName === normalizedTarget;

          if (!matches) continue;

          if (rule.ruleType === "forbidden") {
            results.push({
              key: `${rule.id}-${normalizedTarget}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `${rule.targetName} ist durch Regel "${rule.ruleName}" nicht erlaubt.`,
            });
          }

          if (
            rule.ruleType === "max_percentage" &&
            rule.thresholdPercentage !== null &&
            item.percentage > rule.thresholdPercentage
          ) {
            results.push({
              key: `${rule.id}-${normalizedTarget}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `${rule.targetName} liegt mit ${item.percentage.toFixed(
                6,
              )}% über dem Regel-Limit von ${rule.thresholdPercentage.toFixed(4)}%.`,
            });
          }

          if (rule.ruleType === "warning_only") {
            results.push({
              key: `${rule.id}-${normalizedTarget}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `${rule.targetName}: Hinweis aus Regel "${rule.ruleName}".`,
            });
          }
        }
      }

      if (rule.ruleScope === "combination") {
        const rawMaterialNames = normalizedRawMaterials.map(
          (row) => row.materialName,
        );
        const substanceNames = normalizedSubstances.flatMap((row) => [
          row.substanceName,
          row.inciName,
        ]);

        const pool =
          rule.targetType === "raw_material"
            ? rawMaterialNames
            : substanceNames;

        const hasPrimary = pool.includes(normalizedTarget);
        const hasSecondary =
          normalizedSecondaryTarget !== "" &&
          pool.includes(normalizedSecondaryTarget);

        if (!hasPrimary || !hasSecondary) continue;

        if (rule.ruleType === "combination_forbidden") {
          results.push({
            key: `${rule.id}-${normalizedTarget}-${normalizedSecondaryTarget}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Die Kombination "${rule.targetName}" + "${rule.secondaryTargetName}" ist durch Regel "${rule.ruleName}" nicht erlaubt.`,
          });
        } else {
          results.push({
            key: `${rule.id}-${normalizedTarget}-${normalizedSecondaryTarget}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Die Kombination "${rule.targetName}" + "${rule.secondaryTargetName}" wurde durch Regel "${rule.ruleName}" erkannt.`,
          });
        }
      }

      if (rule.ruleScope === "group") {
        let matchingPercentages: number[] = [];

        if (normalizedGroup === "allergens") {
          matchingPercentages = selectedAccordFlattenedSubstances
            .filter((row) => row.isAllergen)
            .map((row) => row.totalPercentage);
        }

        if (normalizedGroup === "declarable") {
          matchingPercentages = selectedAccordFlattenedSubstances
            .filter((row) => row.isDeclarable)
            .map((row) => row.totalPercentage);
        }

        const groupTotal = matchingPercentages.reduce(
          (sum, value) => sum + value,
          0,
        );

        if (
          rule.ruleType === "max_percentage" &&
          rule.thresholdPercentage !== null
        ) {
          if (groupTotal > rule.thresholdPercentage) {
            results.push({
              key: `${rule.id}-${normalizedGroup}`,
              ruleName: rule.ruleName,
              severity: rule.severity,
              message: `Gruppe "${rule.groupName}" liegt mit ${groupTotal.toFixed(
                6,
              )}% über dem Regel-Limit von ${rule.thresholdPercentage.toFixed(4)}%.`,
            });
          }
        }

        if (rule.ruleType === "warning_only" && groupTotal > 0) {
          results.push({
            key: `${rule.id}-${normalizedGroup}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Gruppe "${rule.groupName}" vorhanden: ${groupTotal.toFixed(
              6,
            )}%.`,
          });
        }
      }
    }

    return results;
  }, [
    complianceRules,
    currentProductType,
    currentStage,
    selectedAccordComponents,
    rawMaterialMap,
    selectedAccordFlattenedSubstances,
  ]);

  


  
  const selectedAccordReadyRecommendation = useMemo(() => {
    const reasons: string[] = [];

    if (!selectedAccordId) {
      reasons.push("Kein Accord ausgewählt.");
      return {
        recommended: false,
        reasons,
      };
    }

    if (selectedAccordPercentageSum <= 0) {
      reasons.push("Keine verwertbare Prozentbasis vorhanden.");
    } else if (Math.abs(selectedAccordPercentageSum - 100) > 0.01) {
      reasons.push(
        `Prozent-Summe ist ${selectedAccordPercentageSum.toFixed(4)}% statt 100%.`,
      );
    }

    if (selectedAccordFlattenedSubstances.length === 0) {
      reasons.push("Keine Stoffdaten berechenbar.");
    }

    if (!selectedAccordInciPreview.trim()) {
      reasons.push("INCI Preview nicht generierbar.");
    }

    if (selectedAccordDocumentScore.missingSds.length > 0) {
      reasons.push(
        `Fehlende SDS für: ${selectedAccordDocumentScore.missingSds.join(", ")}`,
      );
    }

    if (selectedAccordDocumentScore.missingIfra.length > 0) {
      reasons.push(
        `Fehlende IFRA für: ${selectedAccordDocumentScore.missingIfra.join(", ")}`,
      );
    }

    const blockingRuleResults = selectedAccordRuleResults.filter(
      (result) => result.severity === "block",
    );

    if (blockingRuleResults.length > 0) {
      reasons.push(
        `Blockierende Regelverletzungen: ${blockingRuleResults
          .map((row) => row.ruleName)
          .join(", ")}`,
      );
    }

    const materialsAboveRecommended = selectedAccordComponents
      .map((component) => {
        const material = rawMaterialMap.get(component.rawMaterialId);
        if (!material || material.recommendedMaxPercentage === null)
          return null;
        if (component.percentage <= material.recommendedMaxPercentage)
          return null;

        return `${material.name} (${component.percentage.toFixed(
          4,
        )}% > ${material.recommendedMaxPercentage.toFixed(4)}%)`;
      })
      .filter(Boolean) as string[];

    if (materialsAboveRecommended.length > 0) {
      reasons.push(
        `Über empfohlener Maximalgrenze: ${materialsAboveRecommended.join(", ")}`,
      );
    }

    return {
      recommended: reasons.length === 0,
      reasons,
    };
  }, [
    selectedAccordId,
    selectedAccordPercentageSum,
    selectedAccordFlattenedSubstances,
    selectedAccordInciPreview,
    selectedAccordDocumentScore,
    selectedAccordComponents,
    rawMaterialMap,
    selectedAccordRuleResults,
  ]);
  const selectedAccordComplianceSummary = useMemo(() => {
    const blockingRuleResults = selectedAccordRuleResults.filter(
      (result) => result.severity === "block",
    );

    const warningRuleResults = selectedAccordRuleResults.filter(
      (result) => result.severity === "warning",
    );

    const formulaOk =
      selectedAccordPercentageSum > 0 &&
      Math.abs(selectedAccordPercentageSum - 100) <= 0.01;

    const hasSubstanceData = selectedAccordFlattenedSubstances.length > 0;
    const hasInciPreview = selectedAccordInciPreview.trim().length > 0;

    const missingSds = selectedAccordDocumentScore.missingSds.length;
    const missingIfra = selectedAccordDocumentScore.missingIfra.length;

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!formulaOk) {
      blockers.push(
        `Prozent-Summe ist ${selectedAccordPercentageSum.toFixed(4)}% statt 100%.`,
      );
    }

    if (!hasSubstanceData) {
      blockers.push("Keine Stoffdaten berechenbar.");
    }

    if (!hasInciPreview) {
      blockers.push("INCI Preview nicht generierbar.");
    }

    if (missingSds > 0) {
      blockers.push(
        `Fehlende SDS für: ${selectedAccordDocumentScore.missingSds.join(", ")}`,
      );
    }

    if (missingIfra > 0) {
      blockers.push(
        `Fehlende IFRA für: ${selectedAccordDocumentScore.missingIfra.join(", ")}`,
      );
    }

    for (const result of blockingRuleResults) {
      blockers.push(result.message);
    }

    for (const result of warningRuleResults) {
      warnings.push(result.message);
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
      formulaOk,
      hasSubstanceData,
      hasInciPreview,
      readyRecommended: blockers.length === 0,
    };
  }, [
    selectedAccordRuleResults,
    selectedAccordPercentageSum,
    selectedAccordFlattenedSubstances,
    selectedAccordInciPreview,
    selectedAccordDocumentScore,
  ]);



  const selectedAccordWarnings = useMemo(() => {
    const warnings: string[] = [];

    for (const result of selectedAccordRuleResults) {
      warnings.push(result.message);
    }

    if (selectedAccordFlattenedSubstances.length === 0) {
      warnings.push(
        "Für diesen Accord konnten noch keine Stoffdaten berechnet werden.",
      );
    }

    if (!selectedAccordInciPreview.trim()) {
      warnings.push(
        "INCI-Vorschau für diesen Accord ist aktuell nicht generierbar.",
      );
    }
    if (selectedAccordDocumentScore.missingSds.length > 0) {
      warnings.push(
        `Fehlende SDS für: ${selectedAccordDocumentScore.missingSds.join(", ")}`,
      );
    }

    if (selectedAccordDocumentScore.missingIfra.length > 0) {
      warnings.push(
        `Fehlende IFRA für: ${selectedAccordDocumentScore.missingIfra.join(", ")}`,
      );
    }

    if (!selectedAccordId) return warnings;

    if (selectedAccordPercentageSum <= 0) {
      warnings.push("Accord hat aktuell keine verwertbare Prozentbasis.");
    } else if (Math.abs(selectedAccordPercentageSum - 100) > 0.01) {
      warnings.push(
        `Accord-Summe ist aktuell ${selectedAccordPercentageSum.toFixed(
          4,
        )}% und nicht 100%.`,
      );
    }

    const materialsAboveRecommended = selectedAccordComponents
      .map((component) => {
        const material = rawMaterialMap.get(component.rawMaterialId);
        if (!material || material.recommendedMaxPercentage === null)
          return null;
        if (component.percentage <= material.recommendedMaxPercentage)
          return null;

        return `${material.name} (${component.percentage.toFixed(
          4,
        )}% > ${material.recommendedMaxPercentage.toFixed(4)}%)`;
      })
      .filter(Boolean) as string[];

    if (materialsAboveRecommended.length > 0) {
      warnings.push(
        `Über empfohlener Maximalgrenze: ${materialsAboveRecommended.join(", ")}`,
      );
    }

    return warnings;
  }, [
    selectedAccordId,
    selectedAccordComponents,
    selectedAccordPercentageSum,
    rawMaterialMap,
    selectedAccordFlattenedSubstances,
    selectedAccordInciPreview,
    selectedAccordDocumentScore,
    selectedAccordRuleResults,
  ]);
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
          <h1 className="mt-1 text-3xl font-bold text-white">Accords</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
            <Link href="/inventory/fragrance-formulas" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Fragrance Formulas</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Accorde gesamt</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.accordCount}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Aktive Accorde</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.activeAccords}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Zuordnungen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.componentRows}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Ready</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.readyAccords}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Für Creator sichtbar</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.creatorVisibleAccords}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Neuen Accord anlegen</h2>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Name</label>
              <input
                type="text"
                value={accordName}
                onChange={(e) => setAccordName(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="z. B. Fresh Citrus Accord"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Beschreibung</label>
              <textarea
                value={accordDescription}
                onChange={(e) => setAccordDescription(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
              <textarea
                value={accordNotes}
                onChange={(e) => setAccordNotes(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Note-Kategorie</label>
              <select
                value={accordNoteCategory}
                onChange={(e) =>
                  setAccordNoteCategory(e.target.value as NoteCategory)
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="all">Alle / Unklassifiziert</option>
                <option value="top">Kopfnote (Top)</option>
                <option value="heart">Herznote (Heart)</option>
                <option value="base">Basisnote (Base)</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accordIsReady}
                  onChange={(e) => setAccordIsReady(e.target.checked)}
                />
                Ready
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accordVisibleToCreators}
                  onChange={(e) => setAccordVisibleToCreators(e.target.checked)}
                />
                Für Creator sichtbar
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={accordVisibleToCustomers}
                  onChange={(e) =>
                    setAccordVisibleToCustomers(e.target.checked)
                  }
                />
                Für Kunden sichtbar
              </label>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Freigabe-Notizen</label>
              <textarea
                value={accordApprovalNotes}
                onChange={(e) => setAccordApprovalNotes(e.target.value)}
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="Interne Hinweise, Einschränkungen, Freigabestand"
              />
            </div>

            <button
              onClick={addAccord}
              disabled={savingAccord}
              className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {savingAccord ? "Bitte warten..." : "Accord speichern"}
            </button>
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Rohstoff zum Accord hinzufügen</h2>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Accord wählen</label>
              <select
                value={selectedAccordId}
                onChange={(e) => setSelectedAccordId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {accords.map((accord) => (
                  <option key={accord.id} value={accord.id}>
                    {accord.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedAccord && (
              <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                <p>
                  <span className="font-medium">Accord:</span>{" "}
                  {selectedAccord.name}
                </p>
                <p>
                  <span className="font-medium">Prozent-Summe:</span>{" "}
                  {selectedAccordPercentageSum.toFixed(4)}%
                </p>
                <p>
                  <span className="font-medium">Materialkosten-Basis:</span>{" "}
                  {centsToEuroString(
                    selectedAccordMaterialCostPer100UnitsCents,
                  )}{" "}
                  €
                </p>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Rohstoff wählen</label>
              <select
                value={selectedRawMaterialId}
                onChange={(e) => setSelectedRawMaterialId(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="">Bitte wählen</option>
                {rawMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                    {material.recommendedMaxPercentage !== null
                      ? ` · max ${material.recommendedMaxPercentage.toFixed(2)}%`
                      : ""}
                    {material.dilutionPercent !== null
                      ? ` · ${material.dilutionPercent.toFixed(2)}%${
                          material.dilutionMedium
                            ? ` in ${material.dilutionMedium}`
                            : ""
                        }`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedAddMaterial && (
              <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                <p>
                  <span className="font-medium">Rohstoff:</span>{" "}
                  {selectedAddMaterial.name}
                </p>
                <p>
                  <span className="font-medium">Kategorie:</span>{" "}
                  {selectedAddMaterial.category}
                </p>
                {selectedAddMaterial.purityPercent !== null && (
                  <p>
                    <span className="font-medium">Purity:</span>{" "}
                    {selectedAddMaterial.purityPercent.toFixed(4)}%
                  </p>
                )}
                {selectedAddMaterial.dilutionPercent !== null && (
                  <p>
                    <span className="font-medium">Dilution:</span>{" "}
                    {selectedAddMaterial.dilutionPercent.toFixed(4)}%
                    {selectedAddMaterial.dilutionMedium
                      ? ` in ${selectedAddMaterial.dilutionMedium}`
                      : ""}
                  </p>
                )}
                {selectedAddMaterial.recommendedMaxPercentage !== null && (
                  <p>
                    <span className="font-medium">
                      Empfohlene Maximalgrenze:
                    </span>{" "}
                    {selectedAddMaterial.recommendedMaxPercentage.toFixed(4)}%
                  </p>
                )}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Anteil in %</label>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={componentPercentage}
                onChange={(e) => setComponentPercentage(e.target.value)}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="25.0000"
              />
            </div>

            {addMaterialWarning && (
              <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                {addMaterialWarning}
              </div>
            )}

            <button
              onClick={addComponent}
              disabled={savingComponent}
              className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
            >
              {savingComponent ? "Bitte warten..." : "Bestandteil hinzufügen"}
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-2">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Accordliste</h2>

            {accords.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Noch keine Accorde angelegt.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {accords.map((accord) => (
                  <div key={accord.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#0A0A0A]">{accord.name}</h3>
                          {accord.noteCategory !== "all" && (
                            <span className="rounded-lg border px-2 py-0.5 text-xs font-medium text-[#6E6860]">
                              {accord.noteCategory === "top"
                                ? "Kopfnote"
                                : accord.noteCategory === "heart"
                                  ? "Herznote"
                                  : "Basisnote"}
                            </span>
                          )}
                          {accord.imageUrl && (
                            <img
                              src={accord.imageUrl}
                              alt=""
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          )}
                        </div>
                        <p className="text-sm text-[#9E9890]">
                          Status: {accord.isActive ? "Aktiv" : "Inaktiv"}
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          Ready: {accord.isReady ? "Ja" : "Nein"}
                        </p>
                        <p className="text-sm text-[#9E9890]">
                          Creator sichtbar:{" "}
                          {accord.visibleToCreators ? "Ja" : "Nein"} · Kunden
                          sichtbar: {accord.visibleToCustomers ? "Ja" : "Nein"}
                        </p>

                        {accord.description && (
                          <p className="mt-2 text-sm text-[#6E6860]">
                            {accord.description}
                          </p>
                        )}

                        {accord.notes && (
                          <p className="mt-2 text-sm text-[#9E9890]">
                            {accord.notes}
                          </p>
                        )}

                        {accord.approvalNotes && (
                          <p className="mt-2 text-sm text-[#6E6860]">
                            Freigabe: {accord.approvalNotes}
                          </p>
                        )}

                        {accord.rejectionReason && (
                          <p className="mt-2 text-sm text-red-600">
                            Abgelehnt: {accord.rejectionReason}
                          </p>
                        )}

                        {accord.approvedAt && accord.approvalStatus === "approved" && (
                          <p className="mt-1 text-xs text-[#C5C0B8]">
                            Freigegeben am {new Date(accord.approvedAt).toLocaleDateString("de-DE")}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-6">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                editingAccords[accord.id]?.isReady ?? false
                              }
                              disabled={
                                accord.id === selectedAccordId &&
                                !selectedAccordComplianceSummary.readyRecommended
                              }
                              onChange={(e) =>
                                setEditingAccords((prev) => ({
                                  ...prev,
                                  [accord.id]: {
                                    ...(prev[accord.id] ?? {
                                      isReady: false,
                                      visibleToCreators: false,
                                      visibleToCustomers: false,
                                      approvalNotes: "",
                                      noteCategory: "all" as NoteCategory,
                                    }),
                                    isReady: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Ready
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                editingAccords[accord.id]?.visibleToCreators ??
                                false
                              }
                              onChange={(e) =>
                                setEditingAccords((prev) => ({
                                  ...prev,
                                  [accord.id]: {
                                    ...(prev[accord.id] ?? {
                                      isReady: false,
                                      visibleToCreators: false,
                                      visibleToCustomers: false,
                                      approvalNotes: "",
                                      noteCategory: "all" as NoteCategory,
                                    }),
                                    visibleToCreators: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Für Creator sichtbar
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={
                                editingAccords[accord.id]?.visibleToCustomers ??
                                false
                              }
                              onChange={(e) =>
                                setEditingAccords((prev) => ({
                                  ...prev,
                                  [accord.id]: {
                                    ...(prev[accord.id] ?? {
                                      isReady: false,
                                      visibleToCreators: false,
                                      visibleToCustomers: false,
                                      approvalNotes: "",
                                      noteCategory: "all" as NoteCategory,
                                    }),
                                    visibleToCustomers: e.target.checked,
                                  },
                                }))
                              }
                            />
                            Für Kunden sichtbar
                          </label>
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Note-Kategorie</label>
                          <select
                            value={
                              editingAccords[accord.id]?.noteCategory ?? "all"
                            }
                            onChange={(e) =>
                              setEditingAccords((prev) => ({
                                ...prev,
                                [accord.id]: {
                                  ...(prev[accord.id] ?? {
                                    isReady: false,
                                    visibleToCreators: false,
                                    visibleToCustomers: false,
                                    approvalNotes: "",
                                    noteCategory: "all" as NoteCategory,
                                  }),
                                  noteCategory: e.target.value as NoteCategory,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="all">Alle / Unklassifiziert</option>
                            <option value="top">Kopfnote (Top)</option>
                            <option value="heart">Herznote (Heart)</option>
                            <option value="base">Basisnote (Base)</option>
                          </select>
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Freigabe-Notizen</label>
                          <textarea
                            value={
                              editingAccords[accord.id]?.approvalNotes ?? ""
                            }
                            onChange={(e) =>
                              setEditingAccords((prev) => ({
                                ...prev,
                                [accord.id]: {
                                  ...(prev[accord.id] ?? {
                                    isReady: false,
                                    visibleToCreators: false,
                                    visibleToCustomers: false,
                                    approvalNotes: "",
                                    noteCategory: "all" as NoteCategory,
                                  }),
                                  approvalNotes: e.target.value,
                                },
                              }))
                            }
                            rows={3}
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          />
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Accord-Bild</label>
                          {accord.imageUrl && (
                            <img
                              src={accord.imageUrl}
                              alt={accord.name}
                              className="mb-3 h-24 w-24 rounded-xl object-cover"
                            />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingAccordImageId === accord.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadAccordImage(accord.id, file);
                            }}
                            className="w-full text-sm"
                          />
                          {uploadingAccordImageId === accord.id && (
                            <p className="mt-1 text-xs text-[#9E9890]">
                              Bild wird hochgeladen...
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span
                          className={`inline-block rounded-full border px-3 py-1 text-center text-[10px] font-medium uppercase tracking-wider ${
                            accord.approvalStatus === "approved"
                              ? "border-green-500 bg-green-50 text-green-700"
                              : accord.approvalStatus === "pending_review"
                                ? "border-amber-400 bg-amber-50 text-amber-700"
                                : accord.approvalStatus === "rejected"
                                  ? "border-red-400 bg-red-50 text-red-700"
                                  : "border-[#E5E0D8] text-[#6E6860]"
                          }`}
                        >
                          {accord.approvalStatus === "approved"
                            ? "Freigegeben"
                            : accord.approvalStatus === "pending_review"
                              ? "In Prüfung"
                              : accord.approvalStatus === "rejected"
                                ? "Abgelehnt"
                                : "Entwurf"}
                        </span>

                        <button
                          onClick={() => setSelectedAccordId(accord.id)}
                          className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs"
                        >
                          Auswählen
                        </button>

                        <button
                          onClick={() => updateAccordSettings(accord.id)}
                          disabled={
                            updatingAccordId === accord.id ||
                            accord.approvalStatus !== "approved"
                          }
                          title={
                            accord.approvalStatus !== "approved"
                              ? "Accord muss zuerst freigegeben sein"
                              : undefined
                          }
                          className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {updatingAccordId === accord.id
                            ? "Speichert..."
                            : "Sichtbarkeit speichern"}
                        </button>

                        {(accord.approvalStatus === "draft" ||
                          accord.approvalStatus === "rejected") && (
                          <button
                            onClick={() => submitAccordForReview(accord.id)}
                            disabled={submittingAccordReviewId === accord.id}
                            className="rounded-full border border-amber-400 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 disabled:opacity-40"
                          >
                            {submittingAccordReviewId === accord.id
                              ? "Wird eingereicht..."
                              : "Zur Prüfung"}
                          </button>
                        )}

                        {accord.approvalStatus === "pending_review" &&
                          currentUserRole === "admin" && (
                            <>
                              <button
                                onClick={() => approveAccord(accord.id)}
                                disabled={approvingAccordId === accord.id}
                                className="rounded-full border border-green-500 bg-green-50 px-4 py-1.5 text-xs text-green-800 disabled:opacity-40"
                              >
                                {approvingAccordId === accord.id
                                  ? "Wird freigegeben..."
                                  : "Freigeben"}
                              </button>

                              <button
                                onClick={() => rejectAccord(accord.id)}
                                disabled={rejectingAccordId === accord.id}
                                className="rounded-full border border-red-400 bg-red-50 px-4 py-1.5 text-xs text-red-800 disabled:opacity-40"
                              >
                                {rejectingAccordId === accord.id
                                  ? "Wird abgelehnt..."
                                  : "Ablehnen"}
                              </button>
                            </>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Bestandteile des gewählten Accords</h2>

            {!selectedAccordId ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Bitte zuerst einen Accord auswählen.
              </p>
            ) : selectedAccordComponents.length === 0 ? (
              <p className="mt-4 text-sm text-[#6E6860]">
                Für diesen Accord sind noch keine Rohstoffe hinterlegt.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {selectedAccordComponents.map((component) => {
                  const material = rawMaterialMap.get(component.rawMaterialId);
                  const costContribution = material
                    ? (material.costPerUnitCents * component.percentage) / 100
                    : 0;

                  return (
                    <div key={component.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-[#0A0A0A]">
                            {material?.name ?? "Unbekannter Rohstoff"}
                          </h3>
                          <p className="text-sm text-[#9E9890]">
                            Kategorie: {material?.category ?? "—"}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Einheit: {material?.unit ?? "—"}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Bestand: {material?.stockQuantity ?? 0}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Kostenanteil: {centsToEuroString(costContribution)}{" "}
                            €
                          </p>

                          {material && material.purityPercent !== null && (
                            <p className="text-sm text-[#9E9890]">
                              Purity: {material.purityPercent.toFixed(4)}%
                            </p>
                          )}

                          {material && material.dilutionPercent !== null && (
                            <p className="text-sm text-[#9E9890]">
                              Dilution: {material.dilutionPercent.toFixed(4)}%
                              {material.dilutionMedium
                                ? ` in ${material.dilutionMedium}`
                                : ""}
                            </p>
                          )}

                          {material &&
                            material.recommendedMaxPercentage !== null && (
                              <p className="text-sm text-[#9E9890]">
                                Empfohlene Maximalgrenze:{" "}
                                {material.recommendedMaxPercentage.toFixed(4)}%
                              </p>
                            )}
                        </div>
                        <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Status</p>

                          <p
                            className={`mt-2 text-sm font-semibold ${
                              selectedAccordReadyRecommendation.recommended
                                ? "text-green-700"
                                : "text-red-600"
                            }`}
                          >
                            {selectedAccordReadyRecommendation.recommended
                              ? "READY"
                              : "NOT READY"}
                          </p>

                          {!selectedAccordReadyRecommendation.recommended && (
                            <ul className="mt-2 text-sm text-red-600 list-disc pl-4">
                              {selectedAccordReadyRecommendation.reasons.map(
                                (reason: string, index: number) => (
                                  <li key={index}>{reason}</li>
                                ),
                              )}
                            </ul>
                          )}
                          
                        </div>
                        

                        <div className="w-44">
                          <input
                            type="number"
                            min={0}
                            step="0.0001"
                            value={editingPercentages[component.id] ?? ""}
                            onChange={(e) =>
                              setEditingPercentages((prev) => ({
                                ...prev,
                                [component.id]: e.target.value,
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          />

                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => updateComponent(component.id)}
                              disabled={updatingComponentId === component.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs disabled:opacity-40"
                            >
                              {updatingComponentId === component.id
                                ? "Speichert..."
                                : "Speichern"}
                            </button>

                            <button
                              onClick={() => deleteComponent(component.id)}
                              disabled={deletingComponentId === component.id}
                              className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-3 py-1.5 text-xs disabled:opacity-40"
                            >
                              {deletingComponentId === component.id
                                ? "Löscht..."
                                : "Entfernen"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-2xl border border-dashed border-[#C5C0B8] bg-[#F0EDE8] p-4">
                  <p className="text-sm text-[#6E6860]">
                    Prozent-Summe:{" "}
                    <span className="font-semibold">
                      {selectedAccordPercentageSum.toFixed(4)}%
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-[#6E6860]">
                    Grobe Materialkosten-Basis:{" "}
                    <span className="font-semibold">
                      {centsToEuroString(
                        selectedAccordMaterialCostPer100UnitsCents,
                      )}{" "}
                      €
                    </span>
                  </p>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={normalizeSelectedAccordTo100}
                      disabled={normalizingAccordId === selectedAccordId}
                      className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs disabled:opacity-40"
                    >
                      {normalizingAccordId === selectedAccordId
                        ? "Normalisiert..."
                        : "Auf 100% normalisieren"}
                    </button>
                  </div>

                  {selectedAccordWarnings.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {selectedAccordWarnings.map((warning, index) => (
                        <p key={index} className="text-sm text-[#6E6860]">
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[#6E6860]">
                      Keine direkten Accord-Warnungen erkannt.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <h3 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Accord-Compliance-Vorschau</h3>
                  <div className="mt-6 rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <h3 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Accord-Dokument-Score</h3>

                    <div
                      className={`mt-4 rounded-xl border p-3 text-sm ${
                        selectedAccordComplianceSummary.level === "green"
                          ? "border-green-500"
                          : selectedAccordComplianceSummary.level === "yellow"
                            ? "border-yellow-500"
                            : "border-red-500"
                      }`}
                    >
                      <p>
                        <span className="font-medium">Ampel:</span>{" "}
                        {selectedAccordComplianceSummary.level === "green"
                          ? "🟢 Grün"
                          : selectedAccordComplianceSummary.level === "yellow"
                            ? "🟡 Gelb"
                            : "🔴 Rot"}
                      </p>

                      <p className="mt-2">
                        <span className="font-medium">Score:</span>{" "}
                        {selectedAccordComplianceSummary.score}/100
                      </p>

                      <p className="mt-2">
                        <span className="font-medium">Ready empfohlen:</span>{" "}
                        {selectedAccordComplianceSummary.readyRecommended
                          ? "Ja"
                          : "Nein"}
                      </p>
                    </div>

                    {selectedAccordDocumentCoverage.length === 0 ? (
                      <p className="mt-4 text-sm text-[#6E6860]">
                        Noch keine Dokumentdaten vorhanden.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {selectedAccordDocumentCoverage.map((row) => (
                          <div
                            key={row.rawMaterialId}
                            className="rounded-xl border border-[#E5E0D8] bg-white p-3"
                          >
                            <p className="font-medium">{row.materialName}</p>

                            <p className="text-sm text-[#9E9890]">
                              SDS: {row.hasSds ? "Ja" : "Nein"} · IFRA:{" "}
                              {row.hasIfra ? "Ja" : "Nein"} · COA:{" "}
                              {row.hasCoa ? "Ja" : "Nein"}
                            </p>

                            {row.docs.length > 0 && (
                              <p className="mt-2 text-xs text-[#9E9890]">
                                {row.docs
                                  .map(
                                    (doc) =>
                                      `${doc.documentType}${
                                        doc.validUntil
                                          ? ` bis ${doc.validUntil}`
                                          : ""
                                      }`,
                                  )
                                  .join(" | ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <h3 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Auto-Ready-Empfehlung</h3>

                    <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                      <p>
                        <span className="font-medium">Empfehlung:</span>{" "}
                        {selectedAccordReadyRecommendation.recommended
                          ? "Ready empfohlen"
                          : "Noch nicht ready"}
                      </p>
                    </div>

                    {selectedAccordReadyRecommendation.reasons.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {selectedAccordReadyRecommendation.reasons.map(
                          (reason, index) => (
                            <p key={index} className="text-sm text-[#6E6860]">
                              {reason}
                            </p>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[#6E6860]">
                        Keine Blocker erkannt. Dieser Accord ist aus Systemsicht
                        ready.
                      </p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={applyReadyRecommendationToSelectedAccord}
                        disabled={
                          !selectedAccordComplianceSummary.readyRecommended
                        }
                        className="rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
                      >
                        Ready prüfen & setzen
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                    <h3 className="text-sm font-semibold text-[#0A0A0A] uppercase tracking-wider">Regel-Engine-Auswertung</h3>

                    {selectedAccordRuleResults.length === 0 ? (
                      <p className="mt-4 text-sm text-[#6E6860]">
                        Keine aktiven Regelverletzungen oder Hinweise erkannt.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {selectedAccordRuleResults.map((result) => (
                          <div
                            key={result.key}
                            className="rounded-xl border border-[#E5E0D8] bg-white p-3"
                          >
                            <p className="font-medium">{result.ruleName}</p>
                            <p className="text-sm text-[#9E9890]">
                              Severity: {result.severity}
                            </p>
                            <p className="mt-1 text-sm text-[#6E6860]">
                              {result.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                    <p>
                      <span className="font-medium">INCI Preview:</span>{" "}
                      {selectedAccordInciPreview || "Noch nicht generierbar"}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Deklarierbare Stoffe:</span>{" "}
                      {selectedAccordDeclarableSubstances.length}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Allergene:</span>{" "}
                      {selectedAccordAllergenSubstances.length}
                    </p>
                  </div>

                  {selectedAccordFlattenedSubstances.length === 0 ? (
                    <p className="mt-4 text-sm text-[#6E6860]">
                      Noch keine berechenbaren Stoffdaten vorhanden.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {selectedAccordFlattenedSubstances.map((row) => (
                        <div key={row.key} className="rounded-xl border border-[#E5E0D8] bg-white p-3">
                          <p className="font-medium">
                            {row.inciName || row.substanceName}
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Anteil im Accord: {row.totalPercentage.toFixed(6)}%
                          </p>
                          <p className="text-sm text-[#9E9890]">
                            Allergen: {row.isAllergen ? "Ja" : "Nein"} ·
                            deklarierbar: {row.isDeclarable ? "Ja" : "Nein"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
                  <h3 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Live Compliance Panel</h3>

                  <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                    <p>
                      <span className="font-medium">Ampel:</span>{" "}
                      {selectedAccordComplianceSummary.level === "green"
                        ? "🟢 Grün"
                        : selectedAccordComplianceSummary.level === "yellow"
                          ? "🟡 Gelb"
                          : "🔴 Rot"}
                    </p>

                    <p className="mt-2">
                      <span className="font-medium">Score:</span>{" "}
                      {selectedAccordComplianceSummary.score}/100
                    </p>

                    <p className="mt-2">
                      <span className="font-medium">Ready empfohlen:</span>{" "}
                      {selectedAccordComplianceSummary.readyRecommended
                        ? "Ja"
                        : "Nein"}
                    </p>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#F0EDE8] px-4 py-3 text-sm text-[#6E6860]">
                    <p>
                      <span className="font-medium">Formel 100%:</span>{" "}
                      {selectedAccordComplianceSummary.formulaOk
                        ? "Ja"
                        : "Nein"}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">Stoffdaten vorhanden:</span>{" "}
                      {selectedAccordComplianceSummary.hasSubstanceData
                        ? "Ja"
                        : "Nein"}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">INCI Preview:</span>{" "}
                      {selectedAccordComplianceSummary.hasInciPreview
                        ? "Ja"
                        : "Nein"}
                    </p>
                  </div>

                  {selectedAccordComplianceSummary.blockers.length > 0 && (
                    <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-[#3A3530]">Blocker</p>
                      <div className="mt-2 space-y-2">
                        {selectedAccordComplianceSummary.blockers.map(
                          (blocker: string, index: number) => (
                            <p key={index} className="text-sm text-[#6E6860]">
                              {blocker}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {selectedAccordComplianceSummary.warnings.length > 0 && (
                    <div className="mt-4 rounded-xl border border-[#E5E0D8] bg-[#FAFAF8] p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-[#3A3530]">Warnungen</p>
                      <div className="mt-2 space-y-2">
                        {selectedAccordComplianceSummary.warnings.map(
                          (warning: string, index: number) => (
                            <p key={index} className="text-sm text-[#6E6860]">
                              {warning}
                            </p>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={applyReadyRecommendationToSelectedAccord}
                      className="rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
                    >
                      Ready prüfen & setzen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
