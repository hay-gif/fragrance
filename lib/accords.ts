export type AccordCategory = "top" | "heart" | "base";

export type Accord = {
  id: string;
  name: string;
  category: AccordCategory;
  maxPercent: number;
  approved: boolean;
};

export type AccordComponent = {
  materialId: string;
  materialName: string;
  percentOfAccord: number;
};

export const accords: Accord[] = [
  {
    id: "apple-green",
    name: "Apple Green",
    category: "top",
    maxPercent: 20,
    approved: true,
  },
  {
    id: "pear-juicy",
    name: "Pear Juicy",
    category: "top",
    maxPercent: 20,
    approved: true,
  },
  {
    id: "rose-classic",
    name: "Rose Classic",
    category: "heart",
    maxPercent: 30,
    approved: true,
  },
  {
    id: "vanilla-light",
    name: "Vanilla Light",
    category: "heart",
    maxPercent: 25,
    approved: true,
  },
  {
    id: "clean-musk",
    name: "Clean Musk",
    category: "base",
    maxPercent: 40,
    approved: true,
  },
  {
    id: "sandalwood-creamy",
    name: "Sandalwood Creamy",
    category: "base",
    maxPercent: 35,
    approved: true,
  },
];

export const accordRecipes: Record<string, AccordComponent[]> = {
  "apple-green": [
    {
      materialId: "hexyl-acetate",
      materialName: "Hexyl Acetate",
      percentOfAccord: 50,
    },
    {
      materialId: "cis-3-hexenyl-acetate",
      materialName: "Cis-3-Hexenyl Acetate",
      percentOfAccord: 30,
    },
    {
      materialId: "ethyl-butyrate",
      materialName: "Ethyl Butyrate",
      percentOfAccord: 20,
    },
  ],
  "pear-juicy": [
    {
      materialId: "ethyl-decadienoate",
      materialName: "Ethyl Decadienoate",
      percentOfAccord: 60,
    },
    {
      materialId: "hexyl-acetate",
      materialName: "Hexyl Acetate",
      percentOfAccord: 25,
    },
    {
      materialId: "fruity-lift",
      materialName: "Fruity Lift Base",
      percentOfAccord: 15,
    },
  ],
  "rose-classic": [
    {
      materialId: "phenylethyl-alcohol",
      materialName: "Phenylethyl Alcohol",
      percentOfAccord: 50,
    },
    {
      materialId: "citronellol",
      materialName: "Citronellol",
      percentOfAccord: 25,
    },
    { materialId: "geraniol", materialName: "Geraniol", percentOfAccord: 25 },
  ],
  "vanilla-light": [
    { materialId: "vanillin", materialName: "Vanillin", percentOfAccord: 70 },
    {
      materialId: "ethyl-vanillin",
      materialName: "Ethyl Vanillin",
      percentOfAccord: 20,
    },
    {
      materialId: "soft-sweet-base",
      materialName: "Soft Sweet Base",
      percentOfAccord: 10,
    },
  ],
  "clean-musk": [
    {
      materialId: "galaxolide",
      materialName: "Galaxolide",
      percentOfAccord: 60,
    },
    {
      materialId: "ambrettolide",
      materialName: "Ambrettolide",
      percentOfAccord: 25,
    },
    {
      materialId: "soft-musk-base",
      materialName: "Soft Musk Base",
      percentOfAccord: 15,
    },
  ],
  "sandalwood-creamy": [
    {
      materialId: "sandalwood-base",
      materialName: "Sandalwood Base",
      percentOfAccord: 70,
    },
    {
      materialId: "iso-e-super",
      materialName: "Iso E Super",
      percentOfAccord: 20,
    },
    {
      materialId: "cream-wood-base",
      materialName: "Cream Wood Base",
      percentOfAccord: 10,
    },
  ],
};

export function getAccordName(accordId: string) {
  return accords.find((accord) => accord.id === accordId)?.name ?? accordId;
}
