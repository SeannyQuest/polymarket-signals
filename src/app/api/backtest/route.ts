import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGetOrSet, TTL } from "@/lib/cache";
import { jsonResponse } from "@/middleware/api-handler";
import type { SignalType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const signalType = searchParams.get("signalType") as SignalType | null;
  const minConfidenceParam = searchParams.get("minConfidence");
  const minConfidence = minConfidenceParam !== null ? parseInt(minConfidenceParam, 10) : undefined;
  const category = searchParams.get("category");

  const cacheKey = `backtest:${signalType}:${minConfidence}:${category}`;

  const data = await cacheGetOrSet(cacheKey, TTL.HOUR, async () => {
    const results = await prisma.signalBacktestResult.findMany({
      where: {
        ...(signalType && { signalType }),
        ...(minConfidence !== undefined && { minConfidence }),
        ...(category && { category }),
      },
      orderBy: [{ signalType: "asc" }, { minConfidence: "asc" }],
    });

    return { results };
  });

  return jsonResponse(data);
}
