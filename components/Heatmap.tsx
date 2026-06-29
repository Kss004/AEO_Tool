import { ALL_MODELS } from "@/lib/models";
import { findCell, heatmapColor, heatmapValue } from "@/lib/score";
import { MODEL_LABELS, type AnalyzeResult } from "@/lib/types";

export function Heatmap({ result }: { result: AnalyzeResult }) {
  const { queries, cells } = result;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">Query × model heatmap</h3>
      <p className="text-sm text-zinc-500">
        Green = ranked top of list. Amber = ranked but lower. Dark = not
        mentioned. Each cell shows the brand&apos;s rank position.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/30">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left">
              <th className="p-3 font-medium text-zinc-400">Query</th>
              {ALL_MODELS.map((m) => (
                <th
                  key={m}
                  className="p-3 text-center font-medium text-zinc-400"
                >
                  {MODEL_LABELS[m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {queries.map((q) => (
              <tr key={q} className="border-b border-zinc-900/80">
                <td className="max-w-md p-3 align-top text-zinc-300">{q}</td>
                {ALL_MODELS.map((m) => {
                  const cell = findCell(cells, q, m);
                  const v = heatmapValue(cell);
                  const label = !cell
                    ? "—"
                    : cell.errorMessage
                      ? "err"
                      : cell.targetRank === null
                        ? "—"
                        : `#${cell.targetRank}`;
                  return (
                    <td key={m} className="p-2 text-center align-top">
                      <span
                        className={`inline-flex min-w-[3rem] items-center justify-center rounded-md px-2 py-1 font-mono text-xs ${heatmapColor(v)}`}
                        title={cell?.errorMessage ?? undefined}
                      >
                        {label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
