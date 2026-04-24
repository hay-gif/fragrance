import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  forecastAccord,
  learnFromErrors,
  aggregateOrdersToUsage,
  type ModelState,
  type Forecast,
} from "@/lib/resourcePredictor";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/resource-predictor
 *
 * Gibt Accord-Bedarfsvorhersagen zurück.
 * Nur für Nutzer mit role admin oder production.
 * Lernschritt: liest offene Vorhersagen, füllt actual_amount_grams,
 * aktualisiert Modell-Parameter.
 */
export async function GET(req: NextRequest) {
  // Auth + Rollen-Check
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "production"].includes(profile.role)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  // --- Lernschritt: offene Vorhersagen mit actual_amount ausfüllen ---
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const { data: openPredictions } = await supabaseAdmin
    .from("resource_predictions")
    .select("id, accord_id, horizon_days, predicted_amount_grams, target_date")
    .is("actual_amount_grams", null)
    .lte("target_date", cutoffDate.toISOString().slice(0, 10))
    .limit(50);

  if (openPredictions && openPredictions.length > 0) {
    for (const pred of openPredictions) {
      const { data: usageLog } = await supabaseAdmin
        .from("resource_usage_log")
        .select("amount_grams")
        .eq("accord_id", pred.accord_id)
        .gte("usage_date", new Date(new Date(pred.target_date).getTime() - pred.horizon_days * 86400000).toISOString().slice(0, 10))
        .lte("usage_date", pred.target_date);

      const actual = usageLog?.reduce((s: number, r: { amount_grams: number }) => s + r.amount_grams, 0) ?? 0;

      await supabaseAdmin
        .from("resource_predictions")
        .update({ actual_amount_grams: actual })
        .eq("id", pred.id);
    }
  }

  // --- Bestelldaten der letzten 90 Tage laden ---
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);

  const { data: orderItems } = await supabaseAdmin
    .from("order_items")
    .select(`
      quantity,
      fragrances (
        composition,
        size_ml
      ),
      orders!inner (
        created_at,
        status
      )
    `)
    .gte("orders.created_at", since90.toISOString())
    .in("orders.status", ["created", "shipped", "delivered"]);

  // Bestelldaten in Format für aggregateOrdersToUsage umwandeln
  type OrderItemRow = {
    quantity: number;
    fragrances: { composition: Record<string, number>; size_ml: number } | { composition: Record<string, number>; size_ml: number }[] | null;
    orders: { created_at: string } | { created_at: string }[] | null;
  };

  const flatOrders = ((orderItems as unknown as OrderItemRow[]) ?? [])
    .filter((i) => i.fragrances && i.orders)
    .map((i) => {
      const frag = Array.isArray(i.fragrances) ? i.fragrances[0] : i.fragrances;
      const ord = Array.isArray(i.orders) ? i.orders[0] : i.orders;
      return {
        created_at: ord!.created_at,
        fragrance_composition: frag!.composition ?? {},
        size_ml: frag!.size_ml ?? 10,
        quantity: i.quantity ?? 1,
      };
    });

  const usageByAccord = aggregateOrdersToUsage(flatOrders);

  // --- Accords laden ---
  const { data: accords } = await supabaseAdmin
    .from("accords")
    .select("id, name")
    .eq("is_active", true);

  if (!accords || accords.length === 0) {
    return NextResponse.json({ forecasts: [], generatedAt: new Date().toISOString() });
  }

  // --- Modell-Parameter aus DB (oder Defaults) ---
  const { data: modelStates } = await supabaseAdmin
    .from("resource_model_state")
    .select("accord_id, alpha, beta, last_ema, last_trend, mape");

  const modelMap = new Map<string, ModelState>();
  for (const ms of modelStates ?? []) {
    modelMap.set(ms.accord_id, {
      alpha: ms.alpha ?? 0.3,
      beta: ms.beta ?? 0.3,
      lastEma: ms.last_ema ?? null,
      lastTrend: ms.last_trend ?? 0,
      mape: ms.mape ?? null,
    });
  }

  // --- Lernschritt pro Accord ---
  for (const [accordId, state] of modelMap.entries()) {
    const { data: pastPreds } = await supabaseAdmin
      .from("resource_predictions")
      .select("predicted_amount_grams, actual_amount_grams")
      .eq("accord_id", accordId)
      .not("actual_amount_grams", "is", null)
      .order("prediction_made_at", { ascending: false })
      .limit(10);

    if (pastPreds && pastPreds.length >= 3) {
      const updated = learnFromErrors(
        pastPreds.map((p: { predicted_amount_grams: number; actual_amount_grams: number }) => ({
          predictedGrams: p.predicted_amount_grams,
          actualGrams: p.actual_amount_grams,
        })),
        state
      );
      modelMap.set(accordId, updated);

      // Gelernte Parameter in DB schreiben
      await supabaseAdmin
        .from("resource_model_state")
        .upsert({
          accord_id: accordId,
          alpha: updated.alpha,
          beta: updated.beta,
          last_ema: updated.lastEma,
          last_trend: updated.lastTrend,
          mape: updated.mape,
          last_trained_at: new Date().toISOString(),
          prediction_count: (pastPreds.length),
        }, { onConflict: "accord_id" });
    }
  }

  // --- Vorhersagen berechnen ---
  const forecasts: Forecast[] = [];

  for (const accord of accords) {
    const history = usageByAccord.get(accord.id) ?? [];
    if (history.length === 0 && !modelMap.has(accord.id)) continue;

    const state: ModelState = modelMap.get(accord.id) ?? {
      alpha: 0.3, beta: 0.3, lastEma: null, lastTrend: 0, mape: null
    };

    const forecast = forecastAccord(accord.id, accord.name, history, state);
    forecasts.push(forecast);

    // Neue Vorhersagen persistieren
    const now = new Date().toISOString();
    const t7  = new Date(); t7.setDate(t7.getDate() + 7);
    const t30 = new Date(); t30.setDate(t30.getDate() + 30);
    const t90 = new Date(); t90.setDate(t90.getDate() + 90);

    await supabaseAdmin.from("resource_predictions").upsert([
      { accord_id: accord.id, prediction_made_at: now, horizon_days: 7,  predicted_amount_grams: forecast.horizon7,  target_date: t7.toISOString().slice(0, 10),  model_snapshot: { alpha: state.alpha, beta: state.beta, mape: state.mape } },
      { accord_id: accord.id, prediction_made_at: now, horizon_days: 30, predicted_amount_grams: forecast.horizon30, target_date: t30.toISOString().slice(0, 10), model_snapshot: { alpha: state.alpha, beta: state.beta, mape: state.mape } },
      { accord_id: accord.id, prediction_made_at: now, horizon_days: 90, predicted_amount_grams: forecast.horizon90, target_date: t90.toISOString().slice(0, 10), model_snapshot: { alpha: state.alpha, beta: state.beta, mape: state.mape } },
    ], { onConflict: "accord_id,prediction_made_at,horizon_days", ignoreDuplicates: true });
  }

  // Nur Accords mit tatsächlichem Bedarf zurückgeben, sortiert nach 30-Tage-Bedarf
  const relevant = forecasts
    .filter((f) => f.horizon30 > 0 || f.dailyRate > 0)
    .sort((a, b) => b.horizon30 - a.horizon30);

  return NextResponse.json({
    forecasts: relevant,
    generatedAt: new Date().toISOString(),
    dataPoints: flatOrders.length,
  });
}
