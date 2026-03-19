import { prisma } from "@/lib/db";
import { SignalFeed } from "@/components/signals/SignalFeed";
import type { SignalWithMarket } from "@/types";

export const revalidate = 60;

export default async function HomePage() {
  const signals = await prisma.signal.findMany({
    where: { active: true },
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
    take: 50,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Live Signals</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {signals.length} active signal{signals.length !== 1 ? "s" : ""} · Updated every 5 minutes
        </p>
      </div>
      <SignalFeed signals={signals as SignalWithMarket[]} />
    </div>
  );
}
