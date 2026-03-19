import type { Market, CategoryBias } from "@prisma/client";
import type { SignalDetectionResult } from "../types";

export function detectLateFade(
  market: Market,
  categoryBias: CategoryBias | null | undefined,
): SignalDetectionResult | null {
  if (!market.endDate) return null;
  if (!categoryBias) return null;

  const hoursToEnd = (market.endDate.getTime() - Date.now()) / (1000 * 60 * 60);

  // Only fire within 48 hours of resolution
  if (hoursToEnd > 48 || hoursToEnd < 0) return null;

  const currentPrice = market.lastTradePrice;
  if (currentPrice === null) return null;

  // Leader must be dominating (>80%)
  if (currentPrice < 0.8) return null;

  // Need historical fade data
  const fadePct = categoryBias.lateFadePct;
  if (fadePct === null) return null;

  // Need meaningful sample and significant fade rate (>25%)
  if (categoryBias.lateFadeSampleSize < 10) return null;
  if (fadePct < 0.25) return null;

  // Direction is always BUY_NO — fade the over-priced leader
  const confidence = Math.min(85, Math.round(fadePct * 200));

  return {
    signalType: "LATE_FADE",
    direction: "BUY_NO",
    confidence,
    expiresAt: market.endDate,
    details: {
      hoursToResolution: hoursToEnd,
      currentPrice,
      historicalFadePct: fadePct,
      sampleSize: categoryBias.lateFadeSampleSize,
      category: market.category,
    },
  };
}
