import Link from "next/link";
import { notFound } from "next/navigation";
import { loadResult } from "@/lib/store";
import { Scorecard } from "@/components/Scorecard";
import { Heatmap } from "@/components/Heatmap";
import { Leaderboard } from "@/components/Leaderboard";
import { ModelResponses } from "@/components/ModelResponses";
import { TavilyCompare } from "@/components/TavilyCompare";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadResult(id);
  if (!result) notFound();

  const missed = result.score.missedQueries;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400/80 hover:text-emerald-300"
        >
          ← New diagnostic
        </Link>
        <p className="text-xs text-zinc-500">
          Run {result.id} · {new Date(result.createdAt).toLocaleString()}
        </p>
      </div>

      <Scorecard result={result} />
      <Heatmap result={result} />
      <Leaderboard result={result} />
      <TavilyCompare result={result} />

      {missed.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Queries you got ignored on</h3>
          <ul className="space-y-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-400">
            {missed.map((q) => (
              <li key={q} className="flex items-start gap-2">
                <span className="text-red-400">✗</span>
                {q}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ModelResponses result={result} />
    </main>
  );
}
