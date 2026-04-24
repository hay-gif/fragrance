"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type RawMaterialOption = {
  id: string;
  name: string;
  category: string;
};

type DbRawMaterialOptionRow = {
  id: string;
  name: string;
  category: string;
};

type SubstanceOption = {
  rawMaterialId: string;
  substanceName: string;
  inciName: string;
};

type DbSubstanceOptionRow = {
  raw_material_id: string;
  substance_name: string;
  inci_name: string | null;
};

type ApprovalStatus = "draft" | "pending_review" | "approved" | "rejected";

type ComplianceRule = {
  id: string;
  createdAt: string;
  ruleName: string;
  ruleScope: string;
  targetName: string;
  secondaryTargetName: string;
  targetType: string;
  productType: string;
  appliesToStage: string;
  ruleType: string;
  operator: string;
  thresholdPercentage: string;
  severity: string;
  groupName: string;
  notes: string;
  sortOrder: string;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  submittedForReviewAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
};

type DbComplianceRuleRow = {
  id: string;
  created_at: string;
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
  sort_order: number | null;
  is_active: boolean;
  approval_status: string | null;
  submitted_for_review_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
};

type RuleForm = {
  ruleName: string;
  ruleScope: string;
  targetName: string;
  secondaryTargetName: string;
  targetType: string;
  productType: string;
  appliesToStage: string;
  ruleType: string;
  operator: string;
  thresholdPercentage: string;
  severity: string;
  groupName: string;
  notes: string;
  sortOrder: string;
  isActive: boolean;
};

function getEmptyRuleForm(): RuleForm {
  return {
    ruleName: "",
    ruleScope: "substance",
    targetName: "",
    secondaryTargetName: "",
    targetType: "name",
    productType: "all",
    appliesToStage: "all",
    ruleType: "max_percentage",
    operator: "gt",
    thresholdPercentage: "",
    severity: "block",
    groupName: "",
    notes: "",
    sortOrder: "0",
    isActive: true,
  };
}
function getAllowedTargetTypes(ruleScope: string) {
  if (ruleScope === "substance") return ["name", "inci"];
  if (ruleScope === "raw_material") return ["name", "category"];
  if (ruleScope === "combination") return ["name", "inci", "raw_material"];
  if (ruleScope === "group") return ["group"];
  if (ruleScope === "ifra") return ["all"]; // IFRA prüft alle Substanzen mit CAS
  return ["name"];
}

function getAllowedRuleTypes(ruleScope: string): string[] {
  if (ruleScope === "ifra") return ["ifra_check"];
  if (ruleScope === "group") return ["max_percentage"];
  if (ruleScope === "combination") return ["combination_forbidden"];
  return ["max_percentage", "forbidden", "warning_only", "mos_threshold", "allergen_declaration_required"];
}

function getAllowedOperators(ruleType: string) {
  if (ruleType === "max_percentage") return ["gt", "gte", "lt", "lte", "eq", "neq"];
  if (ruleType === "forbidden") return ["eq"];
  if (ruleType === "warning_only") return ["eq"];
  if (ruleType === "combination_forbidden") return ["combination_forbidden"];
  if (ruleType === "ifra_check") return ["eq"];
  if (ruleType === "mos_threshold") return ["lt"];
  if (ruleType === "allergen_declaration_required") return ["eq"];
  return ["gt"];
}

const RULE_TYPE_LABELS: Record<string, string> = {
  max_percentage: "Max. Prozentanteil – Grenzwert-Überschreitung prüfen",
  forbidden: "Verboten – Stoff/Rohstoff darf nicht vorkommen",
  warning_only: "Nur Warnung – kein Blockieren",
  combination_forbidden: "Verbotene Kombination – zwei Stoffe dürfen nicht zusammen sein",
  ifra_check: "IFRA 51st Amendment – alle Substanzen gegen IFRA-Limits prüfen",
  mos_threshold: "MoS-Schwellenwert – Margin of Safety prüfen (Standard: ≥ 100)",
  allergen_declaration_required: "Allergen-Deklaration – Pflichtdeklaration auf Etikett prüfen",
};

const RULE_SCOPE_LABELS: Record<string, string> = {
  substance: "Substanz – einzelne chemische Verbindung",
  raw_material: "Rohstoff – Duftöl, Extrakt, Alkohol usw.",
  combination: "Kombination – zwei Stoffe gemeinsam verboten",
  group: "Gruppe – Summe von Allergenen o.ä.",
  ifra: "IFRA – automatische IFRA 51st Amendment Prüfung",
};

function normalizeRuleFormForUi<
  T extends {
    ruleScope: string;
    targetType: string;
    ruleType: string;
    operator: string;
    secondaryTargetName: string;
    groupName: string;
    thresholdPercentage: string;
  },
