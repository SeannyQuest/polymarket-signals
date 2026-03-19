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
  if (!raw.id || !raw.slug) return null;

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

  const liquidity = parseFloat(String(raw.liquidity));
  const volume = parseFloat(String(raw.volume));
  const volume24h = parseFloat(String(raw.volume24hr)); // note: "hr" not "h"
  const lastTradePrice =
    raw.lastTradePrice != null ? parseFloat(String(raw.lastTradePrice)) : NaN;
  const bestBid = raw.bestBid != null ? parseFloat(String(raw.bestBid)) : NaN;
  const bestAsk = raw.bestAsk != null ? parseFloat(String(raw.bestAsk)) : NaN;

  // resolved = closed in Gamma API; outcome derived from outcomePrices.
  // Old markets use prices like "0.9999..." instead of exact "1" — use >0.99 threshold.
  const resolved = raw.closed === true;
  let resolvedYes: boolean | undefined = undefined;
  if (resolved) {
    const p0 = parseFloat(outcomePrices[0]);
    const p1 = parseFloat(outcomePrices[1]);
    if (!isNaN(p0) && !isNaN(p1)) {
      if (p0 > 0.99) resolvedYes = true;
      else if (p1 > 0.99) resolvedYes = false;
    }
  }

  return {
    id: raw.id,
    slug: raw.slug,
    question: raw.question,
    category: normalizeCategory(raw.category),
    endDate: raw.endDate ? new Date(raw.endDate) : null,
    resolved,
    resolvedAt: raw.closedTime ? new Date(raw.closedTime) : null,
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

export function buildMarketUpsertPayload(
  parsed: NonNullable<ReturnType<typeof parseGammaMarket>>,
) {
  return {
    slug: parsed.slug,
    question: parsed.question,
    category: parsed.category,
    endDate: parsed.endDate,
    resolved: parsed.resolved ?? false,
    resolvedAt: parsed.resolvedAt,
    resolvedYes: parsed.resolvedYes,
    lastTradePrice: parsed.lastTradePrice,
    bestBid: parsed.bestBid,
    bestAsk: parsed.bestAsk,
    volume: parsed.volume,
    volume24h: parsed.volume24h,
    liquidity: parsed.liquidity,
    active: parsed.active,
    isTracked: parsed.isTracked,
  };
}
