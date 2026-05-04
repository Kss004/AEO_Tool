import { InputForm } from "@/components/InputForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-16">
      <header className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400/80">
          AEO Diagnostic
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          How does your brand rank when shoppers
          <br />
          ask AI?
        </h1>
        <p className="max-w-2xl text-zinc-400">
          Enter a brand and product category. We generate the queries a real
          shopper would type, fan them out across GPT-5.5, Gemini 2.5 Flash, and
          Gemma 4, and produce a report card showing where you win, tie, or get
          ignored.
        </p>
      </header>

      <InputForm />

      <div className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-zinc-950/40 px-5 py-4 text-sm text-zinc-400">
        <span>
          Don&apos;t want to wait for a live run?{" "}
          <span className="text-zinc-500">
            See a pre-recorded sample diagnostic.
          </span>
        </span>
        <a
          href="/demo"
          className="rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-1.5 text-emerald-300 transition hover:bg-emerald-900/40"
        >
          Try sample →
        </a>
      </div>

      <footer className="border-t border-zinc-900 pt-6 text-xs text-zinc-500">
        Built for the Pixii take-home. APIs: OpenAI, Groq, Vercel Blob, Tavily.
      </footer>
    </main>
  );
}
