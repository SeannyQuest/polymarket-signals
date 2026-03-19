import { type NextRequest, NextResponse } from "next/server";
import { executeCronJob } from "@/app/api/cron/cron-handler";
import { prisma } from "@/lib/db";
import type { SignalType } from "@prisma/client";

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

async function gradeSignals(): Promise<Record<string, unknown>> {
  // 1. Find ungraded signals on resolved markets
  const ungradedSignals = await prisma.signal.findMany({
    where: {
      active: false,
      wasCorrect: null,
      market: { resolved: true },
    },
    include: {
      market: {
        select: { resolvedYes: true, lastTradePrice: true },
      },
    },
    take: 500, // batch limit per cron run
  });

  let graded = 0;

  for (const signal of ungradedSignals) {
    const resolvedYes = signal.market.resolvedYes;
    if (resolvedYes === null) continue; // market resolved but outcome not yet set

    // BUY_YES is correct if market resolved YES
    // BUY_NO is correct if market resolved NO
    const wasCorrect =
      signal.direction === "BUY_YES" ? resolvedYes : !resolvedYes;

    await prisma.signal.update({
      where: { id: signal.id },
      data: {
        wasCorrect,
        priceAtExpiry: signal.market.lastTradePrice,
        gradedAt: new Date(),
      },
    });

    graded++;
  }

  // 2. Recompute SignalBacktestResult aggregates
  if (graded > 0) {
    await recomputeBacktestResults();
  }

  return { ungradedFound: ungradedSignals.length, graded };
}

async function recomputeBacktestResults(): Promise<void> {
  // Get all graded signals grouped by type and category
  const gradedSignals = await prisma.signal.findMany({
    where: { wasCorrect: { not: null } },
    select: {
      signalType: true,
      confidence: true,
      wasCorrect: true,
      market: { select: { category: true } },
    },
  });

  const CONFIDENCE_THRESHOLDS = [50, 60, 70, 80, 90];

  // Aggregate: (signalType + minConfidence + category | null) → { total, correct }
  const buckets = new Map<
    string,
    {
      signalType: SignalType;
      minConfidence: number;
      category: string | null;
      total: number;
      correct: number;
    }
  >();

  for (const signal of gradedSignals) {
    for (const threshold of CONFIDENCE_THRESHOLDS) {
      if (signal.confidence < threshold) continue;

      // Global bucket (category = null)
      const globalKey = `${signal.signalType}:${threshold}:null`;
      if (!buckets.has(globalKey)) {
        buckets.set(globalKey, {
          signalType: signal.signalType,
          minConfidence: threshold,
          category: null,
          total: 0,
          correct: 0,
        });
      }
      const globalBucket = buckets.get(globalKey)!;
      globalBucket.total++;
      if (signal.wasCorrect) globalBucket.correct++;

      // Category-specific bucket
      if (signal.market.category) {
        const catKey = `${signal.signalType}:${threshold}:${signal.market.category}`;
        if (!buckets.has(catKey)) {
          buckets.set(catKey, {
            signalType: signal.signalType,
            minConfidence: threshold,
            category: signal.market.category,
            total: 0,
            correct: 0,
          });
        }
        const catBucket = buckets.get(catKey)!;
        catBucket.total++;
        if (signal.wasCorrect) catBucket.correct++;
      }
    }
  }

  // Upsert all buckets
  // Note: category is nullable — PostgreSQL treats NULLs as distinct in unique
  // constraints, so upsert won't match null-category rows. Use updateMany+create instead.
  for (const bucket of buckets.values()) {
    const winRate = bucket.total > 0 ? bucket.correct / bucket.total : null;

    if (bucket.category !== null) {
      // Non-null category: standard upsert works
      await prisma.signalBacktestResult.upsert({
        where: {
          signalType_minConfidence_category: {
            signalType: bucket.signalType,
            minConfidence: bucket.minConfidence,
            category: bucket.category,
          },
        },
        create: {
          signalType: bucket.signalType,
          minConfidence: bucket.minConfidence,
          category: bucket.category,
          totalSignals: bucket.total,
          correctSignals: bucket.correct,
          winRate,
        },
        update: {
          totalSignals: bucket.total,
          correctSignals: bucket.correct,
          winRate,
          computedAt: new Date(),
        },
      });
    } else {
      // Null category: use updateMany + create fallback
      const updated = await prisma.signalBacktestResult.updateMany({
        where: {
          signalType: bucket.signalType,
          minConfidence: bucket.minConfidence,
          category: null,
        },
        data: {
          totalSignals: bucket.total,
          correctSignals: bucket.correct,
          winRate,
          computedAt: new Date(),
        },
      });
      if (updated.count === 0) {
        await prisma.signalBacktestResult.create({
          data: {
            signalType: bucket.signalType,
            minConfidence: bucket.minConfidence,
            category: null,
            totalSignals: bucket.total,
            correctSignals: bucket.correct,
            winRate,
          },
        });
      }
    }
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");

  const result = await executeCronJob("grade-signals", authHeader, {
    verifyCronSecret,
    execute: gradeSignals,
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
