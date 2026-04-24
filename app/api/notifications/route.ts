import { NextRequest, NextResponse } from "next/server";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { user_id, type, data } = await req.json();

  if (!user_id || !type) {
    return NextResponse.json({ error: "user_id und type sind erforderlich" }, { status: 400 });
  }

  // Users can only create notifications for themselves
  if (auth.user.id !== user_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from("notifications").insert({ user_id, type, data });

  if (error) {
    console.error("Fehler beim Erstellen der Notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
