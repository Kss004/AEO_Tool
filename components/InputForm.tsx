"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { AnalyzeResult } from "@/lib/types";

const STAGES = [
  "Generating buyer-style queries...",
  "Asking GPT-5.5, Gemini 2.5 Flash, and Gemma 4 in parallel...",
  "Extracting brand mentions and rank positions...",
  "Comparing to real Google results (Tavily)...",
  "Compiling your report card...",
];

export function InputForm() {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!brand || !category) return;
    setError(null);
    setLoading(true);
    setStageIndex(0);

    const stageTimer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, 8000);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand.trim(),
          category: category.trim(),
          competitors: competitors
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as AnalyzeResult;
      router.push(`/report/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    } finally {
      clearInterval(stageTimer);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-xl backdrop-blur"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Brand"
          placeholder="e.g. Nature Made"
          value={brand}
          onChange={setBrand}
          required
        />
        <Field
          label="Product category"
          placeholder="e.g. magnesium supplement for seniors"
          value={category}
          onChange={setCategory}
          required
        />
      </div>
      <Field
        label="Competitors (optional)"
        placeholder="comma-separated: Thorne, Pure Encapsulations, NOW Foods"
        value={competitors}
        onChange={setCompetitors}
      />

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-zinc-500">
          Runs ~8-10 queries × 3 models. Takes 30-90s.
        </p>
        <button
          type="submit"
          disabled={loading || !brand || !category}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
        >
          {loading ? "Running diagnostic..." : "Run diagnostic"}
        </button>
      </div>

      {loading && (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-400">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span>{STAGES[stageIndex]}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  required,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </label>
  );
}
