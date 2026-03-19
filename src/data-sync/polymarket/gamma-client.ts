const GAMMA_BASE_URL = "https://gamma-api.polymarket.com";
const PAGE_LIMIT = 100;
const REQUEST_DELAY_MS = 200;

// ALL numeric fields in Gamma API responses are strings
export interface GammaMarketRaw {
  id: string;
  slug: string;
  question: string;
  description: string;
  endDate: string | null;
  liquidity: string;
  volume: string;
  volume24hr: string; // note: "hr" not "h"
  lastTradePrice: string;
  bestBid: string;
  bestAsk: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  resolved: boolean;
  resolvedAt: string | null;
  outcome: string | null; // "yes" or "no"
  outcomePrices: string; // JSON string: "[\"0.72\", \"0.28\"]"
  category: string | null;
}

export interface FetchMarketsOptions {
  limit?: number;
  offset?: number;
  active?: boolean;
  resolved?: boolean;
  order?: string;
  ascending?: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchGammaMarkets(
  options: FetchMarketsOptions,
): Promise<GammaMarketRaw[]> {
  const {
    limit = PAGE_LIMIT,
    offset = 0,
    active,
    resolved,
    order,
    ascending,
  } = options;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (active !== undefined) params.set("active", String(active));
  if (resolved !== undefined) params.set("resolved", String(resolved));
  if (order !== undefined) params.set("order", order);
  if (ascending !== undefined) params.set("ascending", String(ascending));

  const url = `${GAMMA_BASE_URL}/markets?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "polymarket-signals/1.0" },
    });

    if (!response.ok) {
      console.error(
        `Gamma API error: ${response.status} ${response.statusText} for ${url}`,
      );
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as GammaMarketRaw[]) : [];
  } catch (error) {
    console.error("Gamma API fetch error:", error);
    return [];
  }
}

export async function fetchAllGammaMarkets(
  options: Omit<FetchMarketsOptions, "limit" | "offset"> & {
    maxPages?: number;
  },
): Promise<GammaMarketRaw[]> {
  const { maxPages, ...fetchOptions } = options;
  const all: GammaMarketRaw[] = [];
  let offset = 0;
  let pageCount = 0;

  while (true) {
    const page = await fetchGammaMarkets({
      ...fetchOptions,
      limit: PAGE_LIMIT,
      offset,
    });

    if (page.length === 0) break;

    all.push(...page);
    pageCount++;

    if (page.length < PAGE_LIMIT) break;
    if (maxPages !== undefined && pageCount >= maxPages) break;

    offset += PAGE_LIMIT;
    await delay(REQUEST_DELAY_MS);
  }

  return all;
}
