// INCI-Generierung aus Rohstoff-Substanzen
// Referenz: EU Kosmetik-Verordnung (EG) Nr. 1223/2009

export type InciIngredient = {
  inciName: string;
  substanceName: string;
  totalPercentage: number;
  isAllergen: boolean;
  isDeclarable: boolean;
  requiresDeclaration: boolean;
  rawMaterials: string[];
};

export type InciListResult = {
  ingredients: InciIngredient[];
  allergenList: string[];
  declarableList: string[];
  totalAllergenPercent: number;
  totalDeclarablePercent: number;
};

export type RawMaterialSubstance = {
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialPercentInFormula: number;
  substanceName: string;
  inciName: string;
  percentInRawMaterial: number;
  isAllergen: boolean;
  isDeclarable: boolean;
};

// Allergen-Deklarationsschwellen nach EU-Verordnung
// Rinse-off: >= 0.01%, Leave-on: >= 0.001%
const ALLERGEN_THRESHOLD_LEAVE_ON = 0.001;
const ALLERGEN_THRESHOLD_RINSE_OFF = 0.01;

export function generateInciList(
  substances: RawMaterialSubstance[],
  productType: "leave_on" | "rinse_off" = "leave_on",
): InciListResult {
  const allergenThreshold =
    productType === "leave_on"
      ? ALLERGEN_THRESHOLD_LEAVE_ON
      : ALLERGEN_THRESHOLD_RINSE_OFF;

  // Substanzen nach INCI-Name zusammenfassen
  const map = new Map<
    string,
    {
      inciName: string;
      substanceName: string;
      totalPercentage: number;
      isAllergen: boolean;
      isDeclarable: boolean;
      rawMaterials: Set<string>;
    }
  >();

  for (const substance of substances) {
    // Effektiver Anteil der Substanz in der Gesamtformel
    const effectivePercent =
      (substance.rawMaterialPercentInFormula *
        substance.percentInRawMaterial) /
      100;

    const key = substance.inciName.trim().toUpperCase() || substance.substanceName.trim().toUpperCase();

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.totalPercentage += effectivePercent;
      existing.rawMaterials.add(substance.rawMaterialName);
      // isAllergen/isDeclarable: true wenn mindestens eine Quelle es ist
      if (substance.isAllergen) existing.isAllergen = true;
      if (substance.isDeclarable) existing.isDeclarable = true;
    } else {
      map.set(key, {
        inciName: substance.inciName.trim() || substance.substanceName.trim(),
        substanceName: substance.substanceName.trim(),
        totalPercentage: effectivePercent,
        isAllergen: substance.isAllergen,
        isDeclarable: substance.isDeclarable,
        rawMaterials: new Set([substance.rawMaterialName]),
      });
    }
  }

  // In Array umwandeln und nach Prozentanteil absteigend sortieren (INCI-Regel)
  const ingredients: InciIngredient[] = Array.from(map.values())
    .map((item) => ({
      inciName: item.inciName,
      substanceName: item.substanceName,
      totalPercentage: Number(item.totalPercentage.toFixed(6)),
      isAllergen: item.isAllergen,
      isDeclarable: item.isDeclarable,
      requiresDeclaration:
        item.isAllergen && item.totalPercentage >= allergenThreshold,
      rawMaterials: Array.from(item.rawMaterials),
    }))
    .sort((a, b) => b.totalPercentage - a.totalPercentage);

  // Allergen-Pflichtliste (>= Schwellenwert, alphabetisch)
  const allergenList = ingredients
    .filter((i) => i.requiresDeclaration)
    .map((i) => i.inciName)
    .sort((a, b) => a.localeCompare(b));

  // Deklarierbare Inhaltsstoffe (nicht Pflicht-Allergene, aber deklarierbar)
  const declarableList = ingredients
    .filter((i) => i.isDeclarable && !i.requiresDeclaration)
    .map((i) => i.inciName)
    .sort((a, b) => a.localeCompare(b));

  const totalAllergenPercent = Number(
    ingredients
      .filter((i) => i.isAllergen)
      .reduce((sum, i) => sum + i.totalPercentage, 0)
      .toFixed(6),
  );

  const totalDeclarablePercent = Number(
    ingredients
      .filter((i) => i.isDeclarable)
      .reduce((sum, i) => sum + i.totalPercentage, 0)
      .toFixed(6),
  );

  return {
    ingredients,
    allergenList,
    declarableList,
    totalAllergenPercent,
    totalDeclarablePercent,
  };
}

export function formatInciString(ingredients: InciIngredient[]): string {
  return ingredients.map((i) => i.inciName.toUpperCase()).join(", ");
}
