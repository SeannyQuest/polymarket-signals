import type { Prisma } from "@prisma/client";
import type { GammaMarketRaw } from "./gamma-client";

function shouldTrack(liquidity: number, volume24h: number): boolean {
  return liquidity > 10_000 || volume24h > 5_000;
}

function normalizeCategory(category: string | null): string {
  if (!category) return "uncategorized";
  return category.toLowerCase();
}

// Returns null if market should be skipped (e.g., multi-outcome markets)
export function parseGammaMarket(
  raw: GammaMarketRaw,
): Prisma.MarketCreateInput | null {
  // Parse outcomePrices — field is a JSON array string like "[\"0.72\", \"0.28\"]"
  let outcomePrices: string[];
  try {
    outcomePrices = JSON.parse(raw.outcomePrices) as string[];
  } catch {
    return null;
  }

  // Skip non-binary markets
  if (!Array.isArray(outcomePrices) || outcomePrices.length !== 2) {
    return null;
  }

  const liquidity = parseFloat(raw.liquidity);
  const volume = parseFloat(raw.volume);
  const volume24h = parseFloat(raw.volume24hr); // note: "hr" not "h"
  const lastTradePrice = parseFloat(raw.lastTradePrice);
  const bestBid = parseFloat(raw.bestBid);
  const bestAsk = parseFloat(raw.bestAsk);

  let resolvedYes: boolean | undefined = undefined;
  if (raw.outcome === "yes") resolvedYes = true;
  else if (raw.outcome === "no") resolvedYes = false;

  return {
    id: raw.id,
    slug: raw.slug,
    question: raw.question,
    category: normalizeCategory(raw.category),
    endDate: raw.endDate ? new Date(raw.endDate) : null,
    resolved: raw.resolved,
    resolvedAt: raw.resolvedAt ? new Date(raw.resolvedAt) : null,
    resolvedYes,
    lastTradePrice: isNaN(lastTradePrice) ? null : lastTradePrice,
    bestBid: isNaN(bestBid) ? null : bestBid,
    bestAsk: isNaN(bestAsk) ? null : bestAsk,
    volume: isNaN(volume) ? null : volume,
    volume24h: isNaN(volume24h) ? null : volume24h,
    liquidity: isNaN(liquidity) ? null : liquidity,
    active: raw.active,
    isTracked: shouldTrack(
      isNaN(liquidity) ? 0 : liquidity,
      isNaN(volume24h) ? 0 : volume24h,
    ),
  };
}
