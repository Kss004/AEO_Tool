# AEO Diagnostic

> See how your brand ranks across GPT-5.5, Gemini 2.5 Flash, and Gemma 4 when shoppers ask AI for product recommendations. Built for the Pixii take-home.

Paste a brand + product category → app generates the queries a real shopper would type → fans them out across three different LLMs in parallel → extracts brand mentions and rank positions → renders a scorecard, heatmap, and competitor leaderboard. Optional Tavily integration shows how the LLM rankings compare to real Google results.

## Quick start

```bash
cd web
cp .env.example .env.local        # then fill in keys
bun install
bun run dev                       # http://localhost:3000
```

Required keys: `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`. Optional: `TAVILY_API_KEY` (Google comparison stretch), `BLOB_READ_WRITE_TOKEN` (share links — auto-set on Vercel).

## What's where

| Path                 | What                                                |
| -------------------- | --------------------------------------------------- |
| `web/`               | Active Next.js 16 app — work here                   |
| `legacy/`            | Original FastAPI + Vite MVP — archived, do not edit |
| `CLAUDE.md`          | Project conventions for AI agents                   |
| `progresstillnow.md` | Live status: done / left / blocked                  |

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · AI SDK v6 (`@ai-sdk/openai`, `@ai-sdk/google`) · Vercel Blob · Tavily · bun · zod.

No Python. Direct provider clients (not AI Gateway). Vercel Fluid Compute (300s timeout) for the analyze pipeline.

## APIs Used

1. **OpenAI** — GPT-5.5
2. **Google AI Studio** — Gemini 2.5 Flash + Gemma 4 31B (one key, two models)
3. **Vercel Blob** — share-link persistence
4. **Tavily** — Google reality-check (optional)

## Deploy

```bash
cd web
vercel link
# set OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, TAVILY_API_KEY in dashboard
# provision Vercel Blob store (Storage tab) — BLOB_READ_WRITE_TOKEN auto-injected
vercel deploy --prod
```
