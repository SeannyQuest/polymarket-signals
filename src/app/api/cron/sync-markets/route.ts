import { type NextRequest, NextResponse } from "next/server";
import { executeCronJob } from "@/app/api/cron/cron-handler";
import { fetchAllGammaMarkets } from "@/data-sync/polymarket/gamma-client";
import {
  parseGammaMarket,
  buildMarketUpsertPayload,
} from "@/data-sync/polymarket/parsers";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

async function computeCategoryBias(): Promise<void> {
  const resolved = await prisma.market.findMany({
    where: { resolved: true },
    select: {
      category: true,
      resolvedYes: true,
      lastTradePrice: true,
      endDate: true,
      resolvedAt: true,
    },
  });

  const byCategory = new Map<string, typeof resolved>();
  for (const m of resolved) {
    const cat = m.category ?? "uncategorized";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(m);
  }

  for (const [category, markets] of byCategory) {
    const total = markets.length;
    if (total < 5) continue;

    const yesMarkets = markets.filter((m) => m.resolvedYes === true);
    const resolvedYesCount = yesMarkets.length;
    const resolvedYesPct = resolvedYesCount / total;

    const allPrices = markets
      .map((m) => m.lastTradePrice)
      .filter((p): p is number => p !== null);
    const avgFinalPriceYes =
      allPrices.length > 0
        ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length
        : null;

    const yesEdge =
      avgFinalPriceYes !== null ? resolvedYesPct - avgFinalPriceYes : null;

    const lateFadeCandidates = markets.filter(
      (m) => m.lastTradePrice !== null && m.lastTradePrice > 0.8,
    );
    const lateFadeSampleSize = lateFadeCandidates.length;
    const lateFadeCount = lateFadeCandidates.filter(
      (m) => m.resolvedYes === false,
    ).length;
    const lateFadePct =
      lateFadeSampleSize > 0 ? lateFadeCount / lateFadeSampleSize : null;

    await prisma.categoryBias.upsert({
      where: { category },
      create: {
        category,
        totalResolved: total,
        resolvedYesCount,
        resolvedYesPct,
        avgFinalPriceYes,
        yesEdge,
        lateFadeCount,
        lateFadeSampleSize,
        lateFadePct,
      },
      update: {
        totalResolved: total,
        resolvedYesCount,
        resolvedYesPct,
        avgFinalPriceYes,
        yesEdge,
        lateFadeCount,
        lateFadeSampleSize,
        lateFadePct,
        computedAt: new Date(),
      },
    });
  }
}

async function syncMarkets(): Promise<Record<string, unknown>> {
  let activeUpserted = 0;
  let resolvedUpserted = 0;
  let skippedCount = 0;

  // 1. Fetch top 500 active markets by 24h volume (highest liquidity first)
  const activeRaw = await fetchAllGammaMarkets({
    active: true,
    order: "volume24hr",
    ascending: false,
    maxPages: 5,
  });
  for (const raw of activeRaw) {
    const parsed = parseGammaMarket(raw);
    if (!parsed) {
      skippedCount++;
      continue;
    }
    await prisma.market.upsert({
      where: { id: parsed.id as string },
      create: parsed,
      update: buildMarketUpsertPayload(parsed),
    });
    activeUpserted++;
  }

  // 2. Fetch and upsert recently resolved markets (cap at 10 pages / 1000 markets
  //    to avoid Vercel timeout — full history lives in DB from the backfill)
  const resolvedRaw = await fetchAllGammaMarkets({
    resolved: true,
    maxPages: 10,
  });
  for (const raw of resolvedRaw) {
    const parsed = parseGammaMarket(raw);
    if (!parsed) {
      skippedCount++;
      continue;
    }
    await prisma.market.upsert({
      where: { id: parsed.id as string },
      create: parsed,
      update: buildMarketUpsertPayload(parsed),
    });
    resolvedUpserted++;
  }

  // 3. Always recompute bias from all resolved markets in DB
  await computeCategoryBias();

  return {
    upsertedCount: activeUpserted + resolvedUpserted,
    skippedCount,
    activeMarkets: activeRaw.length,
    resolvedMarkets: resolvedRaw.length,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");

  const result = await executeCronJob("sync-markets", authHeader, {
    verifyCronSecret,
    execute: syncMarkets,
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
