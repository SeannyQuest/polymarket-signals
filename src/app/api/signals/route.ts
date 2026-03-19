import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGetOrSet, TTL } from "@/lib/cache";
import { jsonResponse } from "@/middleware/api-handler";
import { SignalType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const typeParam = searchParams.get("type");
  const type =
    typeParam && Object.values(SignalType).includes(typeParam as SignalType)
      ? (typeParam as SignalType)
      : null;
  const minConfidenceRaw = parseInt(
    searchParams.get("minConfidence") ?? "0",
    10,
  );
  const minConfidence = isNaN(minConfidenceRaw) ? 0 : minConfidenceRaw;
  const category = searchParams.get("category");
  const limitRaw = parseInt(searchParams.get("limit") ?? "50", 10);
  const limit = isNaN(limitRaw) ? 50 : Math.min(limitRaw, 100);

  const cacheKey = `signals:${type}:${minConfidence}:${category}:${limit}`;

  const data = await cacheGetOrSet(cacheKey, TTL.SHORT * 2, async () => {
    const where = {
      active: true,
      ...(type && { signalType: type }),
      ...(minConfidence > 0 && { confidence: { gte: minConfidence } }),
      ...(category && { market: { category } }),
    };

    const [signals, total] = await Promise.all([
      prisma.signal.findMany({
        where,
        include: {
          market: {
            select: {
              id: true,
              slug: true,
              question: true,
              category: true,
              endDate: true,
              lastTradePrice: true,
              liquidity: true,
              volume24h: true,
            },
          },
        },
        orderBy: [{ confidence: "desc" }, { detectedAt: "desc" }],
        take: limit,
      }),
      prisma.signal.count({ where }),
    ]);

    return { signals, total };
  });

  return jsonResponse(data);
}
