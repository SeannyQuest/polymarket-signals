import { prisma } from "@/lib/db";

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await prisma.categoryBias.findMany({
    orderBy: { yesEdge: { sort: "desc", nulls: "last" } },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Resolution Bias by Category</h1>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr
              className="border-b text-left text-[var(--muted)]"
              style={{ borderColor: "var(--border)", background: "var(--card)" }}
            >
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Resolved</th>
              <th className="px-4 py-3 font-medium text-right">YES Rate</th>
              <th className="px-4 py-3 font-medium text-right">Avg Price</th>
              <th className="px-4 py-3 font-medium text-right">Edge</th>
              <th className="px-4 py-3 font-medium text-right">Late Fade %</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => {
              const edge = cat.yesEdge ?? 0;
              return (
                <tr
                  key={cat.id}
                  className="border-b"
                  style={{
                    borderColor: "var(--border)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td className="px-4 py-3 font-medium text-white/90 capitalize">
                    {cat.category}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--muted)]">
                    {cat.totalResolved}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {cat.resolvedYesPct != null
                      ? `${(cat.resolvedYesPct * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--muted)]">
                    {cat.avgFinalPriceYes != null
                      ? `${(cat.avgFinalPriceYes * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono font-bold ${
                      edge > 0.02
                        ? "text-green-400"
                        : edge < -0.02
                        ? "text-red-400"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {cat.yesEdge != null ? `${(edge * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--muted)]">
                    {cat.lateFadePct != null
                      ? `${(cat.lateFadePct * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
