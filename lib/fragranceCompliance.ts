import { checkAllIFRALimits } from "./ifraLimits";
import { calculateMoS, DEFAULT_EXPOSURE_FINE_FRAGRANCE } from "./cpsr";

export type ComplianceRuleInput = {
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
  isActive: boolean;
};

export type FragranceRawMaterialInput = {
  rawMaterialName: string;
  percentage: number;
  category: string;
};

export type FragranceSubstanceInput = {
  substanceName: string;
  inciName: string;
  percentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
  /** CAS-Nummer für IFRA-Lookup */
  casNumber?: string;
  /** NOAEL für MoS-Berechnung (mg/kg KG/Tag) */
  noaelMgPerKgBwDay?: number | null;
};

export type ComplianceResult = {
  key: string;
  ruleName: string;
  severity: string;
  message: string;
  /** Optionale strukturierte Daten für UI-Darstellung */
  detail?: {
    type: "mos" | "ifra" | "allergen";
    substanceName?: string;
    actualValue?: number;
    limitValue?: number;
    mosValue?: number;
  };
};

export type EvaluationContext = {
  /** Expositionsparameter für MoS-Berechnung */
  exposureParams?: import("./cpsr").ExposureParams;
  /** IFRA-Kategorie für IFRA-Check */
  ifraCategory?: import("./ifraLimits").IFRACategory;
  /** Produkttyp: leave_on | rinse_off (für Allergen-Schwellenwert) */
  allergenProductType?: "leave_on" | "rinse_off";
};

function matchesStage(ruleStage: string, currentStage: string) {
  return ruleStage === "all" || ruleStage === currentStage;
}

