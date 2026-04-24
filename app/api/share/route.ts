import { NextRequest, NextResponse } from "next/server";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

/** GET /api/share?fragranceId=xxx  → gibt bestehenden Share-Link zurück (oder 404) */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const fragranceId = searchParams.get("fragranceId");
  if (!fragranceId) return NextResponse.json({ error: "fragranceId fehlt" }, { status: 400 });

  const { data } = await supabaseAdmin
    .from("fragrance_share_links")
    .select("share_code, clicks, conversions, total_commission_cents")
    .eq("user_id", auth.user.id)
    .eq("fragrance_id", fragranceId)
    .maybeSingle();

  if (!data) return NextResponse.json({ link: null });
  return NextResponse.json({ link: data });
}

/**
 * POST /api/share
 * Body: { fragranceId: string, acceptTerms?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { fragranceId, acceptTerms } = await req.json();
  if (!fragranceId) return NextResponse.json({ error: "fragranceId fehlt" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("share_terms_accepted_at")
    .eq("id", auth.user.id)
    .single();

  if (!profile?.share_terms_accepted_at) {
    if (!acceptTerms) {
      return NextResponse.json({ requiresTerms: true }, { status: 200 });
    }
    await supabaseAdmin
      .from("profiles")
      .update({ share_terms_accepted_at: new Date().toISOString() })
      .eq("id", auth.user.id);
  }

  const { data: frag } = await supabaseAdmin
    .from("fragrances")
    .select("id, is_public, status")
    .eq("id", fragranceId)
    .maybeSingle();

  if (!frag || !frag.is_public || frag.status !== "active") {
    return NextResponse.json({ error: "Nur öffentliche aktive Düfte können geteilt werden" }, { status: 400 });
  }

  const { data: link, error } = await supabaseAdmin
    .from("fragrance_share_links")
    .upsert(
      { user_id: auth.user.id, fragrance_id: fragranceId },
      { onConflict: "user_id,fragrance_id", ignoreDuplicates: false }
    )
    .select("share_code, clicks, conversions, total_commission_cents")
    .single();

  if (error || !link) {
    return NextResponse.json({ error: "Share-Link konnte nicht erstellt werden" }, { status: 500 });
  }

  return NextResponse.json({ link });
}
