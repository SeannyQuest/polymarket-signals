/**
 * One-time historical backfill script.
 * Fetches ALL resolved markets from Gamma API and upserts into DB.
 * Run locally via: npx tsx src/scripts/backfill-markets.ts
 *
 * Runs locally to avoid Vercel's 60s function timeout.
 */
import { PrismaClient } from "@prisma/client";
import { fetchAllGammaMarkets } from "../data-sync/polymarket/gamma-client";
import { parseGammaMarket } from "../data-sync/polymarket/parsers";

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function backfill(): Promise<void> {
  console.log("Starting historical backfill of resolved markets...");

  const rawMarkets = await fetchAllGammaMarkets({ resolved: true });
  console.log(`Fetched ${rawMarkets.length} resolved markets from Gamma API`);

  let upserted = 0;
  let skipped = 0;

  for (let i = 0; i < rawMarkets.length; i++) {
    const raw = rawMarkets[i];
    const parsed = parseGammaMarket(raw);

    if (!parsed) {
      skipped++;
      continue;
    }

    await prisma.market.upsert({
      where: { id: parsed.id as string },
      create: parsed,
      update: {
        slug: parsed.slug,
        question: parsed.question,
        category: parsed.category,
        endDate: parsed.endDate,
        resolved: parsed.resolved,
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
      },
    });

    upserted++;

    // Log progress every 100 markets
    if (upserted % 100 === 0) {
      console.log(
        `Progress: ${upserted} upserted, ${skipped} skipped (${i + 1}/${rawMarkets.length})`,
      );
    }
  }

  console.log(
    `Backfill complete: ${upserted} upserted, ${skipped} skipped (non-binary markets)`,
  );
}

backfill()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
