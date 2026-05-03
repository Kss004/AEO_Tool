"use client";

import { useState } from "react";
import { ALL_MODELS } from "@/lib/models";
import { findCell } from "@/lib/score";
import { MODEL_LABELS, type AnalyzeResult, type ModelKey } from "@/lib/types";

export function ModelResponses({ result }: { result: AnalyzeResult }) {
  const [openQuery, setOpenQuery] = useState<string | null>(null);
  const [openModel, setOpenModel] = useState<ModelKey>("openai");

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold">Raw model responses</h3>
      <p className="text-sm text-zinc-500">
        Click a query to see what each model actually returned.
      </p>

      <div className="space-y-2">
        {result.queries.map((q) => {
          const isOpen = openQuery === q;
          const cell = isOpen ? findCell(result.cells, q, openModel) : null;
          return (
            <div
              key={q}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30"
            >
              <button
                type="button"
                onClick={() => setOpenQuery(isOpen ? null : q)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-900/60"
              >
                <span className="truncate">{q}</span>
                <span className="font-mono text-xs text-zinc-500">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-zinc-800 p-4">
                  <div className="mb-3 flex gap-2">
                    {ALL_MODELS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setOpenModel(m)}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                          openModel === m
                            ? "bg-emerald-500 text-emerald-950"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        }`}
                      >
                        {MODEL_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  {cell?.errorMessage ? (
                    <p className="text-sm text-red-400">{cell.errorMessage}</p>
                  ) : cell ? (
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-500">
                        {cell.latencyMs}ms ·{" "}
                        {cell.targetRank
                          ? `${result.request.brand} ranked #${cell.targetRank}`
                          : `${result.request.brand} not mentioned`}
                      </p>
                      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-black/60 p-3 text-xs text-zinc-300">
                        {cell.responseText}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No data.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
