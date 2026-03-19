import { type NextRequest, NextResponse } from "next/server";
import { executeCronJob } from "@/app/api/cron/cron-handler";
import { fetchClobMarket } from "@/data-sync/polymarket/clob-client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("CRON_SECRET not set — cron endpoint is unprotected");
    return true;
  }
  return authHeader === `Bearer ${secret}`;
}

async function logSync(
  jobName: string,
  result: Record<string, unknown>,
): Promise<void> {
  await prisma.syncLog.create({
    data: {
      jobName,
      status: result.error ? "error" : "success",
      details: result as Parameters<
        typeof prisma.syncLog.create
      >[0]["data"]["details"],
      error: result.error as string | undefined,
    },
  });
}

async function syncSnapshots(): Promise<Record<string, unknown>> {
  // 1. Load all tracked, active, unresolved markets
  const markets = await prisma.market.findMany({
    where: { isTracked: true, active: true, resolved: false },
    select: {
      id: true,
      externalId: true,
      lastTradePrice: true,
      liquidity: true,
    },
  });

  let snapshotCount = 0;
  let errorCount = 0;

  // Process in batches of 10 concurrent CLOB requests to stay within 60s timeout
  const BATCH_SIZE = 10;
  for (let i = 0; i < markets.length; i += BATCH_SIZE) {
    const batch = markets.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (market) => {
        try {
          if (!market.externalId) {
            errorCount++;
            return;
          }

          const clobData = await fetchClobMarket(market.externalId);
          if (!clobData) {
            errorCount++;
            return;
          }

          const prevSnapshot = await prisma.marketPriceSnapshot.findFirst({
            where: { marketId: market.id },
            orderBy: { timestamp: "desc" },
            select: { liquidity: true },
          });

          const liquidityDelta =
            prevSnapshot?.liquidity != null
              ? clobData.liquidity - prevSnapshot.liquidity
              : null;

          await prisma.marketPriceSnapshot.create({
            data: {
              marketId: market.id,
              price: clobData.yesPrice,
              spread:
                clobData.yesPrice > 0 && clobData.noPrice > 0
                  ? Math.abs(clobData.yesPrice - clobData.noPrice)
                  : null,
              volume24h: null,
              volumeCumulative: clobData.volume,
              liquidity: clobData.liquidity,
              liquidityDelta,
            },
          });

          snapshotCount++;
        } catch (err) {
          console.error(`Snapshot failed for market ${market.id}:`, err);
          errorCount++;
        }
      }),
    );
  }

  // Prune snapshots for resolved markets older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.marketPriceSnapshot.deleteMany({
    where: {
      timestamp: { lt: thirtyDaysAgo },
      market: { resolved: true },
    },
  });

  return { marketsProcessed: markets.length, snapshotCount, errorCount };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");

  const result = await executeCronJob("sync-snapshots", authHeader, {
    verifyCronSecret,
    execute: syncSnapshots,
    logSync,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
