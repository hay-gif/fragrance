/**
 * Resource Predictor — Lernender EMA-Algorithmus
 *
 * Schätzt den Accord-Bedarf (in Gramm) für die nächsten 7 / 30 / 90 Tage
 * basierend auf der tatsächlichen Bestellhistorie.
 *
 * Algorithmus:
 *   1. Tagesverbrauch = Σ (fragrance.composition[accord] / 100) * size_ml * qty
 *   2. EMA(t) = α * actual(t) + (1 − α) * EMA(t−1)
 *   3. Trend(t) = β * (EMA(t) − EMA(t−1)) + (1 − β) * Trend(t−1)
 *   4. Forecast(t+n) = max(0, EMA(t) + n * Trend(t))
 *
 * Lernschritt (nach jedem Auffüllen der actual_amount_grams):
 *   MAPE = mean(|actual − predicted| / actual) über letzte 10 Vorhersagen
 *   MAPE > 20% → α += 0.05  (schneller anpassen)
 *   MAPE < 5%  → α -= 0.02  (stabiler schätzen)
 *   α ∈ [0.1, 0.8], β ∈ [0.1, 0.6]
 */

export type DailyUsage = {
  date: string;     // "YYYY-MM-DD"
  grams: number;
  orderCount: number;
};

export type ModelState = {
  alpha: number;     // EMA smoothing (0.1 – 0.8)
  beta: number;      // Trend smoothing (0.1 – 0.6)
  lastEma: number | null;
  lastTrend: number;
  mape: number | null;
};

export type Forecast = {
  accordId: string;
  accordName: string;
  horizon7: number;    // g for next 7 days
  horizon30: number;
  horizon90: number;
  dailyRate: number;   // g/day (current EMA)
  trend: number;       // g/day/day
  confidence: "high" | "medium" | "low";
  modelState: ModelState;
};

/** Füllt fehlende Tage mit 0 auf (lückenlose Zeitreihe) */
function fillGaps(data: DailyUsage[], days: number): number[] {
  const map = new Map<string, number>();
  for (const d of data) map.set(d.date, d.grams);

  const result: number[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(map.get(key) ?? 0);
  }
  return result;
}

/** Berechnet EMA + Trend auf einem Array von Tageswerten */
function computeEMA(
  values: number[],
  alpha: number,
  beta: number,
  seedEma?: number | null,
  seedTrend?: number
): { ema: number; trend: number } {
  let ema = seedEma ?? values[0] ?? 0;
  let trend = seedTrend ?? 0;

  for (const v of values) {
    const prevEma = ema;
    ema = alpha * v + (1 - alpha) * (ema + trend);
    trend = beta * (ema - prevEma) + (1 - beta) * trend;
  }
  return { ema, trend };
}

/** Aktualisiert α und β basierend auf Vorhersagefehlern */
export function learnFromErrors(
  predictions: Array<{ predictedGrams: number; actualGrams: number }>,
  state: ModelState
): ModelState {
  if (predictions.length === 0) return state;

  const errors = predictions
    .filter((p) => p.actualGrams > 0)
    .map((p) => Math.abs(p.actualGrams - p.predictedGrams) / p.actualGrams);

  if (errors.length === 0) return state;

  const mape = errors.reduce((s, e) => s + e, 0) / errors.length;

  let { alpha, beta } = state;

  if (mape > 0.20) {
    alpha = Math.min(0.8, alpha + 0.05);
    beta  = Math.min(0.6, beta  + 0.02);
  } else if (mape < 0.05) {
    alpha = Math.max(0.1, alpha - 0.02);
    beta  = Math.max(0.1, beta  - 0.01);
  }

  return { ...state, alpha, beta, mape };
}

/** Hauptfunktion: Vorhersage für einen Accord */
export function forecastAccord(
  accordId: string,
  accordName: string,
  history: DailyUsage[],       // letzten 90 Tage
  state: ModelState
): Forecast {
  const series = fillGaps(history, 90);
  const { ema, trend } = computeEMA(series, state.alpha, state.beta, state.lastEma, state.lastTrend);

  const clamp = (v: number) => Math.max(0, v);

  const horizon7  = clamp(7  * ema + (7  * (7  + 1)) / 2 * trend);
  const horizon30 = clamp(30 * ema + (30 * (30 + 1)) / 2 * trend);
  const horizon90 = clamp(90 * ema + (90 * (90 + 1)) / 2 * trend);

  // Konfidenz: hoch wenn >= 14 nicht-null Tage vorhanden
  const nonZeroDays = series.filter((v) => v > 0).length;
  const confidence: "high" | "medium" | "low" =
    nonZeroDays >= 30 ? "high" : nonZeroDays >= 14 ? "medium" : "low";

  return {
    accordId,
    accordName,
    horizon7,
    horizon30,
    horizon90,
    dailyRate: ema,
    trend,
    confidence,
    modelState: { ...state, lastEma: ema, lastTrend: trend },
  };
}

/** Berechnet Tagesverbrauch aus Bestell-Rohdaten */
export function aggregateOrdersToUsage(orders: Array<{
  created_at: string;
  fragrance_composition: Record<string, number>; // {accordId: percent}
  size_ml: number;
  quantity: number;
}>): Map<string, DailyUsage[]> {
  // accordId → date → grams
  const map = new Map<string, Map<string, { grams: number; count: number }>>();

  for (const order of orders) {
    const date = order.created_at.slice(0, 10);
    const totalMl = order.size_ml * order.quantity;

    for (const [accordId, percent] of Object.entries(order.fragrance_composition)) {
      const grams = (percent / 100) * totalMl; // ml ≈ g (Dichte ≈ 1 für Parfümkonzentrat)

      if (!map.has(accordId)) map.set(accordId, new Map());
      const dateMap = map.get(accordId)!;
      const existing = dateMap.get(date) ?? { grams: 0, count: 0 };
      dateMap.set(date, { grams: existing.grams + grams, count: existing.count + 1 });
    }
  }

  const result = new Map<string, DailyUsage[]>();
  for (const [accordId, dateMap] of map.entries()) {
    result.set(
      accordId,
      Array.from(dateMap.entries()).map(([date, { grams, count }]) => ({
        date,
        grams,
        orderCount: count,
      }))
    );
  }
  return result;
}
