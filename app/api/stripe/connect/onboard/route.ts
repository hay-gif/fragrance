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

  const { userId, email, returnUrl } = await req.json();

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!userId || !email) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Check if Connect account already exists
  const { data: existing } = await supabaseAdmin
    .from("creator_stripe_accounts")
    .select("stripe_account_id")
    .eq("creator_id", userId)
    .maybeSingle();

  let accountId = existing?.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "DE",
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      business_type: "individual",
      settings: {
        payouts: {
          schedule: { interval: "monthly", monthly_anchor: 1 },
        },
      },
    });

    accountId = account.id;

    await supabaseAdmin.from("creator_stripe_accounts").insert({
      creator_id: userId,
      stripe_account_id: accountId,
      account_status: "pending",
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/creator-dashboard?connect=retry`,
    return_url: returnUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL}/creator-dashboard?connect=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
