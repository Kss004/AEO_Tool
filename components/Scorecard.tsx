import { MODEL_LABELS, type AnalyzeResult, type ModelKey } from "@/lib/types";
import { ALL_MODELS } from "@/lib/models";

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function rankPill(rank: number | null): string {
  if (rank === null) return "Not ranked";
  if (rank === 1) return "#1";
  return `#${rank}`;
}

export function Scorecard({ result }: { result: AnalyzeResult }) {
  const { score, request } = result;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400/80">
            Report card
          </p>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {request.brand} <span className="text-zinc-500">·</span>{" "}
            <span className="text-zinc-400">{request.category}</span>
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          {score.totalQueries} queries · {score.totalCells} model calls
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {ALL_MODELS.map((m: ModelKey) => {
          const s = score.byModel[m];
          return (
            <div
              key={m}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                {MODEL_LABELS[m]}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-semibold">
                  {pct(s.mentionRate)}
                </span>
                <span className="text-xs text-zinc-500">mention rate</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                <div>
                  <dt className="text-zinc-500">Avg rank</dt>
                  <dd className="font-mono text-zinc-200">
                    {s.avgRank ? rankPill(Math.round(s.avgRank)) : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Share of voice</dt>
                  <dd className="font-mono text-zinc-200">
                    {pct(s.shareOfVoice)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </section>
  );
}
