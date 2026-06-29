import Link from "next/link";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Scorecard } from "@/components/Scorecard";
import { Heatmap } from "@/components/Heatmap";
import { Leaderboard } from "@/components/Leaderboard";
import { ModelResponses } from "@/components/ModelResponses";
import { TavilyCompare } from "@/components/TavilyCompare";
import type { AnalyzeResult } from "@/lib/types";

export const dynamic = "force-static";

async function loadDemo(): Promise<AnalyzeResult | null> {
  try {
    const file = path.join(process.cwd(), "public", "demo.json");
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as AnalyzeResult;
  } catch {
    return null;
  }
}

export default async function DemoPage() {
  const result = await loadDemo();

  if (!result) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400/80 hover:text-emerald-300"
        >
          ← New diagnostic
        </Link>
        <h1 className="text-2xl font-semibold">No cached demo yet</h1>
        <p className="text-zinc-400">
          The sample diagnostic hasn&apos;t been recorded yet. Run a live
          diagnostic from the home page first, then save the result JSON to{" "}
          <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-emerald-300">
            public/demo.json
          </code>{" "}
          and reload this page.
        </p>
        <p className="text-sm text-zinc-500">
          Hint:{" "}
          <code className="break-all rounded bg-zinc-900 px-1.5 py-0.5">
            curl http://localhost:3000/api/report/&lt;id&gt; &gt; public/demo.json
          </code>
        </p>
      </main>
    );
  }

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
          Sample run · {new Date(result.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-sm text-emerald-200">
        Pre-recorded sample diagnostic. Sample output for reference
      </div>

      <Scorecard result={result} />
      <Heatmap result={result} />
      <Leaderboard result={result} />
      <TavilyCompare result={result} />

      {result.score.missedQueries.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Queries you got ignored on</h3>
          <ul className="space-y-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5 text-sm text-zinc-400">
            {result.score.missedQueries.map((q) => (
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
