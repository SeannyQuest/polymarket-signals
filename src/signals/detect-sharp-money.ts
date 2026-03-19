import type { MarketPriceSnapshot } from "@prisma/client";
import type { SignalDetectionResult } from "../types";

export function detectSharpMoney(
  snapshots: MarketPriceSnapshot[]
): SignalDetectionResult | null {
  // Require at least 13 snapshots (1 hour at 5-min intervals + 1 for current)
  if (snapshots.length < 13) return null;

  const sorted = [...snapshots].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Use all BUT the most recent as the rolling window
  const windowSnapshots = sorted.slice(0, -1);
  const current = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  // Volume from snapshots (use volumeCumulative delta if available, else volume24h)
  const windowVolumes = windowSnapshots
    .map((s) => s.volume24h ?? 0)
    .filter((v) => v > 0);

  if (windowVolumes.length < 6) return null;

  const rollingAvg =
    windowVolumes.reduce((a, b) => a + b, 0) / windowVolumes.length;
  const variance =
    windowVolumes.reduce((a, v) => a + (v - rollingAvg) ** 2, 0) /
    windowVolumes.length;
  const rollingStdDev = Math.sqrt(variance);

  // Guard: if stdDev is too low, market is illiquid — skip
  if (rollingStdDev < 1000) return null;

  const currentVolume = current.volume24h ?? 0;
  const zScore = (currentVolume - rollingAvg) / rollingStdDev;

  // Needs z > 3.0 (anomalous volume spike)
  if (zScore < 3.0) return null;

  // Price must have moved meaningfully in same period
  const priceChange = current.price - prev.price;
  if (Math.abs(priceChange) < 0.02) return null; // < 2% move

  const direction = priceChange > 0 ? ("BUY_YES" as const) : ("BUY_NO" as const);
  const confidence = Math.min(95, Math.round(zScore * 20));

  return {
    signalType: "SHARP_MONEY",
    direction,
    confidence,
    details: {
      zScore,
      priceChange,
      rollingAvgVolume: rollingAvg,
      currentVolume,
      rollingStdDev,
    },
  };
}
