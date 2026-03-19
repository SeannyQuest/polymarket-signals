const CLOB_BASE_URL = "https://clob.polymarket.com";

interface ClobMarketRaw {
  condition_id: string;
  tokens: Array<{
    token_id: string;
    outcome: string; // "Yes" or "No"
    price: number; // 0–1 (NOT a string in CLOB API)
  }>;
  volume: number;
  liquidity: number;
}

export interface ClobMarketData {
  conditionId: string;
  yesPrice: number; // 0.0–1.0
  noPrice: number; // 0.0–1.0
  liquidity: number;
  volume: number;
}

// Returns null on error
export async function fetchClobMarket(
  conditionId: string,
): Promise<ClobMarketData | null> {
  const url = `${CLOB_BASE_URL}/markets/${conditionId}`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "polymarket-signals/1.0" },
    });

    if (!response.ok) {
      console.error(
        `CLOB API error: ${response.status} ${response.statusText} for ${conditionId}`,
      );
      return null;
    }

    const data = (await response.json()) as ClobMarketRaw;

    const yesToken = data.tokens.find((t) => t.outcome === "Yes");
    const noToken = data.tokens.find((t) => t.outcome === "No");

    if (!yesToken || !noToken) {
      console.error(`CLOB: missing Yes/No tokens for ${conditionId}`);
      return null;
    }

    return {
      conditionId: data.condition_id,
      yesPrice: yesToken.price,
      noPrice: noToken.price,
      liquidity: data.liquidity,
      volume: data.volume,
    };
  } catch (error) {
    console.error(`CLOB fetch error for ${conditionId}:`, error);
    return null;
  }
}
