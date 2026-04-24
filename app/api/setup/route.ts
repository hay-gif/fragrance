import { NextRequest, NextResponse } from "next/server";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

/**
 * Bootstrap: Macht den ersten angemeldeten Nutzer zum Admin.
 * Funktioniert NUR wenn kein Admin in der Datenbank existiert.
 * Danach ist dieser Endpunkt dauerhaft gesperrt.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  // Prüfe ob bereits ein Admin existiert
  const { data: existingAdmins, error: checkErr } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (checkErr) {
    return NextResponse.json({ error: "Datenbankfehler" }, { status: 500 });
  }

  if (existingAdmins && existingAdmins.length > 0) {
    return NextResponse.json(
      { error: "Setup bereits abgeschlossen. Es existiert bereits ein Admin-Konto." },
      { status: 403 },
    );
  }

  // Ersten Admin setzen
  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", auth.user.id);

  if (updateErr) {
    return NextResponse.json({ error: "Konnte Rolle nicht setzen: " + updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Admin-Konto erfolgreich eingerichtet." });
}
