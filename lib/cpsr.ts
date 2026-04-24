// CPSR – Cosmetic Product Safety Report
// Grundlage: EU-Kosmetikverordnung 1223/2009, Anhang I
// SCCS Notes of Guidance for the Testing of Cosmetic Ingredients and their Safety
// Evaluation – 12th Revision (SCCS/1647/22)
//
// MoS (Margin of Safety) = NOAEL / SED
// SED (Systemic Exposure Dose) = (A × F × C/100 × RF × BA × 1000) / BW
//
// Grenzwert: MoS ≥ 100 gilt als akzeptabel (SCCS-Leitlinie)

import type { IFRACategory } from "./ifraLimits";

// ─── Expositions-Parameter ────────────────────────────────────────────────────

export type ExposureParams = {
  /** Aufgetragene Produktmenge pro Anwendung in Gramm */
  amountGPerEvent: number;
  /** Anwendungshäufigkeit pro Tag */
  frequencyPerDay: number;
  /** Retentionsfaktor (0–1). Leave-on = 1.0, Rinse-off = 0.01 */
  retentionFactor: number;
  /** Systemische Bioverfügbarkeit (0–1). Typisch 0.1 für dermale Resorption */
  bioavailabilityFactor: number;
  /** Körpergewicht in kg (SCCS-Standard: 60 kg) */
  bodyWeightKg: number;
};

export const DEFAULT_EXPOSURE_FINE_FRAGRANCE: ExposureParams = {
  amountGPerEvent: 1.0,       // 1 g EDP pro Anwendung (SCCS-Default)
  frequencyPerDay: 2,          // 2× täglich
  retentionFactor: 1.0,        // Leave-on (bleibt auf Haut)
  bioavailabilityFactor: 0.1,  // 10% dermale Absorption (konservativ)
  bodyWeightKg: 60,
};

export const DEFAULT_EXPOSURE_BODY_LOTION: ExposureParams = {
  amountGPerEvent: 8.0,
  frequencyPerDay: 1,
  retentionFactor: 1.0,
  bioavailabilityFactor: 0.1,
  bodyWeightKg: 60,
};

export const DEFAULT_EXPOSURE_SHOWER_GEL: ExposureParams = {
  amountGPerEvent: 8.0,
  frequencyPerDay: 1,
  retentionFactor: 0.01,       // Rinse-off: nahezu alles wird abgespült
  bioavailabilityFactor: 0.1,
  bodyWeightKg: 60,
};

