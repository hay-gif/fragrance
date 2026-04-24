import { z } from "zod";

export const FragranceCreateSchema = z.object({
  name: z.string().min(2, "Name muss mind. 2 Zeichen haben").max(80, "Name max. 80 Zeichen"),
  sizeMl: z.number({ error: "Größe ist erforderlich" }).positive("Größe muss positiv sein"),
  priceEuro: z
    .number({ error: "Preis ist erforderlich" })
    .min(0, "Preis kann nicht negativ sein")
    .max(999, "Preis max. 999 €"),
  accords: z.array(z.object({ accordId: z.string().uuid(), percentage: z.number().positive() }))
    .min(1, "Mind. 1 Accord erforderlich"),
});

export const FragranceEditSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(2000, "Beschreibung max. 2000 Zeichen").optional(),
  category: z.string().max(50).optional(),
  isPublic: z.boolean().optional(),
  priceEuro: z.number().min(0).max(999).optional(),
});

export type FragranceCreateInput = z.infer<typeof FragranceCreateSchema>;
export type FragranceEditInput = z.infer<typeof FragranceEditSchema>;
