import type { AnalyzeResult } from "@/lib/types";

export function Leaderboard({ result }: { result: AnalyzeResult }) {
  const { score, request } = result;
  const top = score.competitorLeaderboard;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">Competitor leaderboard</h3>
      <p className="text-sm text-zinc-500">
        Brands the AI engines mentioned most often. {request.brand} is
        highlighted if it appears.
      </p>

      {top.length === 0 ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-500">
          No competitor mentions extracted.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Brand</th>
                <th className="p-3 font-medium">Mentions</th>
                <th className="p-3 font-medium">Avg rank</th>
              </tr>
            </thead>
            <tbody>
              {top.map((row, i) => {
                const isTarget = row.name
                  .toLowerCase()
                  .includes(request.brand.toLowerCase());
                return (
                  <tr
                    key={row.name + i}
                    className={`border-b border-zinc-900/80 ${
                      isTarget
                        ? "bg-emerald-950/40 text-emerald-200"
                        : "text-zinc-300"
                    }`}
                  >
                    <td className="p-3 font-mono text-zinc-500">{i + 1}</td>
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 font-mono">{row.mentions}</td>
                    <td className="p-3 font-mono">#{row.avgRank}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
