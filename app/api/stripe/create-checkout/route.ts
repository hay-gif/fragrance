import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAuth, supabaseAdmin } from "@/lib/apiAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { orderId, customerEmail, shareCode } = await req.json();

  if (!orderId) {
    return NextResponse.json({ error: "orderId erforderlich" }, { status: 400 });
  }

  // Verify order belongs to the authenticated user and is still pending
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .eq("user_id", auth.user.id)
    .eq("status", "pending_payment")
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Bestellung nicht gefunden oder nicht autorisiert" }, { status: 404 });
  }

  // Load items from DB — client-supplied prices are NOT trusted
  const { data: dbItems } = await supabaseAdmin
    .from("order_items")
    .select("name, price_cents, quantity")
    .eq("order_id", orderId);

  if (!dbItems || dbItems.length === 0) {
    return NextResponse.json({ error: "Keine Artikel in der Bestellung" }, { status: 400 });
  }

  // Validate quantities and prices
  for (const item of dbItems) {
    if (!Number.isFinite(item.quantity) || item.quantity < 1 || item.quantity > 9999) {
      return NextResponse.json({ error: "Ungültige Menge" }, { status: 400 });
    }
    if (!Number.isFinite(item.price_cents) || item.price_cents <= 0) {
      return NextResponse.json({ error: "Ungültiger Preis" }, { status: 400 });
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const metadata: Record<string, string> = { orderId };
  if (shareCode && typeof shareCode === "string" && shareCode.length <= 64) {
    metadata.shareCode = shareCode;
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customerEmail,
    line_items: dbItems.map((item) => ({
      price_data: {
        currency: "eur",
        product_data: { name: item.name },
        unit_amount: item.price_cents,
      },
      quantity: item.quantity,
    })),
    metadata,
    success_url: `${baseUrl}/stripe/success?order_id=${orderId}`,
    cancel_url: `${baseUrl}/cart`,
    payment_intent_data: {
      metadata,
    },
  });

  return NextResponse.json({ url: session.url });
}
