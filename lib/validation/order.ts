import { z } from "zod";

export const ShippingAddressSchema = z.object({
  firstName: z.string().min(1, "Vorname erforderlich").max(50),
  lastName: z.string().min(1, "Nachname erforderlich").max(50),
  line1: z.string().min(5, "Straße erforderlich").max(100),
  line2: z.string().max(100).optional(),
  city: z.string().min(2, "Stadt erforderlich").max(80),
  postalCode: z.string().min(4, "Postleitzahl erforderlich").max(10),
  country: z.string().length(2).default("DE"),
});

export const CheckoutSchema = z.object({
  items: z.array(z.object({
    fragranceId: z.string().uuid(),
    quantity: z.number().int().min(1).max(10),
  })).min(1, "Warenkorb ist leer"),
  shippingAddress: ShippingAddressSchema,
  customerEmail: z.string().email("Ungültige E-Mail-Adresse"),
});

export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
