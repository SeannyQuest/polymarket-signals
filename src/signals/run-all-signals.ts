import { subHours } from "date-fns";
import { prisma } from "../lib/db";
import { detectPriceDrift } from "./detect-price-drift";
import { detectSharpMoney } from "./detect-sharp-money";
import { detectResolutionBias } from "./detect-resolution-bias";
import { detectLateFade } from "./detect-late-fade";
import type { SignalType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export interface RunSignalsResult {
  marketsProcessed: number;
  signalsUpserted: number;
  signalsExpired: number;
}

export async function runAllSignals(): Promise<RunSignalsResult> {
  // 1. Load all active, tracked, unresolved markets with last 48h of snapshots
  const markets = await prisma.market.findMany({
    where: { active: true, resolved: false, isTracked: true },
    include: {
      snapshots: {
        where: { timestamp: { gte: subHours(new Date(), 48) } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  // 2. Load all category biases into a map
  const categoryBiases = await prisma.categoryBias.findMany();
  const biasMap = new Map(categoryBiases.map((b) => [b.category, b]));

  // 3. Expire stale signals (past their expiresAt)
  const expired = await prisma.signal.updateMany({
    where: { active: true, expiresAt: { lt: new Date() } },
    data: { active: false },
  });

  // 4. Run detectors for each market and collect all results
  const allResults: Array<{
    marketId: string;
    price: number | null;
    result: import("../types").SignalDetectionResult;
  }> = [];

  for (const market of markets) {
    const bias = biasMap.get(market.category ?? "uncategorized") ?? null;

    const detectionResults = [
      detectPriceDrift(market.snapshots),
      detectSharpMoney(market.snapshots),
      detectResolutionBias(market, bias),
      detectLateFade(market, bias),
    ];

    for (const result of detectionResults) {
      if (!result) continue;
      allResults.push({
        marketId: market.id,
        price: market.lastTradePrice,
        result,
      });
    }
  }

  // 5. Batch upsert all signals in parallel
  await Promise.all(
    allResults.map(({ marketId, price, result }) =>
      prisma.signal.upsert({
        where: {
          marketId_signalType: {
            marketId,
            signalType: result.signalType as SignalType,
          },
        },
        create: {
          marketId,
          signalType: result.signalType as SignalType,
          direction: result.direction,
          confidence: result.confidence,
          details: result.details as Prisma.InputJsonValue,
          priceAtDetection: price,
          active: true,
          expiresAt: result.expiresAt ?? null,
        },
        update: {
          direction: result.direction,
          confidence: result.confidence,
          details: result.details as Prisma.InputJsonValue,
          active: true,
          detectedAt: new Date(),
        },
      }),
    ),
  );

  const signalsUpserted = allResults.length;

  return {
    marketsProcessed: markets.length,
    signalsUpserted,
    signalsExpired: expired.count,
  };
}
