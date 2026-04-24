import { z } from "zod";

export const ProfileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, "Username mind. 3 Zeichen")
    .max(30, "Username max. 30 Zeichen")
    .regex(/^[a-z0-9_.-]+$/, "Username darf nur Kleinbuchstaben, Zahlen, _, . und - enthalten"),
  displayName: z.string().max(60, "Anzeigename max. 60 Zeichen").optional(),
  bio: z.string().max(500, "Bio max. 500 Zeichen").optional(),
  phone: z.string().max(20).optional().nullable(),
  addressLine1: z.string().max(100).optional().nullable(),
  addressLine2: z.string().max(100).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  country: z.string().length(2, "Ländercode muss 2-stellig sein (z.B. DE)").default("DE"),
  dateOfBirth: z.string().optional().nullable(),
  newsletterOptIn: z.boolean().default(false),
});

export const CreatorApplicationSchema = z.object({
  message: z.string().min(20, "Bitte beschreibe deine Motivation (mind. 20 Zeichen)").max(2000),
  portfolioUrl: z.string().url("Ungültige URL").optional().or(z.literal("")),
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type CreatorApplicationInput = z.infer<typeof CreatorApplicationSchema>;
