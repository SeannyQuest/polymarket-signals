"use client";
import { useMarkets } from "@/hooks/use-markets";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatProbability, formatUSDC } from "@/lib/utils";
import Link from "next/link";

export default function MarketsPage() {
  const { data, isLoading } = useMarkets({ resolved: false, limit: 100 });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Active Markets</h1>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-left text-[var(--muted)]"
                style={{ borderColor: "var(--border)", background: "var(--card)" }}
              >
                <th className="px-4 py-3 font-medium">Market</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Liquidity</th>
                <th className="px-4 py-3 font-medium text-right">Signals</th>
              </tr>
            </thead>
            <tbody>
              {(data?.markets ?? []).map((market, i) => (
                <tr
                  key={market.id}
                  className="border-b hover:bg-white/5 transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/market/${market.slug}`}
                      className="text-white/90 hover:text-[var(--primary)] transition-colors line-clamp-1"
                    >
                      {market.question}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {market.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {market.lastTradePrice != null
                      ? formatProbability(market.lastTradePrice)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--muted)]">
                    {market.liquidity != null ? formatUSDC(market.liquidity) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(market._count?.signals ?? 0) > 0 ? (
                      <Badge variant="primary">{market._count!.signals}</Badge>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
