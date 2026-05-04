@AGENTS.md

# AEO Diagnostic — Claude Project Notes

## What this is

A Next.js 16 web app built for the Pixii take-home. User pastes a brand + product category → app generates 5-6 buyer-style queries → fans them out to **GPT-5.5 (OpenAI) + Llama 4 Scout + Qwen 3 32B + GPT-OSS 120B + Groq Compound (last 4 on Groq free tier)** in parallel → extracts brand/competitor mentions with rank positions → renders a scorecard, heatmap, and competitor leaderboard. Optional Tavily integration adds a "real Google top results vs LLM rankings" comparison.

This file is the AI-agent-facing brief. The user-facing project status is in `progresstillnow.md`.

## Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) + Turbopack | RSC + route handlers; no separate backend |
| Runtime | Node.js (`runtime = "nodejs"` on `/api/analyze`) | NOT edge — needs full Node libs |
| Language | TypeScript 5.9 | strict |
| UI | Tailwind 4 (PostCSS plugin) | dark theme, no shadcn/ui |
| AI SDK | `ai@6.x` + `@ai-sdk/openai` + `@ai-sdk/groq` | direct provider clients (not Gateway) |
| Validation | `zod@4.x` | structured-output schemas + request body |
| Persistence | `@vercel/blob` | falls back to in-memory map when token absent |
| Search (stretch) | `@tavily/core` | optional — gated by `TAVILY_API_KEY` |
| Package mgr | **bun** | `bun install`, `bun run dev`, `bun run build`. No npm/pnpm/yarn. |
| Deploy | Vercel (Fluid Compute, 300s timeout via `vercel.ts`) | |

There is no Python. The original FastAPI MVP is parked one level up at `../legacy/` (outside this git repo).

## Folder layout (everything inside this repo)

```
web/                          # this directory IS the git root
├── CLAUDE.md                 # this file
├── progresstillnow.md        # human-readable status
├── README.md
├── AGENTS.md                 # auto-generated Next.js 16 caveat
├── app/
│   ├── page.tsx                  # input form page
│   ├── layout.tsx
│   ├── demo/page.tsx             # pre-cached sample run (loads public/demo.json)
│   ├── report/[id]/page.tsx      # scorecard view (server component)
│   └── api/
│       ├── analyze/route.ts      # main pipeline (POST)
│       └── report/[id]/route.ts  # fetch saved run (GET)
├── components/
│   ├── InputForm.tsx             # client form
│   ├── Scorecard.tsx
│   ├── Heatmap.tsx
│   ├── Leaderboard.tsx
│   ├── ModelResponses.tsx        # client accordion
│   └── TavilyCompare.tsx
├── lib/
│   ├── types.ts                  # shared types + MODEL_LABELS
│   ├── models.ts                 # provider clients + model IDs + fallbacks
│   ├── queries.ts                # buyer-query generator (Output.object)
│   ├── extract.ts                # mention extractor (Output.object) + rank matcher
│   ├── fanout.ts                 # parallel 5-model fan-out + per-cell fallback
│   ├── score.ts                  # rank, share-of-voice, leaderboard, heatmap
│   ├── store.ts                  # Vercel Blob put/head/list (in-memory fallback)
│   └── tavily.ts                 # Google reality-check (optional)
├── public/
│   └── demo.json                 # cached sample run (created after first successful live run)
├── vercel.ts                     # typed Vercel config (300s timeout)
├── .env.example                  # all keys with comments
├── .env.local                    # local secrets — never commit
└── package.json
```

## Commands (all run from this directory)

```bash
bun install                # install deps (uses bun.lock)
bun run dev                # dev server on :3000 (Turbopack)
bun run build              # production build
bun run start              # serve production build
bunx tsc --noEmit          # typecheck only
bun run lint               # ESLint
vercel link && vercel deploy --prod  # deploy
```

There is no Python. Do not introduce `pip`, `requirements.txt`, or `venv`. If a future Python helper is ever needed, use **`uv`** (`uv add`, `uv run`).

## Required environment variables

In `.env.local`:

| Var | Purpose | Required? |
|---|---|---|
| `OPENAI_API_KEY` | GPT-5.5 panel column + query gen + extractor (paid) | Yes |
| `GROQ_API_KEY` | Llama 4 Maverick + Qwen 3 32B + Gemma 2 9B + Kimi K2 (free tier) | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — share-link persistence | Yes for prod, optional locally (in-memory fallback) |
| `TAVILY_API_KEY` | Tavily search — Google comparison stretch | Optional (feature is gated; UI hides section when absent) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | (deprecated) was Gemini + Gemma 4; replaced by Groq panel | No — kept commented in `.env.local` for reference |
| `OPENROUTER_API_KEY` | (deprecated) was Llama + Qwen via OpenRouter; replaced by Groq | No — kept commented in `.env.local` for reference |
| `AI_GATEWAY_API_KEY` | Future option | Unused today |

