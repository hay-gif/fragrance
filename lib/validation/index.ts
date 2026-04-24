export * from "./fragrance";
export * from "./profile";
export * from "./order";
export * from "./challenge";

/** Helper: format first Zod error as a plain string */
import { ZodError } from "zod";
export function zodErrorMessage(err: ZodError): string {
  return err.issues[0]?.message ?? "Ungültige Eingabe";
}