export const EXPOSURE_PRESETS: Record<IFRACategory, ExposureParams> = {
  fine_fragrance: DEFAULT_EXPOSURE_FINE_FRAGRANCE,
  face_leave_on: { amountGPerEvent: 1.0, frequencyPerDay: 2, retentionFactor: 1.0, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  body_leave_on: DEFAULT_EXPOSURE_BODY_LOTION,
  baby_leave_on: { amountGPerEvent: 4.0, frequencyPerDay: 2, retentionFactor: 1.0, bioavailabilityFactor: 0.1, bodyWeightKg: 10 },
  deo_spray:     { amountGPerEvent: 2.5, frequencyPerDay: 1, retentionFactor: 1.0, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  deo_nonspray:  { amountGPerEvent: 1.5, frequencyPerDay: 1, retentionFactor: 1.0, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  rinse_off:     DEFAULT_EXPOSURE_SHOWER_GEL,
  rinse_hair:    { amountGPerEvent: 10.0, frequencyPerDay: 1, retentionFactor: 0.01, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  leave_hair:    { amountGPerEvent: 3.0, frequencyPerDay: 1, retentionFactor: 1.0, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  lip:           { amountGPerEvent: 0.03, frequencyPerDay: 3, retentionFactor: 1.0, bioavailabilityFactor: 0.5, bodyWeightKg: 60 },
  eye:           { amountGPerEvent: 0.5, frequencyPerDay: 2, retentionFactor: 1.0, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  oral:          { amountGPerEvent: 5.0, frequencyPerDay: 2, retentionFactor: 0.2, bioavailabilityFactor: 0.5, bodyWeightKg: 60 },
  nail:          { amountGPerEvent: 0.5, frequencyPerDay: 1, retentionFactor: 1.0, bioavailabilityFactor: 0.01, bodyWeightKg: 60 },
  intimate:      { amountGPerEvent: 2.0, frequencyPerDay: 1, retentionFactor: 0.1, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
  baby_rinse:    { amountGPerEvent: 6.0, frequencyPerDay: 1, retentionFactor: 0.01, bioavailabilityFactor: 0.1, bodyWeightKg: 10 },
  fabric:        { amountGPerEvent: 60.0, frequencyPerDay: 1, retentionFactor: 0.001, bioavailabilityFactor: 0.1, bodyWeightKg: 60 },
};

// ─── Substanztypen für CPSR ───────────────────────────────────────────────────

export type SubstanceForCPSR = {
  substanceName: string;
  inciName: string;
  casNumber?: string;
  /** Effektiver %-Anteil im Endprodukt (aus INCI-Generator / Vererbungskette) */
  totalPercentInProduct: number;
  /** NOAEL (No Observable Adverse Effect Level) in mg/kg KG/Tag */
  noaelMgPerKgBwDay: number | null;
  isAllergen?: boolean;
  sourceReference?: string;
};

// ─── SED-Berechnung ───────────────────────────────────────────────────────────

/**
 * SED = (A × F × (C/100) × RF × BA × 1000) / BW
 * Einheit: mg Substanz pro kg KG pro Tag
 */
export function calculateSED(
  concentrationPercent: number,
  params: ExposureParams,
): number {
  const { amountGPerEvent, frequencyPerDay, retentionFactor, bioavailabilityFactor, bodyWeightKg } = params;

  const sed =
    (amountGPerEvent *
      frequencyPerDay *
      (concentrationPercent / 100) *
      retentionFactor *
      bioavailabilityFactor *
      1000) /
    bodyWeightKg;

  return sed;
}

// ─── MoS-Berechnung ──────────────────────────────────────────────────────────

export type SubstanceMoSResult = {
  substanceName: string;
  inciName: string;
  casNumber?: string;
  totalPercentInProduct: number;
  noaelMgPerKgBwDay: number | null;
  sed: number | null;
  mos: number | null;
  /** true wenn MoS >= 100 oder keine NOAEL vorhanden (unkritisch / nicht bewertbar) */
  acceptable: boolean;
  mosStatus: "ok" | "critical" | "no_data";
  isAllergen: boolean;
  sourceReference?: string;
};

/** MoS >= 100 = akzeptabel nach SCCS-Leitlinie */
export const MOS_THRESHOLD = 100;

export function calculateMoS(
  substance: SubstanceForCPSR,
  params: ExposureParams,
): SubstanceMoSResult {
  const baseResult: Omit<SubstanceMoSResult, "sed" | "mos" | "acceptable" | "mosStatus"> = {
    substanceName: substance.substanceName,
    inciName: substance.inciName,
    casNumber: substance.casNumber,
    totalPercentInProduct: substance.totalPercentInProduct,
    noaelMgPerKgBwDay: substance.noaelMgPerKgBwDay,
    isAllergen: substance.isAllergen ?? false,
    sourceReference: substance.sourceReference,
  };

  if (!substance.noaelMgPerKgBwDay || substance.noaelMgPerKgBwDay <= 0) {
    return {
      ...baseResult,
      sed: null,
      mos: null,
      acceptable: true, // Kein NOAEL = nicht bewertbar, kein automatischer Fehler
      mosStatus: "no_data",
    };
  }

  if (substance.totalPercentInProduct <= 0) {
    return {
      ...baseResult,
      sed: 0,
      mos: Infinity,
      acceptable: true,
      mosStatus: "ok",
    };
  }

  const sed = calculateSED(substance.totalPercentInProduct, params);

  if (sed <= 0) {
    return {
      ...baseResult,
      sed: 0,
      mos: Infinity,
      acceptable: true,
      mosStatus: "ok",
    };
  }

  const mos = substance.noaelMgPerKgBwDay / sed;
  const acceptable = mos >= MOS_THRESHOLD;

  return {
    ...baseResult,
    sed: Number(sed.toFixed(8)),
    mos: Number(mos.toFixed(2)),
    acceptable,
    mosStatus: acceptable ? "ok" : "critical",
  };
}

// ─── CPSR Part B ─────────────────────────────────────────────────────────────

export type CPSRPartBResult = {
  /** Liste aller bewerteten Substanzen mit MoS */
  substanceResults: SubstanceMoSResult[];
  /** Substanzen ohne NOAEL-Daten */
  substancesWithoutNoael: SubstanceMoSResult[];
  /** Substanzen mit kritischem MoS (< 100) */
  criticalSubstances: SubstanceMoSResult[];
  /** Substanzen mit akzeptablem MoS */
  acceptableSubstances: SubstanceMoSResult[];
  /** Verwendete Expositionsparameter */
  exposureParams: ExposureParams;
  /** Gesamtbewertung: true wenn alle bewertbaren Substanzen MoS >= 100 */
  overallAcceptable: boolean;
  /** Anzahl deklarationspflichtiger Allergene */
  declarableAllergenCount: number;
  /** Gesamtanteil Allergene im Produkt (%) */
  totalAllergenPercent: number;
};

export function runCPSRPartB(
  substances: SubstanceForCPSR[],
  params: ExposureParams,
): CPSRPartBResult {
  const substanceResults = substances.map((s) => calculateMoS(s, params));

  const criticalSubstances = substanceResults.filter((r) => r.mosStatus === "critical");
  const acceptableSubstances = substanceResults.filter((r) => r.mosStatus === "ok");
  const substancesWithoutNoael = substanceResults.filter((r) => r.mosStatus === "no_data");

  const overallAcceptable = criticalSubstances.length === 0;

  const declarableAllergenCount = substanceResults.filter((r) => r.isAllergen).length;
  const totalAllergenPercent = Number(
    substanceResults
      .filter((r) => r.isAllergen)
      .reduce((sum, r) => sum + r.totalPercentInProduct, 0)
      .toFixed(6),
  );

  return {
    substanceResults,
    substancesWithoutNoael,
    criticalSubstances,
    acceptableSubstances,
    exposureParams: params,
    overallAcceptable,
    declarableAllergenCount,
    totalAllergenPercent,
  };
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

/** Formatiert MoS als lesbaren String */
export function formatMoS(mos: number | null): string {
  if (mos === null) return "k.A.";
  if (mos === Infinity) return "∞";
  if (mos >= 10000) return ">10 000";
  return mos.toFixed(0);
}

/** Formatiert SED als lesbaren String */
export function formatSED(sed: number | null): string {
  if (sed === null) return "k.A.";
  if (sed === 0) return "0";
  if (sed < 0.0001) return sed.toExponential(2);
  return sed.toFixed(6);
}

/** MoS-Ampelfarbe für UI */
export function mosBadgeColor(status: SubstanceMoSResult["mosStatus"]): string {
  if (status === "ok") return "text-green-400 bg-green-400/10";
  if (status === "critical") return "text-red-400 bg-red-400/10";
  return "text-yellow-400 bg-yellow-400/10";
}

/** Erklärender Text für MoS-Status */
export function mosStatusLabel(status: SubstanceMoSResult["mosStatus"]): string {
  if (status === "ok") return "Akzeptabel";
  if (status === "critical") return "Kritisch (MoS < 100)";
  return "Keine NOAEL-Daten";
}
