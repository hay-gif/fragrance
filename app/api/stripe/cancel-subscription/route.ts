import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { subscriptionId, type, userId } = await req.json();

  // Ensure the authenticated user can only cancel their own subscriptions
  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!subscriptionId || !type) {
    return NextResponse.json({ error: "subscriptionId und type erforderlich" }, { status: 400 });
  }

  await stripe.subscriptions.cancel(subscriptionId);

  if (type === "platform") {
    await supabaseAdmin
      .from("user_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscriptionId)
      .eq("user_id", userId);
  } else if (type === "ki_abo") {
    await supabaseAdmin
      .from("ki_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscriptionId)
      .eq("user_id", userId);
  } else {
    await supabaseAdmin
      .from("creator_subscriptions")
      .update({ status: "cancelled" })
      .eq("stripe_subscription_id", subscriptionId)
      .eq("subscriber_id", userId);
  }

  return NextResponse.json({ success: true });
}
