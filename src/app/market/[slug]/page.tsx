import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PriceChart } from "@/components/charts/PriceChart";
import { SignalTypeBadge, DirectionBadge } from "@/components/signals/SignalBadge";
import { Card } from "@/components/ui/Card";
import { formatProbability, formatHoursUntil, formatUSDC } from "@/lib/utils";

export const revalidate = 120;

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const market = await prisma.market.findUnique({
    where: { slug },
    include: {
      snapshots: { orderBy: { timestamp: "asc" }, take: 500 },
      signals: { where: { active: true }, orderBy: { confidence: "desc" } },
    },
  });

  if (!market) notFound();

  const categoryBias = market.category
    ? await prisma.categoryBias.findUnique({ where: { category: market.category } })
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {market.category && (
            <span className="text-xs text-[var(--muted)] uppercase tracking-wide">
              {market.category}
            </span>
          )}
          {market.endDate && (
            <span className="text-xs text-[var(--muted)]">
              · Ends {formatHoursUntil(new Date(market.endDate))}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-white">{market.question}</h1>
        <div className="mt-2 flex items-center gap-6 text-sm">
          <span>
            YES:{" "}
            <span className="font-mono font-bold" style={{ color: "var(--primary)" }}>
              {market.lastTradePrice != null
                ? formatProbability(market.lastTradePrice)
                : "—"}
            </span>
          </span>
          {market.liquidity != null && (
            <span className="text-[var(--muted)]">
              Liquidity: {formatUSDC(market.liquidity)}
            </span>
          )}
          {market.volume24h != null && (
            <span className="text-[var(--muted)]">
              24h Vol: {formatUSDC(market.volume24h)}
            </span>
          )}
        </div>
      </div>

      {/* Price Chart */}
      {market.snapshots.length > 1 && (
        <Card>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Price History</h2>
          <PriceChart snapshots={market.snapshots} />
        </Card>
      )}

      {/* Active Signals */}
      {market.signals.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">Active Signals</h2>
          <div className="space-y-2">
            {market.signals.map((signal) => (
              <Card key={signal.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SignalTypeBadge type={signal.signalType} />
                    <DirectionBadge direction={signal.direction} />
                  </div>
                  <span
                    className="font-mono font-bold text-lg"
                    style={{ color: "var(--primary)" }}
                  >
                    {signal.confidence}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Bias */}
      {categoryBias && (
        <Card>
          <h2 className="text-sm font-medium text-[var(--muted)] mb-3">
            {market.category} Historical Bias ({categoryBias.totalResolved} resolved)
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-[var(--muted)] text-xs mb-1">YES Rate</div>
              <div className="font-mono font-bold">
                {categoryBias.resolvedYesPct != null
                  ? formatProbability(categoryBias.resolvedYesPct)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-xs mb-1">Avg Final Price</div>
              <div className="font-mono font-bold">
                {categoryBias.avgFinalPriceYes != null
                  ? formatProbability(categoryBias.avgFinalPriceYes)
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-[var(--muted)] text-xs mb-1">Edge</div>
              <div
                className={`font-mono font-bold ${
                  (categoryBias.yesEdge ?? 0) > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {categoryBias.yesEdge != null
                  ? `${((categoryBias.yesEdge) * 100).toFixed(1)}%`
                  : "—"}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
