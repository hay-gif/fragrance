import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { userId } = await req.json();

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const { data: row } = await supabaseAdmin
    .from("creator_stripe_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("creator_id", userId)
    .maybeSingle();

  if (!row?.payouts_enabled) {
    return NextResponse.json({ error: "Account nicht aktiv" }, { status: 400 });
  }

  const loginLink = await stripe.accounts.createLoginLink(row.stripe_account_id);
  return NextResponse.json({ url: loginLink.url });
}
