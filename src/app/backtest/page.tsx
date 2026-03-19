import { prisma } from "@/lib/db";

export const revalidate = 3600;

export default async function BacktestPage() {
  const results = await prisma.signalBacktestResult.findMany({
    where: { category: null },
    orderBy: [{ signalType: "asc" }, { minConfidence: "asc" }],
  });

  const byType = results.reduce(
    (acc, r) => {
      if (!acc[r.signalType]) acc[r.signalType] = [];
      acc[r.signalType].push(r);
      return acc;
    },
    {} as Record<string, typeof results>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Signal Backtest Performance</h1>
      <p className="text-sm text-[var(--muted)] mb-8">
        Historical win rates for each signal type at different confidence thresholds
      </p>

      {Object.keys(byType).length === 0 ? (
        <div className="text-center py-16 text-[var(--muted)]">
          No graded signals yet. Performance data builds up as markets resolve.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byType).map(([signalType, rows]) => (
            <div key={signalType}>
              <h2 className="text-sm font-medium text-white mb-3">
                {signalType.replace(/_/g, " ")}
              </h2>
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: "var(--border)" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className="text-left text-[var(--muted)] border-b"
                      style={{ borderColor: "var(--border)", background: "var(--card)" }}
                    >
                      <th className="px-4 py-3 font-medium">Min Confidence</th>
                      <th className="px-4 py-3 font-medium text-right">Signals</th>
                      <th className="px-4 py-3 font-medium text-right">Correct</th>
                      <th className="px-4 py-3 font-medium text-right">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const winRate = row.winRate ?? 0;
                      return (
                        <tr
                          key={row.id}
                          className="border-b"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <td className="px-4 py-3 font-mono">{row.minConfidence}+</td>
                          <td className="px-4 py-3 text-right text-[var(--muted)]">
                            {row.totalSignals}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--muted)]">
                            {row.correctSignals}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-mono font-bold ${
                              winRate >= 0.55
                                ? "text-green-400"
                                : winRate >= 0.5
                                ? "text-[var(--muted)]"
                                : "text-red-400"
                            }`}
                          >
                            {row.winRate != null ? `${(winRate * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
