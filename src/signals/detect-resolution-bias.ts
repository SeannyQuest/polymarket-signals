import type { Market, CategoryBias } from "@prisma/client";
import type { SignalDetectionResult } from "../types";

export function detectResolutionBias(
  market: Market,
  categoryBias: CategoryBias | null | undefined
): SignalDetectionResult | null {
  if (!categoryBias) return null;

  // Minimum sample size
  if (categoryBias.totalResolved < 20) return null;

  const currentPrice = market.lastTradePrice;
  if (currentPrice === null) return null;

  const resolvedYesPct = categoryBias.resolvedYesPct;
  if (resolvedYesPct === null) return null;

  // Edge = how much the historical YES rate differs from current price
  const edge = resolvedYesPct - currentPrice;

  // Signal fires when edge > 8%
  if (Math.abs(edge) < 0.08) return null;

  const direction = edge > 0 ? ("BUY_YES" as const) : ("BUY_NO" as const);
  const confidence = Math.min(90, Math.round(Math.abs(edge) * 500));

  return {
    signalType: "RESOLUTION_BIAS",
    direction,
    confidence,
    details: {
      category: market.category,
      historicalYesPct: resolvedYesPct,
      currentPrice,
      edge,
      totalResolved: categoryBias.totalResolved,
    },
  };
}