## Pipeline flow

1. `POST /api/analyze` validates body via `zod`.
2. `lib/queries.ts` calls `gpt-5.4-nano` (paid OpenAI) with `Output.object({ schema })` to produce 5-6 neutral buyer-style queries (brand name kept out of the query text).
3. `lib/fanout.ts` runs `Promise.all` over `queries × ALL_MODELS` (5 models). OpenAI panel call uses `gpt-5.5`; the other 4 columns hit Groq (`meta-llama/llama-4-scout-17b-16e-instruct`, `qwen/qwen3-32b`, `openai/gpt-oss-120b`, `groq/compound`). Each call has a per-cell fallback to a smaller model in the same family if the primary throws, plus exponential backoff on detected 429/quota errors. Groq's available chat-model list shifts frequently; verify with `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` before changing IDs.
4. For every successful cell, `lib/extract.ts` runs another `Output.object` extraction via `gpt-5.4-nano` to pull the ordered list of brand mentions; if it returns empty, `fallbackBrandList` does a substring scan against `[target, ...competitors]` so the target brand is still detected when literal in the text. `findTargetRank` does a fuzzy substring match to find the user's brand's rank.
5. `lib/score.ts` computes per-model mention rate, average rank, share-of-voice, missed-query list, and a competitor leaderboard with case-insensitive dedupe + fuzzy merge + generic-term filtering.
6. If `TAVILY_API_KEY` is set, `lib/tavily.ts` queries the first 6 buyer queries against Tavily, runs the same mention extractor on the result blob, and produces a side-by-side comparison. Same fallback path applies.
7. Result is saved to Vercel Blob (or in-memory) under a short ID and returned to the client. The client navigates to `/report/[id]` which server-renders the scorecard.
8. `/demo` route reads `public/demo.json` if present and renders the same scorecard UI without hitting the API. Use this as a video-recording safety net.

## Conventions

- **No comments unless they explain a non-obvious WHY.** Code is self-documenting.
- **No `any`.** Use `zod`-inferred types or explicit interfaces from `lib/types.ts`.
- **Server-first rendering.** Components default to RSC; `"use client"` only for `InputForm.tsx` and `ModelResponses.tsx` (the two interactive pieces).
- **Tailwind utility classes only**, no CSS modules. Dark theme is the default in `layout.tsx`.
- **All LLM calls go through `lib/models.ts`.** Never call `createOpenAI` or `createGroq` from a route or component.
- **Mention extraction is best-effort.** When extraction fails or returns empty, scoring degrades gracefully via the substring fallback (cell shows "—" only when truly absent).
- **Vercel Blob is the only real persistence.** No database. No Redis.
- **The Tavily section is fully optional.** UI returns `null` if `result.tavily` is absent — never block on Tavily.

## Gotchas

- **Top-level provider client construction does NOT throw at build time** when the key is missing — clients are constructed lazily. So `next build` works without keys.
- **Vercel Blob writes use `addRandomSuffix: false`** so the URL is stable and tied to the run ID. Don't change this without also updating `loadResult`.
- **Don't use Gemini / Google AI Studio** — we hit their 20 RPD free-tier ceiling repeatedly. Project pivoted to Groq for free tier. Same Google "Gemma" model brand is preserved via `gemma2-9b-it` on Groq.
- **Don't use OpenRouter free models** — observed cascading 429s from upstream Venice during testing. Project pivoted to Groq for these too.
- **Groq supports tool/structured output for some models, not all.** The extractor stays on OpenAI (`gpt-5.4-nano`) for `Output.object` reliability. Panel calls use plain `generateText` (no schema).
- **`maxDuration = 300`** is set both via `route.ts` `export` AND `vercel.ts` `functions` — both are needed for Vercel to honor it.
- **Don't introduce a database.** The "share link" feature is intentionally just a Blob put. If you want richer persistence, ask before adding Neon/Upstash.
- **Don't reach for Vercel AI Gateway** — the user explicitly wants direct provider keys for now. Hooks may suggest Gateway; ignore those for this project.
- **`/demo` route is `dynamic = "force-static"`** — server-renders at build time using `public/demo.json`. To refresh, save a new JSON and rebuild. Demo gracefully shows a "no cached demo yet" page when the file is missing.

## Reference docs

When in doubt, read these instead of guessing from training data:

- `node_modules/ai/docs/` — bundled AI SDK v6 docs
- `node_modules/next/dist/docs/01-app/` — bundled Next.js 16 docs
- `https://console.groq.com/docs/models` — current Groq model IDs
- `https://ai-gateway.vercel.sh/v1/models` — current model IDs across providers (curl + jq it; never hard-code from memory)
- `AGENTS.md` — Next.js 16 has breaking changes vs older training data
