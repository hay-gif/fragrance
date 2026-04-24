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
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Kein Stripe-Signature-Header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook Signatur-Fehler:", err);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // --- One-time payment: update order ---
    const orderId = session.metadata?.orderId;
    if (orderId && session.mode !== "subscription") {
      try {
      // Idempotency: only proceed if the order is still in pending_payment state
      const { data: updatedRows, error } = await supabaseAdmin
        .from("orders")
        .update({
          status: "created",
          stripe_payment_id: session.payment_intent as string,
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending_payment")
        .select("id");

      if (error) {
        console.error("Fehler beim Order-Update nach Zahlung:", error);
      } else if (!updatedRows || updatedRows.length === 0) {
        // Order already processed (idempotency guard — Stripe retry)
        console.log(`Order ${orderId} already processed, skipping commission logic.`);
      } else {
        const { data: orderData } = await supabaseAdmin
          .from("orders")
          .select("user_id, total_cents, customer_email")
          .eq("id", orderId)
          .maybeSingle();

        if (orderData?.user_id) {
          // Benachrichtigung erstellen
          await supabaseAdmin.from("notifications").insert({
            user_id: orderData.user_id,
            type: "order_status",
            data: { order_id: orderId, status: "created" },
          });

          // Affiliate-Provisionen: alle order_items mit affiliate_user_id auf "payable" setzen
          // und affiliate_payouts-Einträge anlegen
          const { data: affiliateItems } = await supabaseAdmin
            .from("order_items")
            .select("id, affiliate_user_id, affiliate_commission_cents, affiliate_commission_percent")
            .eq("order_id", orderId)
            .eq("affiliate_payout_status", "pending")
            .not("affiliate_user_id", "is", null);

          if (affiliateItems && affiliateItems.length > 0) {
            await supabaseAdmin
              .from("order_items")
              .update({ affiliate_payout_status: "payable" })
              .eq("order_id", orderId)
              .eq("affiliate_payout_status", "pending")
              .not("affiliate_user_id", "is", null);

            const payoutRows = affiliateItems.map((ai: {
              id: string;
              affiliate_user_id: string;
              affiliate_commission_cents: number;
              affiliate_commission_percent: number;
            }) => ({
              user_id: ai.affiliate_user_id,
              order_item_id: ai.id,
              amount_cents: ai.affiliate_commission_cents,
              commission_percent: ai.affiliate_commission_percent,
              status: "payable",
            }));

            await supabaseAdmin.from("affiliate_payouts").insert(payoutRows);

            // Notification an jeden Affiliate-User
            const uniqueAffiliateUsers = [...new Set(affiliateItems.map((ai: { affiliate_user_id: string }) => ai.affiliate_user_id))];
            for (const uid of uniqueAffiliateUsers) {
              const total = affiliateItems
                .filter((ai: { affiliate_user_id: string }) => ai.affiliate_user_id === uid)
                .reduce((s: number, ai: { affiliate_commission_cents: number }) => s + ai.affiliate_commission_cents, 0);
              await supabaseAdmin.from("notifications").insert({
                user_id: uid,
                type: "affiliate_commission",
                data: { order_id: orderId, amount_cents: total },
              });
            }
          }

          // Share-Provisionen: 10 % für normale User die ihren Duft geteilt haben
          const shareCode = session.metadata?.shareCode;
          if (shareCode) {
            const { data: shareLink } = await supabaseAdmin
              .from("fragrance_share_links")
              .select("id, user_id, fragrance_id, conversions, total_commission_cents")
              .eq("share_code", shareCode)
              .maybeSingle();

            if (shareLink) {
              // Nur die Artikel berechnen die zum geteilten Duft gehören
              const { data: sharedItems } = await supabaseAdmin
                .from("order_items")
                .select("price_cents, quantity")
                .eq("order_id", orderId)
                .eq("fragrance_id", shareLink.fragrance_id);

              if (sharedItems && sharedItems.length > 0) {
                const sharedTotal = sharedItems.reduce(
                  (s: number, i: { price_cents: number; quantity: number }) =>
                    s + (i.price_cents ?? 0) * (i.quantity ?? 1), 0
                );
                const shareCents = Math.round(sharedTotal * 0.10);

                if (shareCents > 0) {
                  // Share-Link Stats aktualisieren
                  await supabaseAdmin
                    .from("fragrance_share_links")
                    .update({
                      conversions: (shareLink.conversions ?? 0) + 1,
                      total_commission_cents: (shareLink.total_commission_cents ?? 0) + shareCents,
                    })
                    .eq("id", shareLink.id);

                  // Guthaben auf Profil erhöhen
                  const { data: sharerProfile } = await supabaseAdmin
                    .from("profiles")
                    .select("share_balance_cents")
                    .eq("id", shareLink.user_id)
                    .single();
                  await supabaseAdmin
                    .from("profiles")
                    .update({ share_balance_cents: (sharerProfile?.share_balance_cents ?? 0) + shareCents })
                    .eq("id", shareLink.user_id);

                  // Payout-Eintrag anlegen
                  await supabaseAdmin.from("share_payout_requests").insert({
                    user_id: shareLink.user_id,
                    fragrance_share_link_id: shareLink.id,
                    order_id: orderId,
                    amount_cents: shareCents,
                    status: "pending",
                  });

                  // Steuerlicher Eintrag
                  await supabaseAdmin.from("tax_entries").insert({
                    user_id: shareLink.user_id,
                    type: "income",
                    category: "Teilen-Provision",
                    amount_cents: shareCents,
                    vat_percent: 19,
                    description: `10% Share-Provision Bestellung #${orderId.slice(0, 8).toUpperCase()}`,
                    entry_date: new Date().toISOString().slice(0, 10),
                    reference_id: orderId,
                    source: "auto_order",
                  });

                  // Benachrichtigung
                  await supabaseAdmin.from("notifications").insert({
                    user_id: shareLink.user_id,
                    type: "share_commission",
                    data: { order_id: orderId, amount_cents: shareCents, fragrance_id: shareLink.fragrance_id },
                  });
                }
              }
            }
          }

          // Creator-Provisionen auf payable setzen + Tax-Einträge erzeugen
          const { data: creatorItems } = await supabaseAdmin
            .from("order_items")
            .select("id, creator_id, price_cents, quantity, creator_commission_cents, commission_percent, payout_status")
            .eq("order_id", orderId)
            .eq("payout_status", "pending")
            .not("creator_id", "is", null);

          if (creatorItems && creatorItems.length > 0) {
            await supabaseAdmin
              .from("order_items")
              .update({ payout_status: "payable" })
              .eq("order_id", orderId)
              .eq("payout_status", "pending")
              .not("creator_id", "is", null);

            // Tax-Einträge: pro Creator eine Einnahme — nutze die tatsächlich berechneten Werte
            const today = new Date().toISOString().slice(0, 10);
            const uniqueCreatorIds = [...new Set(creatorItems.map((i: { creator_id: string }) => i.creator_id))];
            for (const creatorId of uniqueCreatorIds) {
              const creatorItemsForId = creatorItems.filter(
                (i: { creator_id: string }) => i.creator_id === creatorId
              );
              const commissionCents = creatorItemsForId.reduce(
                (s: number, i: { creator_commission_cents: number }) => s + (i.creator_commission_cents ?? 0), 0
              );
              if (commissionCents <= 0) continue;
              // Idempotency: skip if tax entry for this order+creator already exists
              const { data: existingTax } = await supabaseAdmin
                .from("tax_entries")
                .select("id")
                .eq("reference_id", orderId)
                .eq("user_id", creatorId)
                .eq("category", "Provision Duftverkauf")
                .maybeSingle();
              if (existingTax) continue;
              await supabaseAdmin.from("tax_entries").insert({
                user_id: creatorId,
                type: "income",
                category: "Provision Duftverkauf",
                amount_cents: commissionCents,
                vat_percent: 19,
                description: `Provision Bestellung #${orderId.slice(0, 8).toUpperCase()}`,
                entry_date: today,
                reference_id: orderId,
                source: "auto_order",
              });
            }
          }

          // Loyalty-Punkte vergeben: 1 Punkt pro Euro
          const points = Math.floor((orderData.total_cents ?? 0) / 100);
          if (points > 0) {
            await supabaseAdmin.from("loyalty_events").insert({
              user_id: orderData.user_id,
              type: "purchase",
              points,
              description: `Kauf #${orderId.slice(0, 8).toUpperCase()}`,
              reference_id: orderId,
            });
            // Gesamtstand aktualisieren (upsert)
            const { data: existing } = await supabaseAdmin
              .from("loyalty_points")
              .select("points")
              .eq("user_id", orderData.user_id)
              .maybeSingle();
            await supabaseAdmin.from("loyalty_points").upsert({
              user_id: orderData.user_id,
              points: (existing?.points ?? 0) + points,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
          }

          // Bestellbestätigung per E-Mail
          if (orderData.customer_email) {
            try {
              await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/email/order-confirmation`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
                },
                body: JSON.stringify({
                  to: orderData.customer_email,
                  orderId,
                  totalCents: orderData.total_cents,
                }),
              });
            } catch (e) {
              console.error("E-Mail-Versand fehlgeschlagen:", e);
            }
          }
        }
      }
      } catch (err) {
        console.error("Fehler im checkout.session.completed Handler:", err);
        return NextResponse.json({ error: "Handler-Fehler" }, { status: 500 });
      }
    }

    // --- Creator product purchase ---
    if (session.metadata?.type === "creator_product" && session.metadata?.productId) {
      const productId = session.metadata.productId;
      const qty = parseInt(session.metadata.quantity ?? "1", 10);
      // Decrement stock atomically
      const { data: prod } = await supabaseAdmin
        .from("creator_products")
        .select("stock")
        .eq("id", productId)
        .maybeSingle();
      if (prod && prod.stock >= qty) {
        await supabaseAdmin
          .from("creator_products")
          .update({ stock: prod.stock - qty })
          .eq("id", productId);
      }
    }

    // --- Subscription checkout ---
    if (session.mode === "subscription") {
      const { type, planId, creatorId, userId } = session.metadata ?? {};
      const subscriptionId = session.subscription as string;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      // current_period_end is present at runtime but may not be typed in newer SDK versions
      const periodEnd = new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString();

      if (type === "platform" && planId && userId) {
        await supabaseAdmin.from("user_subscriptions").upsert({
          user_id: userId,
          plan_id: planId,
          status: "active",
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          current_period_end: periodEnd,
        }, { onConflict: "user_id" });

        // Award loyalty points
        await supabaseAdmin.from("loyalty_events").insert({
          user_id: userId,
          type: "subscription",
          points: planId === "explorer" ? 50 : planId === "collector" ? 150 : 300,
          description: `Abo gestartet: ${planId}`,
          reference_id: subscriptionId,
        });
      }

      if (type === "ki_abo" && userId) {
        const shippingAddress = session.metadata?.shippingAddress
          ? JSON.parse(session.metadata.shippingAddress)
          : null;
        await supabaseAdmin.from("ki_subscriptions").upsert({
          user_id: userId,
          status: "active",
          price_cents_monthly: 1990,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          current_period_end: periodEnd,
          shipping_address: shippingAddress,
        }, { onConflict: "user_id" });
      }

      if (type === "creator" && creatorId && userId) {
        const { data: plan } = await supabaseAdmin
          .from("creator_subscription_plans")
          .select("id")
          .eq("creator_id", creatorId)
          .maybeSingle();

        await supabaseAdmin.from("creator_subscriptions").upsert({
          subscriber_id: userId,
          creator_id: creatorId,
          plan_id: plan?.id,
          status: "active",
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer as string,
          current_period_end: periodEnd,
        }, { onConflict: "subscriber_id,creator_id" });

        // Notify creator
        await supabaseAdmin.from("notifications").insert({
          user_id: creatorId,
          type: "new_follower",
          data: { subscriber_id: userId, type: "subscription" },
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const orderId = intent.metadata?.orderId;

    if (orderId) {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("status", "pending_payment");
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await supabaseAdmin
      .from("creator_stripe_accounts")
      .update({
        payouts_enabled: account.payouts_enabled ?? false,
        details_submitted: account.details_submitted ?? false,
        account_status: account.payouts_enabled ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.id);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await supabaseAdmin.from("user_subscriptions").update({ status: "cancelled" }).eq("stripe_subscription_id", sub.id);
    await supabaseAdmin.from("creator_subscriptions").update({ status: "cancelled" }).eq("stripe_subscription_id", sub.id);
    await supabaseAdmin.from("ki_subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("stripe_subscription_id", sub.id);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = (invoice as { subscription?: string }).subscription;
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      const periodEnd = new Date(((sub as unknown as { current_period_end: number }).current_period_end) * 1000).toISOString();
      await supabaseAdmin.from("user_subscriptions").update({ current_period_end: periodEnd, status: "active" }).eq("stripe_subscription_id", subId);
      await supabaseAdmin.from("creator_subscriptions").update({ current_period_end: periodEnd, status: "active" }).eq("stripe_subscription_id", subId);
      await supabaseAdmin.from("ki_subscriptions").update({ current_period_end: periodEnd, status: "active" }).eq("stripe_subscription_id", subId);
    }
  }

  return NextResponse.json({ received: true });
}