function matchesProductType(
  ruleProductType: string,
  currentProductType: string,
) {
  return ruleProductType === "all" || ruleProductType === currentProductType;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function compare(operator: string, left: number, right: number) {
  if (operator === "gt") return left > right;
  if (operator === "gte") return left >= right;
  if (operator === "lt") return left < right;
  if (operator === "lte") return left <= right;
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;
  return false;
}

export function evaluateFragranceComplianceRules(args: {
  rules: ComplianceRuleInput[];
  rawMaterials: FragranceRawMaterialInput[];
  substances: FragranceSubstanceInput[];
  stage: string;
  productType: string;
  /** Optionaler Kontext für erweiterte Regeln (IFRA, MoS, Allergen-Deklaration) */
  context?: EvaluationContext;
}): ComplianceResult[] {
  const { rules, rawMaterials, substances, stage, productType, context } = args;
  const results: ComplianceResult[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (!matchesStage(rule.appliesToStage, stage)) continue;
    if (!matchesProductType(rule.productType, productType)) continue;

    if (rule.ruleScope === "raw_material") {
      for (const item of rawMaterials) {
        const materialName = normalize(item.rawMaterialName);
        const category = normalize(item.category);
        const target = normalize(rule.targetName);

        const matched =
          (rule.targetType === "name" && materialName === target) ||
          (rule.targetType === "category" && category === target);

        if (!matched) continue;

        if (rule.ruleType === "forbidden") {
          results.push({
            key: `${rule.id}-${item.rawMaterialName}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Rohstoff verboten: ${item.rawMaterialName}`,
          });
        }

        if (
          rule.ruleType === "max_percentage" &&
          rule.thresholdPercentage !== null &&
          compare(rule.operator, item.percentage, rule.thresholdPercentage)
        ) {
          results.push({
            key: `${rule.id}-${item.rawMaterialName}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Rohstoff ${item.rawMaterialName} liegt mit ${item.percentage.toFixed(
              4,
            )}% außerhalb der Regelgrenze ${rule.thresholdPercentage.toFixed(4)}%.`,
          });
        }
      }
    }

    if (rule.ruleScope === "substance") {
      for (const item of substances) {
        const substanceName = normalize(item.substanceName);
        const inciName = normalize(item.inciName);
        const target = normalize(rule.targetName);

        const matched =
          (rule.targetType === "name" && substanceName === target) ||
          (rule.targetType === "inci" && inciName === target);

        if (!matched) continue;

        if (rule.ruleType === "forbidden") {
          results.push({
            key: `${rule.id}-${item.substanceName}-${item.inciName}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Stoff verboten: ${item.inciName || item.substanceName}`,
          });
        }

        if (
          rule.ruleType === "max_percentage" &&
          rule.thresholdPercentage !== null &&
          compare(rule.operator, item.percentage, rule.thresholdPercentage)
        ) {
          results.push({
            key: `${rule.id}-${item.substanceName}-${item.inciName}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Stoff ${item.inciName || item.substanceName} liegt mit ${item.percentage.toFixed(
              6,
            )}% außerhalb der Regelgrenze ${rule.thresholdPercentage.toFixed(6)}%.`,
          });
        }
      }
    }

    if (rule.ruleScope === "combination") {
      const targetA = normalize(rule.targetName);
      const targetB = normalize(rule.secondaryTargetName);

      const matchedSubstances = substances.map(
        (item) => normalize(item.inciName) || normalize(item.substanceName),
      );

      const matchedRawMaterials = rawMaterials.map((item) =>
        normalize(item.rawMaterialName),
      );

      const existsA =
        matchedSubstances.includes(targetA) ||
        matchedRawMaterials.includes(targetA);
      const existsB =
        matchedSubstances.includes(targetB) ||
        matchedRawMaterials.includes(targetB);

      if (existsA && existsB) {
        results.push({
          key: `${rule.id}-${targetA}-${targetB}`,
          ruleName: rule.ruleName,
          severity: rule.severity,
          message: `Verbotene Kombination erkannt: ${rule.targetName} + ${rule.secondaryTargetName}`,
        });
      }
    }

    if (rule.ruleScope === "group") {
      let total = 0;

      if (normalize(rule.targetName) === "allergens") {
        total = substances
          .filter((item) => item.isAllergen)
          .reduce((sum, item) => sum + item.percentage, 0);
      }

      if (normalize(rule.targetName) === "declarable") {
        total = substances
          .filter((item) => item.isDeclarable)
          .reduce((sum, item) => sum + item.percentage, 0);
      }

      if (
        rule.ruleType === "max_percentage" &&
        rule.thresholdPercentage !== null &&
        compare(rule.operator, total, rule.thresholdPercentage)
      ) {
        results.push({
          key: `${rule.id}-${rule.targetName}`,
          ruleName: rule.ruleName,
          severity: rule.severity,
          message: `Gruppe ${rule.targetName} liegt mit ${total.toFixed(
            6,
          )}% außerhalb der Regelgrenze ${rule.thresholdPercentage.toFixed(6)}%.`,
        });
      }
    }

    // ── IFRA-Check ────────────────────────────────────────────────────────────
    // Prüft alle Substanzen mit CAS-Nummer gegen IFRA 51st Amendment Limits.
    // Benötigt context.ifraCategory; Fallback: "fine_fragrance".
    if (rule.ruleScope === "ifra" && rule.ruleType === "ifra_check") {
      const category = context?.ifraCategory ?? "fine_fragrance";

      const ifraInput = substances.map((s) => ({
        casNumber: s.casNumber,
        substanceName: s.substanceName,
        inciName: s.inciName,
        totalPercent: s.percentage,
      }));

      const { violations, prohibitedFound } = checkAllIFRALimits(ifraInput, category);

      for (const v of prohibitedFound) {
        results.push({
          key: `${rule.id}-ifra-prohibited-${v.casNumber}`,
          ruleName: rule.ruleName,
          severity: "critical",
          message: `IFRA: ${v.substanceName} ist verboten und darf nicht verwendet werden.`,
          detail: { type: "ifra", substanceName: v.substanceName, actualValue: v.actualPercent, limitValue: 0 },
        });
      }

      for (const v of violations.filter((x) => !x.prohibited)) {
        results.push({
          key: `${rule.id}-ifra-exceeded-${v.casNumber}`,
          ruleName: rule.ruleName,
          severity: rule.severity,
          message: `IFRA (${category}): ${v.substanceName} überschreitet Grenzwert ${v.limit?.toFixed(4)}% (ist ${v.actualPercent.toFixed(4)}%, Δ +${v.exceededBy?.toFixed(4)}%).`,
          detail: { type: "ifra", substanceName: v.substanceName, actualValue: v.actualPercent, limitValue: v.limit ?? 0 },
        });
      }
    }

    // ── MoS-Schwellenwert-Regel ───────────────────────────────────────────────
    // Prüft ob der berechnete MoS einer Substanz unter dem Schwellenwert liegt.
    // Benötigt context.exposureParams und noaelMgPerKgBwDay auf den Substanzen.
    if (rule.ruleScope === "substance" && rule.ruleType === "mos_threshold") {
      const params = context?.exposureParams ?? DEFAULT_EXPOSURE_FINE_FRAGRANCE;
      const threshold = rule.thresholdPercentage ?? 100;

      for (const sub of substances) {
        if (!sub.noaelMgPerKgBwDay) continue;

        const mosResult = calculateMoS(
          {
            substanceName: sub.substanceName,
            inciName: sub.inciName,
            casNumber: sub.casNumber,
            totalPercentInProduct: sub.percentage,
            noaelMgPerKgBwDay: sub.noaelMgPerKgBwDay,
          },
          params,
        );

        if (mosResult.mos !== null && mosResult.mos < threshold) {
          results.push({
            key: `${rule.id}-mos-${sub.substanceName}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `MoS-Warnung: ${sub.inciName || sub.substanceName} hat MoS ${mosResult.mos.toFixed(0)} (Mindest-MoS: ${threshold}).`,
            detail: { type: "mos", substanceName: sub.substanceName, mosValue: mosResult.mos, limitValue: threshold },
          });
        }
      }
    }

    // ── Allergen-Deklarationspflicht ─────────────────────────────────────────
    // Warnt wenn deklarierungspflichtige Allergene ohne isDeclarable-Flag vorhanden sind.
    // Relevant für: Leave-on >= 0.001%, Rinse-off >= 0.01%.
    if (rule.ruleScope === "substance" && rule.ruleType === "allergen_declaration_required") {
      const productTypeCxt = context?.allergenProductType ?? "leave_on";
      const threshold = productTypeCxt === "leave_on" ? 0.001 : 0.01;

      for (const sub of substances) {
        if (sub.isAllergen && sub.percentage >= threshold && !sub.isDeclarable) {
          results.push({
            key: `${rule.id}-allergen-decl-${sub.inciName}`,
            ruleName: rule.ruleName,
            severity: rule.severity,
            message: `Deklarationspflicht: ${sub.inciName || sub.substanceName} (${sub.percentage.toFixed(4)}%) muss auf dem Etikett deklariert werden (Schwellenwert ${threshold}%).`,
            detail: { type: "allergen", substanceName: sub.substanceName, actualValue: sub.percentage, limitValue: threshold },
          });
        }
      }
    }
  }

  return results;
}
