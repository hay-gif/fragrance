// IFRA 51st Amendment Restricted & Prohibited Substances
// Quelle: International Fragrance Association (IFRA) – 51st Amendment (2023)
// Grenzwerte: % im fertigen Endprodukt

// ─── Kategorien ──────────────────────────────────────────────────────────────
// Für ein Parfüm / EDP ist "fine_fragrance" die relevante Kategorie.
// Hautlotion (leave-on) und Duschgel (rinse_off) sind ebenfalls relevant
// wenn das Produkt als Körperpflege vermarktet wird.

export type IFRACategory =
  | "lip"           // Kat 1 – Lippenprodukte
  | "deo_spray"     // Kat 2 – Deodorant-Spray
  | "eye"           // Kat 3 – Augenbereich
  | "fine_fragrance"// Kat 4 – Parfüm / EDP / EDT / Aftershave
  | "face_leave_on" // Kat 5A/B – Gesichtspflege Leave-on
  | "body_leave_on" // Kat 5C – Körperlotion Leave-on
  | "baby_leave_on" // Kat 5D – Baby-Lotion
  | "oral"          // Kat 6 – Mundpflege
  | "rinse_hair"    // Kat 7A – Haarkonditionierer Rinse-off
  | "leave_hair"    // Kat 7B – Haarpflege Leave-on
  | "nail"          // Kat 8 – Nagelpflege
  | "deo_nonspray"  // Kat 9 – Deodorant nicht-Spray (Roll-on, Stick)
  | "rinse_off"     // Kat 10A/B – Duschgel, Shampoo, Gesichtswaschmittel
  | "intimate"      // Kat 11A/B – Intime Reinigung
  | "baby_rinse"    // Kat 11C – Baby Rinse-off
  | "fabric";       // Kat 12 – Textilpflegemittel

// null = verboten (prohibited), Zahl = maximale % im Endprodukt
export type IFRALimitEntry = {
  substanceName: string;
  casNumber: string;
  prohibited: boolean;
  // Limits pro Kategorie (% in Endprodukt); fehlendes Key = kein IFRA-Limit gesetzt
  limits: Partial<Record<IFRACategory, number | null>>;
  note?: string;
};

