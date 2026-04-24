import { NextRequest, NextResponse } from "next/server";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const userId = auth.user.id;

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: "Konto konnte nicht gelöscht werden" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