>(form: T): T {
  const allowedTargetTypes = getAllowedTargetTypes(form.ruleScope);
  const allowedRuleTypes = getAllowedRuleTypes(form.ruleScope);
  const allowedOperators = getAllowedOperators(form.ruleType);

  const next = { ...form };

  if (!allowedTargetTypes.includes(next.targetType)) {
    next.targetType = allowedTargetTypes[0];
  }

  if (!allowedRuleTypes.includes(next.ruleType)) {
    next.ruleType = allowedRuleTypes[0];
  }

  if (!allowedOperators.includes(next.operator)) {
    next.operator = allowedOperators[0];
  }

  if (next.ruleScope !== "combination") next.secondaryTargetName = "";
  if (next.ruleScope !== "group") next.groupName = "";

  // ifra_check, allergen_declaration_required, combination_forbidden brauchen kein Threshold
  if (!["max_percentage", "mos_threshold"].includes(next.ruleType)) {
    next.thresholdPercentage = "";
  }

  // IFRA-Regel: Zielname nicht relevant
  if (next.ruleScope === "ifra") {
    next.targetType = "all";
  }

  return next;
}

function getNormalizedRuleForm(form: RuleForm): RuleForm {
  const next = { ...form };

  if (next.ruleType !== "max_percentage") {
    next.thresholdPercentage = "";
  }

  if (next.ruleScope !== "combination") {
    next.secondaryTargetName = "";
  }

  if (next.ruleScope !== "group") {
    next.groupName = "";
  }

  if (next.ruleScope === "raw_material" && next.targetType === "inci") {
    next.targetType = "name";
  }

  if (next.ruleScope === "group") {
    next.targetType = "group";
  }

  return next;
}

function validateRuleForm(form: RuleForm): string | null {
  if (!form.ruleName.trim()) return "Bitte Regelname eingeben.";

  // IFRA-Regeln haben kein spezifisches Ziel (prüfen alle Substanzen)
  if (form.ruleScope !== "ifra" && !form.targetName.trim()) {
    return "Bitte Zielname eingeben.";
  }

  if (form.ruleScope === "combination" && !form.secondaryTargetName.trim()) {
    return "Bitte Secondary Target für die Kombinationsregel eingeben.";
  }

  const needsThreshold = ["max_percentage", "mos_threshold"].includes(form.ruleType);
  if (needsThreshold && form.thresholdPercentage.trim() === "") {
    return `Bitte Threshold-Wert für "${form.ruleType}" eingeben.`;
  }

  const noThreshold = ["forbidden", "warning_only", "combination_forbidden", "ifra_check", "allergen_declaration_required"];
  if (noThreshold.includes(form.ruleType) && form.thresholdPercentage.trim() !== "") {
    return "Threshold % nur bei max_percentage / mos_threshold verwenden.";
  }

  if (
    form.thresholdPercentage.trim() !== "" &&
    (Number.isNaN(Number(form.thresholdPercentage)) || Number(form.thresholdPercentage) < 0)
  ) {
    return "Bitte gültigen Threshold-Wert eingeben.";
  }

  if (Number.isNaN(Number(form.sortOrder)) || !Number.isFinite(Number(form.sortOrder))) {
    return "Bitte gültige Sortierung eingeben.";
  }

  return null;
}

function getApprovalStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case "draft": return "Entwurf";
    case "pending_review": return "In Prüfung";
    case "approved": return "Freigegeben";
    case "rejected": return "Abgelehnt";
  }
}

function getApprovalStatusClass(status: ApprovalStatus): string {
  switch (status) {
    case "draft": return "border-[#E5E0D8] text-[#6E6860]";
    case "pending_review": return "border-amber-400 text-amber-700 bg-amber-50";
    case "approved": return "border-green-500 text-green-700 bg-green-50";
    case "rejected": return "border-red-400 text-red-700 bg-red-50";
  }
}

