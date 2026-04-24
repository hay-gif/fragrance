import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/share/track
 * Body: { shareCode: string }
 *
 * Public endpoint — increments click count on a share link.
 * Uses the `increment_share_clicks` Postgres RPC for an atomic update.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const shareCode = body?.shareCode;

  if (!shareCode || typeof shareCode !== "string" || shareCode.length > 32) {
    return NextResponse.json({ error: "shareCode fehlt oder ungültig" }, { status: 400 });
  }

  // Verify code exists
  const { data: link } = await supabaseAdmin
    .from("fragrance_share_links")
    .select("fragrance_id")
    .eq("share_code", shareCode)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "Ungültiger Share-Code" }, { status: 404 });

  // Atomic increment via Postgres RPC — see supabase/migrations/add_share_system.sql
  // Click counting is non-critical; silently ignore errors
  try {
    await supabaseAdmin.rpc("increment_share_clicks", { p_share_code: shareCode });
  } catch { /* non-critical */ }

  return NextResponse.json({ fragranceId: link.fragrance_id });
}
