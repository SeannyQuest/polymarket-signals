import "server-only";
import { prisma } from "@/lib/db";
import { cacheGetOrSet, TTL } from "@/lib/cache";
import { jsonResponse } from "@/middleware/api-handler";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await cacheGetOrSet("categories", TTL.HOUR, async () => {
    const categories = await prisma.categoryBias.findMany({
      orderBy: { yesEdge: { sort: "desc", nulls: "last" } },
    });

    return { categories };
  });

  return jsonResponse(data);
}
