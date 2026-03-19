import type { MarketPriceSnapshot } from "@prisma/client";
import type { SignalDetectionResult } from "../types";

const MIN_MEANINGFUL_STDDEV_USDC = 500; // Skip illiquid markets

export function detectSharpMoney(
  snapshots: MarketPriceSnapshot[]
): SignalDetectionResult | null {
  // Require at least 13 snapshots (1 hour at 5-min intervals + 1 for current)
  if (snapshots.length < 13) return null;

  const sorted = [...snapshots].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Build periodic volume from cumulative deltas between adjacent snapshots
  // This gives "volume traded in this 5-minute window" rather than a rolling 24h total
  const periodicVolumes: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i].volumeCumulative ?? null;
    const prev = sorted[i - 1].volumeCumulative ?? null;

    if (curr != null && prev != null && curr >= prev) {
      periodicVolumes.push(curr - prev);
    } else {
      // Fall back to volume24h delta if volumeCumulative is unavailable
      const currV = sorted[i].volume24h ?? null;
      const prevV = sorted[i - 1].volume24h ?? null;
      if (currV != null && prevV != null && currV >= prevV) {
        periodicVolumes.push(currV - prevV);
      }
    }
  }

  // Window = all but last period; last entry is the current period
  const windowVolumes = periodicVolumes.slice(0, -1).filter((v) => v >= 0);
  const currentPeriodVolume = periodicVolumes[periodicVolumes.length - 1] ?? 0;

  if (windowVolumes.length < 6) return null;

  const rollingAvg =
    windowVolumes.reduce((a, b) => a + b, 0) / windowVolumes.length;
  const variance =
    windowVolumes.reduce((a, v) => a + (v - rollingAvg) ** 2, 0) /
    windowVolumes.length;
  const rollingStdDev = Math.sqrt(variance);

  // Guard: if stdDev is too low, market is illiquid — skip
  if (rollingStdDev < MIN_MEANINGFUL_STDDEV_USDC) return null;

  const zScore = (currentPeriodVolume - rollingAvg) / rollingStdDev;

  // Needs z > 3.0 (anomalous volume spike)
  if (zScore < 3.0) return null;

  // Price must have moved meaningfully in same period
  const current = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
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
      currentVolume: currentPeriodVolume,
      rollingStdDev,
    },
  };
}
