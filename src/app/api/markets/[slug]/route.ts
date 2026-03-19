import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGetOrSet, TTL } from "@/lib/cache";
import { jsonResponse, errorResponse } from "@/middleware/api-handler";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  const data = await cacheGetOrSet(
    `market:${slug}`,
    TTL.SHORT * 2,
    async () => {
      const market = await prisma.market.findUnique({
        where: { slug },
        include: {
          snapshots: {
            orderBy: { timestamp: "asc" },
            take: 500,
          },
          signals: {
            where: { active: true },
            orderBy: { confidence: "desc" },
          },
        },
      });

      if (!market) return { found: false } as const;

      const categoryBias = market.category
        ? await prisma.categoryBias.findUnique({
            where: { category: market.category },
          })
        : null;

      return { found: true, market, categoryBias } as const;
    },
  );

  if (!data.found) {
    return errorResponse("Market not found", 404);
  }

  return jsonResponse({ market: data.market, categoryBias: data.categoryBias });
}
