import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-03-25.dahlia" });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { type, planId, creatorId, creatorName, priceCents, userEmail, userId, shippingAddress } = await req.json();

  if (auth.user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Get or create Stripe customer
  let customerId: string;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.stripe_customer_id) {
    customerId = profile.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({ email: userEmail, metadata: { userId } });
    customerId = customer.id;
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  let priceId: string;

  if (type === "ki_abo") {
    // KI-Abo: 19.90 €/Monat
    const KI_ABO_PRICE_CENTS = 1990;
    const { data: kiPlan } = await supabaseAdmin
      .from("subscription_plans")
      .select("stripe_price_id")
      .eq("id", "ki_abo")
      .maybeSingle();

    if (kiPlan?.stripe_price_id) {
      priceId = kiPlan.stripe_price_id;
    } else {
      const product = await stripe.products.create({ name: "Fragrance OS KI-Abo" });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: KI_ABO_PRICE_CENTS,
        currency: "eur",
        recurring: { interval: "month" },
      });
      priceId = price.id;
    }

    const shippingMeta = shippingAddress ? JSON.stringify(shippingAddress) : "";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { type: "ki_abo", userId, shippingAddress: shippingMeta },
      success_url: `${baseUrl}/ki-abo?success=1`,
      cancel_url: `${baseUrl}/ki-abo`,
    });
    return NextResponse.json({ url: session.url });
  }

  if (type === "platform") {
    // Get price ID from DB
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("stripe_price_id, name, price_cents")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      return NextResponse.json({ error: "Abo-Plan nicht gefunden" }, { status: 404 });
    }
    if (!plan.stripe_price_id) {
      // Create Stripe price on the fly if not yet configured (plan exists but no Stripe price yet)
      const product = await stripe.products.create({ name: `Fragrance OS ${planId}` });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price_cents,
        currency: "eur",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      await supabaseAdmin.from("subscription_plans").update({ stripe_price_id: priceId }).eq("id", planId);
    } else {
      priceId = plan.stripe_price_id;
    }
  } else {
    // Creator subscription — create price on the fly
    const { data: creatorPlan } = await supabaseAdmin
      .from("creator_subscription_plans")
      .select("stripe_price_id, stripe_product_id")
      .eq("creator_id", creatorId)
      .maybeSingle();

    if (creatorPlan?.stripe_price_id) {
      priceId = creatorPlan.stripe_price_id;
    } else {
      const product = await stripe.products.create({
        name: `${creatorName} Fan-Abo`,
        metadata: { creatorId },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: priceCents,
        currency: "eur",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      if (creatorPlan) {
        await supabaseAdmin.from("creator_subscription_plans")
          .update({ stripe_price_id: priceId, stripe_product_id: product.id })
          .eq("creator_id", creatorId);
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { type, planId: planId ?? "", creatorId: creatorId ?? "", userId },
    success_url: `${baseUrl}/abo/success?type=${type}&plan=${planId ?? creatorId}`,
    cancel_url: type === "platform" ? `${baseUrl}/abo` : `${baseUrl}/creator/${creatorId}`,
  });

  return NextResponse.json({ url: session.url });
}
