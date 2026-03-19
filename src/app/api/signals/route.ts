import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGetOrSet, TTL } from "@/lib/cache";
import { jsonResponse } from "@/middleware/api-handler";
import type { SignalType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") as SignalType | null;
  const minConfidence = parseInt(searchParams.get("minConfidence") ?? "0", 10);
  const category = searchParams.get("category");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const cacheKey = `signals:${type}:${minConfidence}:${category}:${limit}`;

  const data = await cacheGetOrSet(cacheKey, TTL.SHORT * 2, async () => {
    const signals = await prisma.signal.findMany({
      where: {
        active: true,
        ...(type && { signalType: type }),
        ...(minConfidence > 0 && { confidence: { gte: minConfidence } }),
        ...(category && { market: { category } }),
      },
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
    });

    return { signals, total: signals.length };
  });

  return jsonResponse(data);
}
