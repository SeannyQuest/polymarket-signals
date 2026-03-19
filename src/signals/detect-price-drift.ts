import type { MarketPriceSnapshot } from "@prisma/client";
import type { SignalDetectionResult } from "../types";

// Linear regression utility — 8-line least squares, no library
function linearRegression(xs: number[], ys: number[]): { slope: number; rSquared: number } {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, rSquared };
}

export function detectPriceDrift(
  snapshots: MarketPriceSnapshot[]
): SignalDetectionResult | null {
  // Requirements: at least 6 snapshots spanning >= 4 hours
  if (snapshots.length < 6) return null;

  const sorted = [...snapshots].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const firstTime = sorted[0].timestamp.getTime();
  const lastTime = sorted[sorted.length - 1].timestamp.getTime();
  const spanHours = (lastTime - firstTime) / (1000 * 60 * 60);
  if (spanHours < 4) return null;

  // xs = hours since first snapshot, ys = prices
  const xs = sorted.map((s) => (s.timestamp.getTime() - firstTime) / (1000 * 60 * 60));
  const ys = sorted.map((s) => s.price);

  const { slope, rSquared } = linearRegression(xs, ys);

  const firstPrice = ys[0];
  const lastPrice = ys[ys.length - 1];
  const totalDriftPct = Math.abs((lastPrice - firstPrice) / firstPrice) * 100;

  // Signal fires when: drift > 5%, rSquared > 0.7, trend consistent
  if (totalDriftPct < 5 || rSquared < 0.7) return null;

  const direction = slope > 0 ? ("BUY_YES" as const) : ("BUY_NO" as const);
  const confidence = Math.min(95, Math.round(rSquared * 100 * (totalDriftPct / 10)));

  return {
    signalType: "PRICE_DRIFT",
    direction,
    confidence,
    details: {
      driftPct: totalDriftPct,
      driftHours: spanHours,
      startPrice: firstPrice,
      endPrice: lastPrice,
      rSquared,
      slope,
    },
  };
}
