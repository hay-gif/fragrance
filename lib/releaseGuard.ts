type ReleaseCheckInput = {
  fragrance: {
    description: string;
    category: string;
    imageUrl: string;
    sampleStatus: string;
  };
  accords: { percentage: number }[];
  formulaSum: number;
  profile: {
    productName: string;
    intendedUse: string;
    responsiblePerson: string;
    hasIfraDocument: boolean;
    hasSdsDocuments: boolean;
    hasCpsr: boolean;
    hasAllergenReview: boolean;
    hasLabelReview: boolean;
    hasPackagingReview: boolean;
    hasStabilityReview: boolean;
  };
  documents: { documentType: string }[];
};

export function getReleaseBlockers(input: ReleaseCheckInput): string[] {
  const { fragrance, accords, formulaSum, profile, documents } = input;

  const blockers: string[] = [];

  const hasIfraUpload = documents.some((d) => d.documentType === "ifra");
  const hasSdsUpload = documents.some((d) => d.documentType === "sds");
  const hasCpsrUpload = documents.some((d) => d.documentType === "cpsr");

  if (!hasIfraUpload) blockers.push("IFRA-Datei fehlt");
  if (!hasSdsUpload) blockers.push("SDS-Datei fehlt");
  if (!hasCpsrUpload) blockers.push("CPSR-Datei fehlt");

  if (fragrance.sampleStatus !== "tested") {
    blockers.push("Sample nicht getestet");
  }

  if (!fragrance.category.trim()) blockers.push("Kategorie fehlt");
  if (!fragrance.description.trim()) blockers.push("Beschreibung fehlt");
  if (!fragrance.imageUrl.trim()) blockers.push("Bild fehlt");

  if (accords.length === 0) blockers.push("Keine Accorde");

  if (formulaSum <= 0) blockers.push("Formel = 0%");
  if (Math.abs(formulaSum - 100) > 0.01) {
    blockers.push("Formel ≠ 100%");
  }

  if (!profile.productName.trim()) blockers.push("Produktname fehlt");
  if (!profile.intendedUse.trim()) blockers.push("Intended Use fehlt");
  if (!profile.responsiblePerson.trim())
    blockers.push("Responsible Person fehlt");

  if (!profile.hasIfraDocument) blockers.push("IFRA Review fehlt");
  if (!profile.hasSdsDocuments) blockers.push("SDS Review fehlt");
  if (!profile.hasCpsr) blockers.push("CPSR fehlt");
  if (!profile.hasAllergenReview) blockers.push("Allergen Review fehlt");
  if (!profile.hasLabelReview) blockers.push("Label Review fehlt");
  if (!profile.hasPackagingReview) blockers.push("Packaging Review fehlt");
  if (!profile.hasStabilityReview) blockers.push("Stability fehlt");

  return blockers;
}
