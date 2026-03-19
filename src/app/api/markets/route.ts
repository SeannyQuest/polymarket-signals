import "server-only";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { cacheGetOrSet, TTL } from "@/lib/cache";
import { jsonResponse } from "@/middleware/api-handler";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category");
  const resolvedParam = searchParams.get("resolved");
  const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
  const page = isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = isNaN(limitRaw) ? 20 : Math.min(limitRaw, 100);

  const resolved =
    resolvedParam === "true"
      ? true
      : resolvedParam === "false"
        ? false
        : undefined;

  const cacheKey = `markets:${category}:${resolvedParam}:${page}:${limit}`;

  const data = await cacheGetOrSet(cacheKey, TTL.MEDIUM, async () => {
    const where = {
      active: true,
      ...(category && { category }),
      ...(resolved !== undefined && { resolved }),
    };

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        include: {
          _count: {
            select: {
              signals: {
                where: { active: true },
              },
            },
          },
        },
        orderBy: { liquidity: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.market.count({ where }),
    ]);

    return { markets, total, page, pageSize: limit };
  });

  return jsonResponse(data);
}
