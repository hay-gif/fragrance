import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row } = await supabaseAdmin
    .from("creator_stripe_accounts")
    .select("*")
    .eq("creator_id", userId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ connected: false });
  }

  // Sync current status from Stripe
  try {
    const account = await stripe.accounts.retrieve(row.stripe_account_id);

    await supabaseAdmin
      .from("creator_stripe_accounts")
      .update({
        payouts_enabled: account.payouts_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
        account_status: account.payouts_enabled ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("creator_id", userId);

    return NextResponse.json({
      connected: true,
      stripeAccountId: row.stripe_account_id,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
    });
  } catch (err) {
    console.error("Stripe accounts.retrieve fehlgeschlagen:", err);
    // Return cached DB values on Stripe API error
    return NextResponse.json({
      connected: true,
      stripeAccountId: row.stripe_account_id,
      payoutsEnabled: row.payouts_enabled ?? false,
      detailsSubmitted: row.details_submitted ?? false,
    });
  }
}