export default function ComplianceRulesPage() {
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("user");
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);
  const [approvingRuleId, setApprovingRuleId] = useState<string | null>(null);
  const [rejectingRuleId, setRejectingRuleId] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState("all");

  const [rawMaterialOptions, setRawMaterialOptions] = useState<
    RawMaterialOption[]
  >([]);
  const [substanceOptions, setSubstanceOptions] = useState<SubstanceOption[]>(
    [],
  );

  const [form, setForm] = useState<RuleForm>(getEmptyRuleForm());

  const [editingRules, setEditingRules] = useState<
    Record<string, RuleForm>
  >({});

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

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

      const { data, error } = await supabase
        .from("compliance_rules")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fehler beim Laden der Regeln:", error);
        setLoading(false);
        return;
      }

      const { data: rawMaterialRows, error: rawMaterialError } = await supabase
        .from("raw_materials")
        .select("id, name, category")
        .order("name", { ascending: true });

      if (rawMaterialError) {
        console.error(
          "Fehler beim Laden der Rohstoff-Optionen:",
          rawMaterialError,
        );
        setLoading(false);
        return;
      }

      const { data: substanceRows, error: substanceError } = await supabase
        .from("raw_material_substances")
        .select("raw_material_id, substance_name, inci_name")
        .order("substance_name", { ascending: true });

      if (substanceError) {
        console.error("Fehler beim Laden der Stoff-Optionen:", substanceError);
        setLoading(false);
        return;
      }

      const mappedRawMaterialOptions: RawMaterialOption[] = (
        rawMaterialRows ?? []
      ).map((row: DbRawMaterialOptionRow) => ({
        id: row.id,
        name: row.name,
        category: row.category,
      }));

      const mappedSubstanceOptions: SubstanceOption[] = (
        substanceRows ?? []
      ).map((row: DbSubstanceOptionRow) => ({
        rawMaterialId: row.raw_material_id,
        substanceName: row.substance_name,
        inciName: row.inci_name ?? "",
      }));

      const mappedRules: ComplianceRule[] = (data ?? []).map(
        (row: DbComplianceRuleRow) => ({
          id: row.id,
          createdAt: row.created_at,
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
              ? ""
              : String(row.threshold_percentage),
          severity: row.severity,
          groupName: row.group_name ?? "",
          notes: row.notes ?? "",
          sortOrder: row.sort_order === null ? "0" : String(row.sort_order),
          isActive: row.is_active,
          approvalStatus: (row.approval_status ?? "draft") as ApprovalStatus,
          submittedForReviewAt: row.submitted_for_review_at ?? null,
          approvedBy: row.approved_by ?? null,
          approvedAt: row.approved_at ?? null,
          rejectionReason: row.rejection_reason ?? null,
        }),
      );

      const initialEditing: Record<string, RuleForm> = {};

      for (const rule of mappedRules) {
        initialEditing[rule.id] = {
          ruleName: rule.ruleName,
          ruleScope: rule.ruleScope,
          targetName: rule.targetName,
          secondaryTargetName: rule.secondaryTargetName,
          targetType: rule.targetType,
          productType: rule.productType,
          appliesToStage: rule.appliesToStage,
          ruleType: rule.ruleType,
          operator: rule.operator,
          thresholdPercentage: rule.thresholdPercentage,
          severity: rule.severity,
          groupName: rule.groupName,
          notes: rule.notes,
          sortOrder: rule.sortOrder,
          isActive: rule.isActive,
          // RuleForm fields only — approval status managed separately
        };
      }

      setRules(mappedRules);
      setEditingRules(initialEditing);
      setRawMaterialOptions(mappedRawMaterialOptions);
      setSubstanceOptions(mappedSubstanceOptions);
      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    setForm((prev) => {
      const next = getNormalizedRuleForm(prev);
      const changed = JSON.stringify(prev) !== JSON.stringify(next);
      return changed ? next : prev;
    });
  }, [form.ruleType, form.ruleScope]);

  async function addRule() {
    const normalizedForm = getNormalizedRuleForm(form);
    const validationError = validateRuleForm(normalizedForm);

    if (validationError) {
      alert(validationError);
      return;
    }

    setSavingRule(true);

    const id = crypto.randomUUID();

    const payload = {
      id,
      rule_name: normalizedForm.ruleName.trim(),
      rule_scope: normalizedForm.ruleScope.trim(),
      target_name: normalizedForm.targetName.trim(),
      secondary_target_name: normalizedForm.secondaryTargetName.trim() || null,
      target_type: normalizedForm.targetType.trim(),
      product_type: normalizedForm.productType.trim(),
      applies_to_stage: normalizedForm.appliesToStage.trim(),
      rule_type: normalizedForm.ruleType.trim(),
      operator: normalizedForm.operator.trim(),
      threshold_percentage:
        normalizedForm.thresholdPercentage.trim() === ""
          ? null
          : Number(normalizedForm.thresholdPercentage),
      severity: normalizedForm.severity.trim(),
      group_name: normalizedForm.groupName.trim() || null,
      notes: normalizedForm.notes.trim(),
      sort_order: Number(normalizedForm.sortOrder),
      is_active: normalizedForm.isActive,
      approval_status: "draft",
    };

    const { error } = await supabase.from("compliance_rules").insert(payload);

    if (error) {
      console.error("Fehler beim Speichern der Regel:", error);
      alert("Regel konnte nicht gespeichert werden.");
      setSavingRule(false);
      return;
    }

    const newRule: ComplianceRule = {
      id,
      createdAt: new Date().toISOString(),
      ruleName: normalizedForm.ruleName.trim(),
      ruleScope: normalizedForm.ruleScope.trim(),
      targetName: normalizedForm.targetName.trim(),
      secondaryTargetName: normalizedForm.secondaryTargetName.trim(),
      targetType: normalizedForm.targetType.trim(),
      productType: normalizedForm.productType.trim(),
      appliesToStage: normalizedForm.appliesToStage.trim(),
      ruleType: normalizedForm.ruleType.trim(),
      operator: normalizedForm.operator.trim(),
      thresholdPercentage: normalizedForm.thresholdPercentage.trim(),
      severity: normalizedForm.severity.trim(),
      groupName: normalizedForm.groupName.trim(),
      notes: normalizedForm.notes.trim(),
      sortOrder: normalizedForm.sortOrder.trim(),
      isActive: normalizedForm.isActive,
      approvalStatus: "draft",
      submittedForReviewAt: null,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    };

    setRules((prev) => [newRule, ...prev]);
    setEditingRules((prev) => ({
      ...prev,
      [id]: {
        ruleName: newRule.ruleName,
        ruleScope: newRule.ruleScope,
        targetName: newRule.targetName,
        secondaryTargetName: newRule.secondaryTargetName,
        targetType: newRule.targetType,
        productType: newRule.productType,
        appliesToStage: newRule.appliesToStage,
        ruleType: newRule.ruleType,
        operator: newRule.operator,
        thresholdPercentage: newRule.thresholdPercentage,
        severity: newRule.severity,
        groupName: newRule.groupName,
        notes: newRule.notes,
        sortOrder: newRule.sortOrder,
        isActive: newRule.isActive,
      },
    }));

    setForm(getEmptyRuleForm());
    setSavingRule(false);
  }

  async function updateRule(ruleId: string) {
    const values = editingRules[ruleId];
    if (!values) return;

    const normalizedValues = getNormalizedRuleForm(values);
    const validationError = validateRuleForm(normalizedValues);

    if (validationError) {
      alert(validationError);
      return;
    }

    const currentRule = rules.find((r) => r.id === ruleId);
    const wasApproved = currentRule?.approvalStatus === "approved";

    if (wasApproved) {
      const confirmed = window.confirm(
        "Diese Regel ist bereits freigegeben. Eine Änderung setzt den Status zurück auf 'Entwurf' und erfordert eine neue Freigabe. Fortfahren?",
      );
      if (!confirmed) return;
    }

    setUpdatingRuleId(ruleId);

    const payload = {
      rule_name: normalizedValues.ruleName.trim(),
      rule_scope: normalizedValues.ruleScope.trim(),
      target_name: normalizedValues.targetName.trim(),
      secondary_target_name:
        normalizedValues.secondaryTargetName.trim() || null,
      target_type: normalizedValues.targetType.trim(),
      product_type: normalizedValues.productType.trim(),
      applies_to_stage: normalizedValues.appliesToStage.trim(),
      rule_type: normalizedValues.ruleType.trim(),
      operator: normalizedValues.operator.trim(),
      threshold_percentage:
        normalizedValues.thresholdPercentage.trim() === ""
          ? null
          : Number(normalizedValues.thresholdPercentage),
      severity: normalizedValues.severity.trim(),
      group_name: normalizedValues.groupName.trim() || null,
      notes: normalizedValues.notes.trim(),
      sort_order: Number(normalizedValues.sortOrder),
      is_active: normalizedValues.isActive,
      ...(wasApproved
        ? {
            approval_status: "draft",
            approved_by: null,
            approved_at: null,
            submitted_for_review_at: null,
            rejection_reason: null,
          }
        : {}),
    };

    const { error } = await supabase
      .from("compliance_rules")
      .update(payload)
      .eq("id", ruleId);

    if (error) {
      console.error("Fehler beim Aktualisieren der Regel:", error);
      alert("Regel konnte nicht aktualisiert werden.");
      setUpdatingRuleId(null);
      return;
    }

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ruleName: normalizedValues.ruleName.trim(),
              ruleScope: normalizedValues.ruleScope.trim(),
              targetName: normalizedValues.targetName.trim(),
              secondaryTargetName: normalizedValues.secondaryTargetName.trim(),
              targetType: normalizedValues.targetType.trim(),
              productType: normalizedValues.productType.trim(),
              appliesToStage: normalizedValues.appliesToStage.trim(),
              ruleType: normalizedValues.ruleType.trim(),
              operator: normalizedValues.operator.trim(),
              thresholdPercentage: normalizedValues.thresholdPercentage.trim(),
              severity: normalizedValues.severity.trim(),
              groupName: normalizedValues.groupName.trim(),
              notes: normalizedValues.notes.trim(),
              sortOrder: normalizedValues.sortOrder.trim(),
              isActive: normalizedValues.isActive,
              ...(wasApproved
                ? {
                    approvalStatus: "draft" as ApprovalStatus,
                    approvedBy: null,
                    approvedAt: null,
                    submittedForReviewAt: null,
                    rejectionReason: null,
                  }
                : {}),
            }
          : rule,
      ),
    );

    setEditingRules((prev) => ({
      ...prev,
      [ruleId]: { ...normalizedValues },
    }));

    setUpdatingRuleId(null);
  }

  async function deleteRule(ruleId: string) {
    const confirmed = window.confirm(
      "Diese Regel wird nicht hart gelöscht, sondern deaktiviert. Fortfahren?",
    );

    if (!confirmed) return;

    setDeletingRuleId(ruleId);

    const { error } = await supabase
      .from("compliance_rules")
      .update({ is_active: false })
      .eq("id", ruleId);

    if (error) {
      console.error("Fehler beim Deaktivieren der Regel:", error);
      alert("Regel konnte nicht deaktiviert werden.");
      setDeletingRuleId(null);
      return;
    }

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, isActive: false } : rule,
      ),
    );

    setEditingRules((prev) => ({
      ...prev,
      [ruleId]: {
        ...(prev[ruleId] ?? getEmptyRuleForm()),
        isActive: false,
      },
    }));

    setDeletingRuleId(null);
  }
  async function submitRuleForReview(ruleId: string) {
    setSubmittingReviewId(ruleId);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("compliance_rules")
      .update({ approval_status: "pending_review", submitted_for_review_at: now })
      .eq("id", ruleId);

    if (error) {
      alert("Fehler beim Einreichen zur Prüfung.");
      setSubmittingReviewId(null);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase.from("audit_logs").insert({
      table_name: "compliance_rules",
      record_id: ruleId,
      action: "submit_for_review",
      user_id: session?.user.id ?? null,
    });

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? { ...rule, approvalStatus: "pending_review", submittedForReviewAt: now }
          : rule,
      ),
    );
    setSubmittingReviewId(null);
  }

  async function approveRule(ruleId: string) {
    setApprovingRuleId(ruleId);
    const now = new Date().toISOString();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("compliance_rules")
      .update({
        approval_status: "approved",
        approved_by: session?.user.id ?? null,
        approved_at: now,
        rejection_reason: null,
      })
      .eq("id", ruleId);

    if (error) {
      alert("Fehler beim Freigeben der Regel.");
      setApprovingRuleId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      table_name: "compliance_rules",
      record_id: ruleId,
      action: "approve",
      user_id: session?.user.id ?? null,
    });

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              approvalStatus: "approved",
              approvedBy: session?.user.id ?? null,
              approvedAt: now,
              rejectionReason: null,
            }
          : rule,
      ),
    );
    setApprovingRuleId(null);
  }

  async function rejectRule(ruleId: string) {
    const reason = window.prompt("Begründung für die Ablehnung (optional):");
    if (reason === null) return;

    setRejectingRuleId(ruleId);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { error } = await supabase
      .from("compliance_rules")
      .update({
        approval_status: "rejected",
        rejection_reason: reason.trim() || null,
        approved_at: null,
        approved_by: null,
      })
      .eq("id", ruleId);

    if (error) {
      alert("Fehler beim Ablehnen der Regel.");
      setRejectingRuleId(null);
      return;
    }

    await supabase.from("audit_logs").insert({
      table_name: "compliance_rules",
      record_id: ruleId,
      action: "reject",
      new_data: { rejection_reason: reason.trim() || null },
      user_id: session?.user.id ?? null,
    });

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              approvalStatus: "rejected",
              rejectionReason: reason.trim() || null,
              approvedBy: null,
              approvedAt: null,
            }
          : rule,
      ),
    );
    setRejectingRuleId(null);
  }

  async function resetRuleToDraft(ruleId: string) {
    const confirmed = window.confirm(
      "Regel auf 'Entwurf' zurücksetzen, um sie zu überarbeiten?",
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("compliance_rules")
      .update({
        approval_status: "draft",
        approved_by: null,
        approved_at: null,
        submitted_for_review_at: null,
        rejection_reason: null,
      })
      .eq("id", ruleId);

    if (error) {
      alert("Fehler beim Zurücksetzen.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    await supabase.from("audit_logs").insert({
      table_name: "compliance_rules",
      record_id: ruleId,
      action: "reset_to_draft",
      user_id: session?.user.id ?? null,
    });

    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              approvalStatus: "draft",
              approvedBy: null,
              approvedAt: null,
              submittedForReviewAt: null,
              rejectionReason: null,
            }
          : rule,
      ),
    );
  }

  const stats = useMemo(() => {
    return {
      total: rules.length,
      active: rules.filter((rule) => rule.isActive).length,
      blocking: rules.filter((rule) => rule.severity === "block").length,
      warning: rules.filter((rule) => rule.severity === "warning").length,
      combinations: rules.filter(
        (rule) =>
          rule.ruleType === "combination_forbidden" ||
          rule.secondaryTargetName.trim() !== "",
      ).length,
      approved: rules.filter((rule) => rule.approvalStatus === "approved").length,
      pendingReview: rules.filter((rule) => rule.approvalStatus === "pending_review").length,
    };
  }, [rules]);

  const uniqueSubstanceNames = useMemo(() => {
    return Array.from(
      new Set(
        substanceOptions
          .map((item) => item.substanceName.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [substanceOptions]);

  const uniqueInciNames = useMemo(() => {
    return Array.from(
      new Set(
        substanceOptions.map((item) => item.inciName.trim()).filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [substanceOptions]);

  const availableGroups = ["allergens", "declarable"];

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        rule.ruleName.toLowerCase().includes(normalizedSearch) ||
        rule.targetName.toLowerCase().includes(normalizedSearch) ||
        rule.secondaryTargetName.toLowerCase().includes(normalizedSearch) ||
        rule.notes.toLowerCase().includes(normalizedSearch);

      const matchesScope =
        scopeFilter === "all" || rule.ruleScope === scopeFilter;

      const matchesSeverity =
        severityFilter === "all" || rule.severity === severityFilter;

      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && rule.isActive) ||
        (activeFilter === "inactive" && !rule.isActive);

      const matchesApproval =
        approvalFilter === "all" || rule.approvalStatus === approvalFilter;

      return matchesSearch && matchesScope && matchesSeverity && matchesActive && matchesApproval;
    });
  }, [rules, search, scopeFilter, severityFilter, activeFilter, approvalFilter]);

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
          <h1 className="mt-1 text-3xl font-bold text-white">Compliance Rules</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/inventory" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Inventory</Link>
            <Link href="/inventory/accords" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Accords</Link>
            <Link href="/inventory/raw-materials" className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] uppercase tracking-wider text-white/70 hover:bg-white/10">Raw Materials</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Gesamt</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.total}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Aktiv</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.active}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Blockierend</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.blocking}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Warnungen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.warning}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Kombinationen</p>
            <p className="mt-2 text-2xl font-bold text-[#0A0A0A]">{stats.combinations}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">Freigegeben</p>
            <p className="mt-2 text-2xl font-bold text-green-700">{stats.approved}</p>
          </div>
          <div className="rounded-2xl bg-white border border-[#E5E0D8] p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9E9890]">In Prüfung</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">{stats.pendingReview}</p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Neue Regel anlegen</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Regelname
              </label>
              <input
                value={form.ruleName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ruleName: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Scope</label>
              <select
                value={form.ruleScope}
                onChange={(e) =>
                  setForm((prev) =>
                    normalizeRuleFormForUi({
                      ...prev,
                      ruleScope: e.target.value,
                    }),
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                {Object.entries(RULE_SCOPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Target Name
              </label>

              {form.ruleScope === "ifra" ? (
                <div className="rounded-xl border border-dashed border-[#C9A96E]/40 bg-[#FDF8F0] px-4 py-3 text-sm text-[#6E6860]">
                  IFRA-Regel prüft automatisch alle Substanzen mit CAS-Nummer gegen IFRA 51st Amendment. Kein Ziel erforderlich.
                  {form.targetName !== "ifra_all" && (
                    <button
                      type="button"
                      className="ml-2 text-xs underline text-[#C9A96E]"
                      onClick={() => setForm((prev) => ({ ...prev, targetName: "ifra_all" }))}
                    >
                      Automatisch setzen
                    </button>
                  )}
                </div>
              ) : form.ruleScope === "raw_material" ? (
                form.targetType === "category" ? (
                  <select
                    value={form.targetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        targetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {Array.from(
                      new Set(
                        rawMaterialOptions
                          .map((item) => item.category.trim())
                          .filter(Boolean),
                      ),
                    )
                      .sort((a, b) => a.localeCompare(b))
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                ) : (
                  <select
                    value={form.targetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        targetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {rawMaterialOptions.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                )
              ) : form.ruleScope === "substance" ? (
                form.targetType === "inci" ? (
                  <select
                    value={form.targetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        targetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {uniqueInciNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={form.targetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        targetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {uniqueSubstanceNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )
              ) : form.ruleScope === "group" ? (
                <select
                  value={form.targetName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, targetName: e.target.value }))
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                >
                  <option value="">Bitte wählen</option>
                  {availableGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.targetName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, targetName: e.target.value }))
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Secondary Target
              </label>

              {form.ruleScope === "combination" ? (
                form.targetType === "raw_material" ? (
                  <select
                    value={form.secondaryTargetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryTargetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {rawMaterialOptions.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : form.targetType === "inci" ? (
                  <select
                    value={form.secondaryTargetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryTargetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {uniqueInciNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={form.secondaryTargetName}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryTargetName: e.target.value,
                      }))
                    }
                    className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                  >
                    <option value="">Bitte wählen</option>
                    {uniqueSubstanceNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <input
                  value={form.secondaryTargetName}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      secondaryTargetName: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Target Type
              </label>
              <select
                value={form.targetType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, targetType: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                {getAllowedTargetTypes(form.ruleScope).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Product Type
              </label>
              <input
                value={form.productType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, productType: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="all / fine_fragrance / body_mist"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Stage</label>
              <select
                value={form.appliesToStage}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    appliesToStage: e.target.value,
                  }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="all">all</option>
                <option value="accord">accord</option>
                <option value="fragrance">fragrance</option>
                <option value="release">release</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Rule Type
              </label>
              <select
                value={form.ruleType}
                onChange={(e) =>
                  setForm((prev) =>
                    normalizeRuleFormForUi({
                      ...prev,
                      ruleType: e.target.value,
                    }),
                  )
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                {getAllowedRuleTypes(form.ruleScope).map((rt) => (
                  <option key={rt} value={rt}>
                    {RULE_TYPE_LABELS[rt] ?? rt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Operator</label>
              <select
                value={form.operator}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, operator: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                {getAllowedOperators(form.ruleType).map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Threshold %
              </label>
              <input
                value={form.thresholdPercentage}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    thresholdPercentage: e.target.value,
                  }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                placeholder="optional"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Severity</label>
              <select
                value={form.severity}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, severity: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              >
                <option value="block">block</option>
                <option value="warning">warning</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Group Name
              </label>
              <input
                value={form.groupName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, groupName: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                Sort Order
              </label>
              <input
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                }
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">Notizen</label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
              />
              Aktiv
            </label>
          </div>

          <button
            onClick={addRule}
            disabled={savingRule}
            className="mt-6 rounded-full bg-[#0A0A0A] text-white px-5 py-2.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
          >
            {savingRule ? "Bitte warten..." : "Regel speichern"}
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Filter</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Regel, Target, Notiz"
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            />

            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="all">Alle Scopes</option>
              {Object.entries(RULE_SCOPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label.split(" – ")[0]}</option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="all">Alle Severities</option>
              <option value="block">block</option>
              <option value="warning">warning</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="all">Alle Status</option>
              <option value="active">aktiv</option>
              <option value="inactive">inaktiv</option>
            </select>

            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
            >
              <option value="all">Alle Freigabestatus</option>
              <option value="draft">Entwurf</option>
              <option value="pending_review">In Prüfung</option>
              <option value="approved">Freigegeben</option>
              <option value="rejected">Abgelehnt</option>
            </select>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-white border border-[#E5E0D8] p-5">
          <h2 className="text-base font-semibold text-[#0A0A0A] uppercase tracking-wider">Bestehende Regeln</h2>

          {filteredRules.length === 0 ? (
            <p className="mt-4 text-sm text-[#6E6860]">
              Keine Regeln für den aktuellen Filter gefunden.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredRules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-[#E5E0D8] bg-[#FAFAF8] p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Regelname
                      </label>
                      <input
                        value={editingRules[rule.id]?.ruleName ?? ""}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              ruleName: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Scope
                      </label>
                      <select
                        value={editingRules[rule.id]?.ruleScope ?? "substance"}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: getNormalizedRuleForm({
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              ruleScope: e.target.value,
                            }),
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      >
                        <option value="substance">substance</option>
                        <option value="raw_material">raw_material</option>
                        <option value="combination">combination</option>
                        <option value="group">group</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Target
                      </label>

                      {(editingRules[rule.id]?.ruleScope ?? "substance") ===
                      "raw_material" ? (
                        (editingRules[rule.id]?.targetType ?? "name") ===
                        "category" ? (
                          <select
                            value={editingRules[rule.id]?.targetName ?? ""}
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  targetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {Array.from(
                              new Set(
                                rawMaterialOptions
                                  .map((item) => item.category.trim())
                                  .filter(Boolean),
                              ),
                            )
                              .sort((a, b) => a.localeCompare(b))
                              .map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <select
                            value={editingRules[rule.id]?.targetName ?? ""}
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  targetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {rawMaterialOptions.map((item) => (
                              <option key={item.id} value={item.name}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (editingRules[rule.id]?.ruleScope ?? "substance") ===
                        "substance" ? (
                        (editingRules[rule.id]?.targetType ?? "name") ===
                        "inci" ? (
                          <select
                            value={editingRules[rule.id]?.targetName ?? ""}
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  targetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {uniqueInciNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={editingRules[rule.id]?.targetName ?? ""}
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  targetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {uniqueSubstanceNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (editingRules[rule.id]?.ruleScope ?? "substance") ===
                        "group" ? (
                        <select
                          value={editingRules[rule.id]?.targetName ?? ""}
                          onChange={(e) =>
                            setEditingRules((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? getEmptyRuleForm()),
                                targetName: e.target.value,
                              },
                            }))
                          }
                          className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                        >
                          <option value="">Bitte wählen</option>
                          {availableGroups.map((group) => (
                            <option key={group} value={group}>
                              {group}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={editingRules[rule.id]?.targetName ?? ""}
                          onChange={(e) =>
                            setEditingRules((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? getEmptyRuleForm()),
                                targetName: e.target.value,
                              },
                            }))
                          }
                          className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                        />
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Secondary Target
                      </label>

                      {(editingRules[rule.id]?.ruleScope ?? "substance") ===
                      "combination" ? (
                        (editingRules[rule.id]?.targetType ?? "name") ===
                        "raw_material" ? (
                          <select
                            value={
                              editingRules[rule.id]?.secondaryTargetName ?? ""
                            }
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  secondaryTargetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {rawMaterialOptions.map((item) => (
                              <option key={item.id} value={item.name}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        ) : (editingRules[rule.id]?.targetType ?? "name") ===
                          "inci" ? (
                          <select
                            value={
                              editingRules[rule.id]?.secondaryTargetName ?? ""
                            }
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  secondaryTargetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {uniqueInciNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select
                            value={
                              editingRules[rule.id]?.secondaryTargetName ?? ""
                            }
                            onChange={(e) =>
                              setEditingRules((prev) => ({
                                ...prev,
                                [rule.id]: {
                                  ...(prev[rule.id] ?? getEmptyRuleForm()),
                                  secondaryTargetName: e.target.value,
                                },
                              }))
                            }
                            className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                          >
                            <option value="">Bitte wählen</option>
                            {uniqueSubstanceNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        )
                      ) : (
                        <input
                          value={
                            editingRules[rule.id]?.secondaryTargetName ?? ""
                          }
                          onChange={(e) =>
                            setEditingRules((prev) => ({
                              ...prev,
                              [rule.id]: {
                                ...(prev[rule.id] ?? getEmptyRuleForm()),
                                secondaryTargetName: e.target.value,
                              },
                            }))
                          }
                          className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                        />
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Product Type
                      </label>
                      <input
                        value={editingRules[rule.id]?.productType ?? "all"}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              productType: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Stage
                      </label>
                      <select
                        value={editingRules[rule.id]?.appliesToStage ?? "all"}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              appliesToStage: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      >
                        <option value="all">all</option>
                        <option value="accord">accord</option>
                        <option value="fragrance">fragrance</option>
                        <option value="release">release</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Rule Type
                      </label>
                      <select
                        value={
                          editingRules[rule.id]?.ruleType ?? "max_percentage"
                        }
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: getNormalizedRuleForm({
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              ruleType: e.target.value,
                            }),
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      >
                        <option value="max_percentage">max_percentage</option>
                        <option value="forbidden">forbidden</option>
                        <option value="warning_only">warning_only</option>
                        <option value="combination_forbidden">
                          combination_forbidden
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Operator
                      </label>
                      <select
                        value={editingRules[rule.id]?.operator ?? "gt"}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              operator: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      >
                        <option value="gt">gt</option>
                        <option value="gte">gte</option>
                        <option value="lt">lt</option>
                        <option value="lte">lte</option>
                        <option value="eq">eq</option>
                        <option value="neq">neq</option>
                        <option value="contains">contains</option>
                        <option value="combination_forbidden">
                          combination_forbidden
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Threshold %
                      </label>
                      <input
                        value={editingRules[rule.id]?.thresholdPercentage ?? ""}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              thresholdPercentage: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Severity
                      </label>
                      <select
                        value={editingRules[rule.id]?.severity ?? "block"}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              severity: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      >
                        <option value="block">block</option>
                        <option value="warning">warning</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Group Name
                      </label>
                      <input
                        value={editingRules[rule.id]?.groupName ?? ""}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              groupName: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Sort Order
                      </label>
                      <input
                        value={editingRules[rule.id]?.sortOrder ?? "0"}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              sortOrder: e.target.value,
                            },
                          }))
                        }
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#6E6860]">
                        Notizen
                      </label>
                      <textarea
                        value={editingRules[rule.id]?.notes ?? ""}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              notes: e.target.value,
                            },
                          }))
                        }
                        rows={3}
                        className="rounded-xl border border-[#E5E0D8] bg-white px-4 py-3 text-sm w-full focus:outline-none focus:ring-1 focus:ring-[#0A0A0A]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingRules[rule.id]?.isActive ?? true}
                        onChange={(e) =>
                          setEditingRules((prev) => ({
                            ...prev,
                            [rule.id]: {
                              ...(prev[rule.id] ?? getEmptyRuleForm()),
                              isActive: e.target.checked,
                            },
                          }))
                        }
                      />
                      Aktiv
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-block rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wider ${getApprovalStatusClass(rule.approvalStatus)}`}
                    >
                      {getApprovalStatusLabel(rule.approvalStatus)}
                    </span>

                    {rule.rejectionReason && (
                      <span className="text-xs text-red-600">
                        Grund: {rule.rejectionReason}
                      </span>
                    )}

                    {rule.approvedAt && rule.approvalStatus === "approved" && (
                      <span className="text-[10px] text-[#9E9890]">
                        Freigegeben: {new Date(rule.approvedAt).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateRule(rule.id)}
                      disabled={updatingRuleId === rule.id}
                      className="rounded-full bg-[#0A0A0A] text-white px-4 py-1.5 text-xs font-medium uppercase tracking-wider disabled:opacity-40"
                    >
                      {updatingRuleId === rule.id ? "Speichert..." : "Speichern"}
                    </button>

                    <button
                      onClick={() => deleteRule(rule.id)}
                      disabled={deletingRuleId === rule.id}
                      className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs disabled:opacity-40"
                    >
                      {deletingRuleId === rule.id ? "deaktiviert..." : "Deaktivieren"}
                    </button>

                    {(rule.approvalStatus === "draft" ||
                      rule.approvalStatus === "rejected") && (
                      <button
                        onClick={() => submitRuleForReview(rule.id)}
                        disabled={submittingReviewId === rule.id}
                        className="rounded-full border border-amber-400 bg-amber-50 px-4 py-1.5 text-xs text-amber-800 disabled:opacity-40"
                      >
                        {submittingReviewId === rule.id
                          ? "Wird eingereicht..."
                          : "Zur Prüfung einreichen"}
                      </button>
                    )}

                    {rule.approvalStatus === "pending_review" &&
                      currentUserRole === "admin" && (
                        <>
                          <button
                            onClick={() => approveRule(rule.id)}
                            disabled={approvingRuleId === rule.id}
                            className="rounded-full border border-green-500 bg-green-50 px-4 py-1.5 text-xs text-green-800 disabled:opacity-40"
                          >
                            {approvingRuleId === rule.id
                              ? "Wird freigegeben..."
                              : "Freigeben"}
                          </button>

                          <button
                            onClick={() => rejectRule(rule.id)}
                            disabled={rejectingRuleId === rule.id}
                            className="rounded-full border border-red-400 bg-red-50 px-4 py-1.5 text-xs text-red-800 disabled:opacity-40"
                          >
                            {rejectingRuleId === rule.id
                              ? "Wird abgelehnt..."
                              : "Ablehnen"}
                          </button>
                        </>
                      )}

                    {rule.approvalStatus === "approved" &&
                      currentUserRole === "admin" && (
                        <button
                          onClick={() => resetRuleToDraft(rule.id)}
                          className="rounded-full border border-[#E5E0D8] text-[#6E6860] px-4 py-1.5 text-xs"
                        >
                          Zurück zu Entwurf
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

