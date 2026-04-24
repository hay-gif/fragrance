import { z } from "zod";

export const ChallengeSchema = z.object({
  title: z.string().min(3, "Titel mind. 3 Zeichen").max(100),
  description: z.string().max(2000).optional(),
  accordRequired: z.string().max(50).optional(),
  prizeAmountCents: z.number().int().min(0).max(100_000_00),
  prizeDescription: z.string().max(500).optional(),
  rules: z.string().max(5000).optional(),
  logoUrl: z.string().url("Ungültige URL").optional().or(z.literal("")),
  startDate: z.string().min(1, "Startdatum erforderlich"),
  endDate: z.string().min(1, "Enddatum erforderlich"),
  status: z.enum(["draft", "active", "judging", "ended"]),
  maxEntries: z.number().int().positive().optional().nullable(),
}).refine((d) => new Date(d.endDate) > new Date(d.startDate), {
  message: "Enddatum muss nach dem Startdatum liegen",
  path: ["endDate"],
});

export type ChallengeInput = z.infer<typeof ChallengeSchema>;
