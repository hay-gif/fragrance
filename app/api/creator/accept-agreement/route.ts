import { NextRequest, NextResponse } from "next/server";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const userId = body.userId;
  const fullName = body.fullName;

  if (typeof userId !== "string" || typeof fullName !== "string") {
    return NextResponse.json({ error: "Ungültige Parameter-Typen" }, { status: 400 });
  }

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!userId.trim() || !fullName.trim()) {
    return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("creator_business_profiles").upsert(
    {
      creator_id: userId,
      legal_name: fullName.trim(),
      agreement_accepted_at: new Date().toISOString(),
      agreement_version: "1.0",
      agreement_ip: ip,
      onboarding_complete: false,
    },
    { onConflict: "creator_id" },
  );

  if (error) {
    console.error("Agreement accept error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
