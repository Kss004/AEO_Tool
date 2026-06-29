import type { AnalyzeResult } from "@/lib/types";

export function TavilyCompare({ result }: { result: AnalyzeResult }) {
  if (!result.tavily) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">LLM rankings vs real Google</h3>
      <p className="text-sm text-zinc-500">
        Tavily-fetched Google top results compared to what AI models say. Gaps
        here = brands that win in Google SEO but lose in AEO (or vice versa).
      </p>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="p-3 font-medium">Query</th>
              <th className="p-3 font-medium">Top Google brands</th>
              <th className="p-3 font-medium">{result.request.brand} on Google</th>
            </tr>
          </thead>
          <tbody>
            {result.tavily.map((row) => (
              <tr key={row.query} className="border-b border-zinc-900/80">
                <td className="max-w-xs p-3 align-top text-zinc-300">
                  {row.query}
                </td>
                <td className="p-3 align-top text-zinc-400">
                  {row.topGoogleBrands.length
                    ? row.topGoogleBrands.slice(0, 5).join(", ")
                    : "—"}
                </td>
                <td className="p-3 align-top">
                  {row.brandInTopGoogle ? (
                    <span className="rounded-md bg-emerald-900/60 px-2 py-1 font-mono text-xs text-emerald-200">
                      #{row.googleRank}
                    </span>
                  ) : (
                    <span className="text-zinc-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