// ─── IFRA 51st Amendment Substanzdaten ───────────────────────────────────────
export const IFRA_51_LIMITS: IFRALimitEntry[] = [
  // ── VERBOTENE STOFFE ──────────────────────────────────────────────────────
  {
    substanceName: "Peru Balsam (Myroxylon pereirae)",
    casNumber: "8007-00-9",
    prohibited: true,
    limits: {},
    note: "Seit IFRA 43. Änderung verboten. Starkes Allergen.",
  },
  {
    substanceName: "Lyral (HICC, Hydroxyisohexyl 3-cyclohexene carboxaldehyde)",
    casNumber: "31906-04-4",
    prohibited: true,
    limits: {},
    note: "Verboten ab IFRA 50. Änderung. EU-Allergen.",
  },
  {
    substanceName: "Lilial (BMHCA, Butylphenyl methylpropional)",
    casNumber: "80-54-6",
    prohibited: true,
    limits: {},
    note: "Verboten durch EU-Verordnung 2021/1099. Reproduktionstoxisch Kat. 2.",
  },
  {
    substanceName: "Safrole",
    casNumber: "94-59-7",
    prohibited: true,
    limits: {},
    note: "Verboten. Kanzerogen.",
  },
  {
    substanceName: "Isosafrole",
    casNumber: "120-58-1",
    prohibited: true,
    limits: {},
    note: "Verboten. Strukturell verwandt mit Safrole.",
  },
  {
    substanceName: "Musk Ambrette (Musk Ambrette)",
    casNumber: "83-66-9",
    prohibited: true,
    limits: {},
    note: "Verboten. Nitromusk, neurotoxisch.",
  },
  {
    substanceName: "Musk Tibetene",
    casNumber: "145-39-1",
    prohibited: true,
    limits: {},
    note: "Verboten. Nitromusk.",
  },
  {
    substanceName: "Benzyl cyanide",
    casNumber: "140-29-4",
    prohibited: true,
    limits: {},
  },
  {
    substanceName: "Broom absolute (Spartium junceum)",
    casNumber: "90028-43-6",
    prohibited: true,
    limits: {},
    note: "Verboten wegen Cytisine-Gehalt.",
  },
  {
    substanceName: "Calamus oil (Acorus calamus)",
    casNumber: "84775-39-3",
    prohibited: true,
    limits: {},
    note: "Verboten. Beta-Asaron als Bestandteil.",
  },

  // ── STARK EINGESCHRÄNKTE STOFFE ───────────────────────────────────────────
  {
    substanceName: "Methyl Eugenol",
    casNumber: "93-15-2",
    prohibited: false,
    limits: {
      lip: 0.001,
      fine_fragrance: 0.004,
      face_leave_on: 0.002,
      body_leave_on: 0.002,
      baby_leave_on: 0.0002,
      deo_spray: 0.001,
      deo_nonspray: 0.001,
      rinse_off: 0.01,
      rinse_hair: 0.01,
      leave_hair: 0.002,
    },
    note: "IFRA 51. Stark eingeschränkt. Genotoxisch.",
  },
  {
    substanceName: "Isoeugenol",
    casNumber: "97-54-1",
    prohibited: false,
    limits: {
      lip: 0.001,
      fine_fragrance: 0.02,
      face_leave_on: 0.02,
      body_leave_on: 0.02,
      baby_leave_on: 0.001,
      deo_spray: 0.006,
      deo_nonspray: 0.006,
      rinse_off: 0.1,
      rinse_hair: 0.1,
      leave_hair: 0.02,
      intimate: 0.01,
    },
    note: "EU-Pflichtallergene. Stark eingeschränkt.",
  },

  // ── EINGESCHRÄNKTE STOFFE ─────────────────────────────────────────────────
  {
    substanceName: "Cinnamal (trans-Cinnamaldehyde)",
    casNumber: "104-55-2",
    prohibited: false,
    limits: {
      lip: 0.01,
      fine_fragrance: 0.05,
      face_leave_on: 0.05,
      body_leave_on: 0.05,
      baby_leave_on: 0.01,
      deo_spray: 0.02,
      deo_nonspray: 0.02,
      rinse_off: 0.2,
      rinse_hair: 0.2,
      leave_hair: 0.05,
      intimate: 0.01,
      baby_rinse: 0.01,
    },
    note: "EU-Pflichtallergene (EU 1223/2009 Anhang III).",
  },
  {
    substanceName: "Cinnamyl Alcohol",
    casNumber: "104-54-1",
    prohibited: false,
    limits: {
      lip: 0.2,
      fine_fragrance: 0.8,
      face_leave_on: 0.8,
      body_leave_on: 0.8,
      baby_leave_on: 0.1,
      deo_spray: 0.3,
      deo_nonspray: 0.3,
      rinse_off: 4.0,
      rinse_hair: 4.0,
      leave_hair: 0.8,
      intimate: 0.2,
      baby_rinse: 0.1,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Eugenol",
    casNumber: "97-53-0",
    prohibited: false,
    limits: {
      lip: 0.5,
      fine_fragrance: 0.5,
      face_leave_on: 0.5,
      body_leave_on: 0.5,
      baby_leave_on: 0.1,
      deo_spray: 0.2,
      deo_nonspray: 0.2,
      rinse_off: 2.5,
      rinse_hair: 2.5,
      leave_hair: 0.5,
      intimate: 0.2,
      baby_rinse: 0.1,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Coumarin",
    casNumber: "91-64-5",
    prohibited: false,
    limits: {
      lip: 0.1,
      fine_fragrance: 0.4,
      face_leave_on: 0.4,
      body_leave_on: 0.4,
      baby_leave_on: 0.05,
      deo_spray: 0.15,
      deo_nonspray: 0.15,
      rinse_off: 2.0,
      rinse_hair: 2.0,
      leave_hair: 0.4,
      intimate: 0.1,
      baby_rinse: 0.05,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Citral",
    casNumber: "5392-40-5",
    prohibited: false,
    limits: {
      lip: 0.2,
      fine_fragrance: 0.8,
      face_leave_on: 0.8,
      body_leave_on: 0.8,
      baby_leave_on: 0.1,
      deo_spray: 0.3,
      deo_nonspray: 0.3,
      rinse_off: 4.0,
      rinse_hair: 4.0,
      leave_hair: 0.8,
      intimate: 0.2,
      baby_rinse: 0.1,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Geraniol",
    casNumber: "106-24-1",
    prohibited: false,
    limits: {
      lip: 1.4,
      fine_fragrance: 5.3,
      face_leave_on: 5.3,
      body_leave_on: 5.3,
      baby_leave_on: 0.7,
      deo_spray: 2.0,
      deo_nonspray: 2.0,
      rinse_off: 25.0,
      rinse_hair: 25.0,
      leave_hair: 5.3,
      intimate: 1.4,
      baby_rinse: 0.7,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Linalool",
    casNumber: "78-70-6",
    prohibited: false,
    limits: {
      lip: 5.5,
      fine_fragrance: 19.2,
      face_leave_on: 19.2,
      body_leave_on: 19.2,
      baby_leave_on: 2.5,
      deo_spray: 7.4,
      deo_nonspray: 7.4,
      rinse_off: 100.0,
      rinse_hair: 100.0,
      leave_hair: 19.2,
      intimate: 5.5,
      baby_rinse: 2.5,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Citronellol",
    casNumber: "106-22-9",
    prohibited: false,
    limits: {
      lip: 3.0,
      fine_fragrance: 10.5,
      face_leave_on: 10.5,
      body_leave_on: 10.5,
      baby_leave_on: 1.3,
      deo_spray: 4.0,
      deo_nonspray: 4.0,
      rinse_off: 50.0,
      rinse_hair: 50.0,
      leave_hair: 10.5,
      intimate: 3.0,
      baby_rinse: 1.3,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Hydroxycitronellal",
    casNumber: "107-75-5",
    prohibited: false,
    limits: {
      lip: 0.06,
      fine_fragrance: 0.2,
      face_leave_on: 0.2,
      body_leave_on: 0.2,
      baby_leave_on: 0.02,
      deo_spray: 0.08,
      deo_nonspray: 0.08,
      rinse_off: 1.0,
      rinse_hair: 1.0,
      leave_hair: 0.2,
      intimate: 0.06,
      baby_rinse: 0.02,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Benzyl Benzoate",
    casNumber: "120-51-4",
    prohibited: false,
    limits: {
      lip: 1.7,
      fine_fragrance: 6.25,
      face_leave_on: 6.25,
      body_leave_on: 6.25,
      baby_leave_on: 0.7,
      deo_spray: 2.5,
      deo_nonspray: 2.5,
      rinse_off: 30.0,
      rinse_hair: 30.0,
      leave_hair: 6.25,
      intimate: 1.7,
      baby_rinse: 0.7,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Benzyl Salicylate",
    casNumber: "118-58-1",
    prohibited: false,
    limits: {
      lip: 0.3,
      fine_fragrance: 1.0,
      face_leave_on: 1.0,
      body_leave_on: 1.0,
      baby_leave_on: 0.1,
      deo_spray: 0.4,
      deo_nonspray: 0.4,
      rinse_off: 5.0,
      rinse_hair: 5.0,
      leave_hair: 1.0,
      intimate: 0.3,
      baby_rinse: 0.1,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Benzyl Alcohol",
    casNumber: "100-51-6",
    prohibited: false,
    limits: {
      lip: 3.0,
      fine_fragrance: 10.0,
      face_leave_on: 10.0,
      body_leave_on: 10.0,
      baby_leave_on: 1.0,
      deo_spray: 4.0,
      deo_nonspray: 4.0,
      rinse_off: 10.0,
      rinse_hair: 10.0,
      leave_hair: 10.0,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Oakmoss Absolute (Evernia prunastri)",
    casNumber: "90028-68-5",
    prohibited: false,
    limits: {
      lip: 0.03,
      fine_fragrance: 0.1,
      face_leave_on: 0.1,
      body_leave_on: 0.1,
      baby_leave_on: 0.001,
      deo_spray: 0.04,
      deo_nonspray: 0.04,
      rinse_off: 0.5,
      rinse_hair: 0.5,
      leave_hair: 0.1,
      intimate: 0.03,
      baby_rinse: 0.001,
    },
    note: "Starkes Kontaktallergen. Très fortement restreint.",
  },
  {
    substanceName: "Treemoss Absolute (Evernia furfuracea)",
    casNumber: "90028-67-4",
    prohibited: false,
    limits: {
      lip: 0.03,
      fine_fragrance: 0.1,
      face_leave_on: 0.1,
      body_leave_on: 0.1,
      baby_leave_on: 0.001,
      deo_spray: 0.04,
      deo_nonspray: 0.04,
      rinse_off: 0.5,
      rinse_hair: 0.5,
      leave_hair: 0.1,
      intimate: 0.03,
      baby_rinse: 0.001,
    },
    note: "Starkes Kontaktallergen.",
  },
  {
    substanceName: "Hydroxymethylpentylcyclohexenecarboxaldehyde (Cyclamal)",
    casNumber: "103-95-7",
    prohibited: false,
    limits: {
      lip: 0.2,
      fine_fragrance: 0.5,
      face_leave_on: 0.5,
      body_leave_on: 0.5,
      deo_spray: 0.2,
      deo_nonspray: 0.2,
      rinse_off: 3.0,
    },
  },
  {
    substanceName: "Amyl Cinnamal (alpha-Amylcinnamaldehyde)",
    casNumber: "122-40-7",
    prohibited: false,
    limits: {
      lip: 0.05,
      fine_fragrance: 0.2,
      face_leave_on: 0.2,
      body_leave_on: 0.2,
      baby_leave_on: 0.02,
      deo_spray: 0.08,
      deo_nonspray: 0.08,
      rinse_off: 1.0,
      rinse_hair: 1.0,
      leave_hair: 0.2,
      intimate: 0.05,
      baby_rinse: 0.02,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Amylcinnamyl Alcohol",
    casNumber: "101-85-9",
    prohibited: false,
    limits: {
      lip: 0.05,
      fine_fragrance: 0.2,
      face_leave_on: 0.2,
      body_leave_on: 0.2,
      baby_leave_on: 0.02,
      deo_spray: 0.08,
      deo_nonspray: 0.08,
      rinse_off: 1.0,
      rinse_hair: 1.0,
      leave_hair: 0.2,
      intimate: 0.05,
      baby_rinse: 0.02,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Anise Alcohol (Anisyl Alcohol)",
    casNumber: "105-13-5",
    prohibited: false,
    limits: {
      lip: 0.3,
      fine_fragrance: 1.0,
      face_leave_on: 1.0,
      body_leave_on: 1.0,
      baby_leave_on: 0.1,
      deo_spray: 0.4,
      deo_nonspray: 0.4,
      rinse_off: 5.0,
      rinse_hair: 5.0,
      leave_hair: 1.0,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Farnesol",
    casNumber: "4602-84-0",
    prohibited: false,
    limits: {
      lip: 0.2,
      fine_fragrance: 0.6,
      face_leave_on: 0.6,
      body_leave_on: 0.6,
      baby_leave_on: 0.06,
      deo_spray: 0.2,
      deo_nonspray: 0.2,
      rinse_off: 3.0,
      rinse_hair: 3.0,
      leave_hair: 0.6,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Lilial / Butylphenyl Methylpropional (BMHCA)",
    casNumber: "80-54-6",
    prohibited: true,
    limits: {},
    note: "Verboten ab 1. März 2022 (EU-Verordnung 2021/1099). Repr. Kat. 2.",
  },
  {
    substanceName: "Hexyl Cinnamal",
    casNumber: "101-86-0",
    prohibited: false,
    limits: {
      lip: 0.7,
      fine_fragrance: 2.5,
      face_leave_on: 2.5,
      body_leave_on: 2.5,
      baby_leave_on: 0.25,
      deo_spray: 1.0,
      deo_nonspray: 1.0,
      rinse_off: 12.5,
      rinse_hair: 12.5,
      leave_hair: 2.5,
      intimate: 0.7,
      baby_rinse: 0.25,
    },
    note: "EU-Pflichtallergene.",
  },
  {
    substanceName: "Limonene",
    casNumber: "5989-27-5",
    prohibited: false,
    limits: {
      lip: 1.5,
      fine_fragrance: 5.0,
      face_leave_on: 5.0,
      body_leave_on: 5.0,
      baby_leave_on: 0.5,
      deo_spray: 2.0,
      deo_nonspray: 2.0,
      rinse_off: 25.0,
      rinse_hair: 25.0,
      leave_hair: 5.0,
    },
    note: "EU-Pflichtallergene (oxidierte Form).",
  },
  {
    substanceName: "Evernia Prunastri (Oakmoss) Extract",
    casNumber: "90028-68-5",
    prohibited: false,
    limits: {
      fine_fragrance: 0.1,
      face_leave_on: 0.1,
      body_leave_on: 0.1,
    },
  },
  {
    substanceName: "Cinnamon Bark Oil (Cinnamomum zeylanicum)",
    casNumber: "8015-91-6",
    prohibited: false,
    limits: {
      lip: 0.02,
      fine_fragrance: 0.05,
      face_leave_on: 0.05,
      body_leave_on: 0.05,
      baby_leave_on: 0.002,
      deo_spray: 0.02,
      deo_nonspray: 0.02,
      rinse_off: 0.2,
      rinse_hair: 0.2,
      leave_hair: 0.05,
      intimate: 0.02,
      baby_rinse: 0.002,
    },
    note: "Hoher Cinnamal-Gehalt.",
  },
  {
    substanceName: "Clove Bud Oil (Syzygium aromaticum)",
    casNumber: "8000-34-8",
    prohibited: false,
    limits: {
      lip: 0.5,
      fine_fragrance: 0.5,
      face_leave_on: 0.5,
      body_leave_on: 0.5,
      baby_leave_on: 0.05,
      deo_spray: 0.2,
      deo_nonspray: 0.2,
      rinse_off: 2.5,
      rinse_hair: 2.5,
      leave_hair: 0.5,
    },
    note: "Hoher Eugenol-Gehalt.",
  },
  {
    substanceName: "Jasmine Absolute (Jasminum grandiflorum)",
    casNumber: "8022-96-6",
    prohibited: false,
    limits: {
      lip: 0.7,
      fine_fragrance: 3.5,
      face_leave_on: 3.5,
      body_leave_on: 3.5,
      baby_leave_on: 0.4,
      deo_spray: 1.5,
      deo_nonspray: 1.5,
      rinse_off: 17.0,
      rinse_hair: 17.0,
      leave_hair: 3.5,
    },
    note: "Enthält deklarierbare Allergene (Benzyl Benzoate, Farnesol u.a.).",
  },
];

// ─── Lookup-Hilfsfunktionen ───────────────────────────────────────────────────

export type IFRALimitCheckResult = {
  substanceName: string;
  casNumber: string;
  prohibited: boolean;
  category: IFRACategory;
  limit: number | null; // null = kein IFRA-Limit für diese Kategorie
  actualPercent: number;
  compliant: boolean;
  exceededBy?: number; // % über dem Limit
  note?: string;
};

/** Gibt den IFRA-Limit-Eintrag für eine Substanz anhand CAS oder Name zurück */
export function getIFRAEntry(
  casNumberOrName: string,
): IFRALimitEntry | undefined {
  const q = casNumberOrName.trim().toLowerCase();
  return IFRA_51_LIMITS.find(
    (e) =>
      e.casNumber === casNumberOrName.trim() ||
      e.substanceName.toLowerCase().includes(q),
  );
}

/** Prüft eine einzelne Substanz gegen IFRA-Limit in einer Kategorie */
export function checkIFRALimit(
  entry: IFRALimitEntry,
  category: IFRACategory,
  actualPercent: number,
): IFRALimitCheckResult {
  if (entry.prohibited) {
    return {
      substanceName: entry.substanceName,
      casNumber: entry.casNumber,
      prohibited: true,
      category,
      limit: 0,
      actualPercent,
      compliant: actualPercent === 0,
      exceededBy: actualPercent > 0 ? actualPercent : undefined,
      note: entry.note,
    };
  }

  const limit = entry.limits[category] ?? null;

  if (limit === null) {
    return {
      substanceName: entry.substanceName,
      casNumber: entry.casNumber,
      prohibited: false,
      category,
      limit: null,
      actualPercent,
      compliant: true, // Kein IFRA-Limit = keine Einschränkung
      note: entry.note,
    };
  }

  const compliant = actualPercent <= limit;

  return {
    substanceName: entry.substanceName,
    casNumber: entry.casNumber,
    prohibited: false,
    category,
    limit,
    actualPercent,
    compliant,
    exceededBy: compliant ? undefined : Number((actualPercent - limit).toFixed(6)),
    note: entry.note,
  };
}

/** Prüft eine Liste von Substanzen gegen IFRA für eine Kategorie */
export function checkAllIFRALimits(
  substances: Array<{ casNumber?: string; substanceName?: string; inciName?: string; totalPercent: number }>,
  category: IFRACategory = "fine_fragrance",
): {
  results: IFRALimitCheckResult[];
  allCompliant: boolean;
  violations: IFRALimitCheckResult[];
  prohibitedFound: IFRALimitCheckResult[];
} {
  const results: IFRALimitCheckResult[] = [];

  for (const sub of substances) {
    const lookup = sub.casNumber ?? sub.substanceName ?? sub.inciName ?? "";
    const entry = getIFRAEntry(lookup);
    if (!entry) continue;

    const result = checkIFRALimit(entry, category, sub.totalPercent);
    results.push(result);
  }

  const violations = results.filter((r) => !r.compliant);
  const prohibitedFound = results.filter((r) => r.prohibited && r.actualPercent > 0);
  const allCompliant = violations.length === 0;

  return { results, allCompliant, violations, prohibitedFound };
}

/** IFRA-Kategorie aus Produkttyp-String ableiten */
export function ifraCategFromProductType(productType: string): IFRACategory {
  const p = productType.toLowerCase();
  if (p.includes("lip")) return "lip";
  if (p.includes("deo") && p.includes("spray")) return "deo_spray";
  if (p.includes("eye")) return "eye";
  if (p.includes("fine") || p.includes("parfum") || p.includes("edp") || p.includes("edt") || p.includes("aftershave")) return "fine_fragrance";
  if (p.includes("face") && p.includes("leave")) return "face_leave_on";
  if (p.includes("body") && p.includes("leave")) return "body_leave_on";
  if (p.includes("baby") && p.includes("leave")) return "baby_leave_on";
  if (p.includes("oral") || p.includes("mouth")) return "oral";
  if (p.includes("rinse") && p.includes("hair")) return "rinse_hair";
  if (p.includes("leave") && p.includes("hair")) return "leave_hair";
  if (p.includes("nail")) return "nail";
  if (p.includes("deo")) return "deo_nonspray";
  if (p.includes("rinse") || p.includes("shower") || p.includes("shampoo")) return "rinse_off";
  if (p.includes("intimate")) return "intimate";
  if (p.includes("baby")) return "baby_rinse";
  if (p.includes("fabric") || p.includes("laundry")) return "fabric";
  return "fine_fragrance"; // Fallback
}
