import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { productId, quantity, customerEmail, userId } = await req.json() as {
    productId: string;
    quantity?: number;
    customerEmail: string;
    userId?: string;
  };

  if (!productId || !customerEmail) {
    return NextResponse.json({ error: "Fehlende Parameter" }, { status: 400 });
  }

  const qty = Math.max(1, quantity ?? 1);

  // Fetch product
  const { data: product } = await supabaseAdmin
    .from("creator_products")
    .select("id, name, description, price_cents, stock, image_url, creator_id")
    .eq("id", productId)
    .eq("is_published", true)
    .maybeSingle();

  if (!product) {
    return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
  }

  if (product.stock < qty) {
    return NextResponse.json({ error: "Nicht genug auf Lager" }, { status: 400 });
  }

  // Fetch creator's individual commission_percent from profiles
  // commission_percent = creator's share (e.g. 25 means creator gets 25%)
  // platform_fee = 100 - commission_percent (e.g. 75%)
  const { data: creatorProfile } = await supabaseAdmin
    .from("profiles")
    .select("commission_percent")
    .eq("id", product.creator_id)
    .maybeSingle();

  const creatorCommissionPercent = creatorProfile?.commission_percent ?? 25;
  const platformFeePercent = 100 - creatorCommissionPercent;

  const totalCents = product.price_cents * qty;
  const platformFeeCents = Math.floor((totalCents * platformFeePercent) / 100);

  // Fetch creator's Stripe Connect account
  const { data: connectRow } = await supabaseAdmin
    .from("creator_stripe_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("creator_id", product.creator_id)
    .maybeSingle();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: product.price_cents,
          product_data: {
            name: product.name,
            description: product.description ?? undefined,
            images: product.image_url ? [product.image_url] : undefined,
          },
        },
        quantity: qty,
      },
    ],
    metadata: {
      type: "creator_product",
      productId,
      creatorId: product.creator_id,
      userId: userId ?? "",
      quantity: String(qty),
    },
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/stripe/success?type=product`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/`,
  };

  // Split payment: Creator gets their commission_percent, platform keeps the rest
  if (connectRow?.payouts_enabled && connectRow.stripe_account_id) {
    sessionParams.payment_intent_data = {
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: connectRow.stripe_account_id,
      },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}
