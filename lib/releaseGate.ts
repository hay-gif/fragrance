export type ReleaseGateInput = {
  sampleStatus: "not_requested" | "requested" | "shipped" | "tested";
  formulaReady: boolean;
  inciReady: boolean;
  sdsCoverageReady: boolean;
  ifraCoverageReady: boolean;
  toxicologyCoverageReady: boolean;
  missingDocuments: string[];
  expiredDocuments: string[];
};

export type ReleaseGateResult = {
  isReady: boolean;
  blockers: string[];
};

export function buildReleaseGate(input: ReleaseGateInput): ReleaseGateResult {
  const blockers: string[] = [];

  if (input.sampleStatus !== "tested") {
    blockers.push("Sample wurde noch nicht getestet.");
  }

  if (!input.formulaReady) {
    blockers.push("Formel ist nicht auf 100% normalisiert.");
  }

  if (!input.inciReady) {
    blockers.push("INCI-Liste ist noch nicht generierbar.");
  }

  if (!input.sdsCoverageReady) {
    blockers.push("SDS-Coverage ist unvollständig.");
  }

  if (!input.ifraCoverageReady) {
    blockers.push("IFRA-Coverage ist unvollständig.");
  }

  if (!input.toxicologyCoverageReady) {
    blockers.push("Toxikologische Referenzwerte fehlen.");
  }

  if (input.missingDocuments.length > 0) {
    blockers.push(
      `Fehlende Rohstoffdokumente: ${input.missingDocuments.join(", ")}`,
    );
  }

  if (input.expiredDocuments.length > 0) {
    blockers.push(
      `Abgelaufene Rohstoffdokumente: ${input.expiredDocuments.join(", ")}`,
    );
  }

  return {
    isReady: blockers.length === 0,
    blockers,
  };
}
