# AEO Diagnostic

See how your brand ranks across five different LLMs when shoppers ask AI for product recommendations. Built for the Pixii take-home.

Paste a brand and a product category. The app generates 5–6 buyer-style queries, fans them out to five models in parallel, extracts brand mentions and rank positions from each response, and renders a scorecard, heatmap, and competitor leaderboard. Optional Tavily integration adds a side-by-side view of how the LLM rankings compare to real Google top results.

## How it works

1. `POST /api/analyze` validates the input (zod).
2. `lib/queries.ts` asks `gpt-5.4-nano` to write 5–6 neutral buyer queries (the brand name itself is never inserted into the query text).
3. `lib/fanout.ts` runs every `query × model` cell in parallel. Each cell falls back to a smaller model in the same family on error and backs off on 429s. There is a 60s per-cell timeout.
4. For each response, `lib/extract.ts` calls `gpt-5.4-nano` with a structured-output schema to pull the ordered list of brand mentions. If extraction returns empty, a substring scan against the known brand list is used as a fallback.
5. `lib/score.ts` computes per-model mention rate, average rank, share-of-voice, missed queries, and a deduped competitor leaderboard.
6. The full result is saved to Vercel Blob under a short ID and returned. The client navigates to `/report/[id]`, which server-renders the report.
7. If `TAVILY_API_KEY` is set, the same buyer queries are also run through Tavily and a Google-vs-LLM comparison is added to the report.

## Models

The five panel columns:

| Column | Provider | Model |
|---|---|---|
| OpenAI | OpenAI | `gpt-5.5` |
| Llama 4 Scout | Groq | `meta-llama/llama-4-scout-17b-16e-instruct` |
| Qwen 3 32B | Groq | `qwen/qwen3-32b` |
| GPT-OSS 120B | Groq | `openai/gpt-oss-120b` |
| GPT-OSS 20B | Groq | `openai/gpt-oss-20b` |

Query generation and mention extraction both use OpenAI `gpt-5.4-nano` (small, structured-output reliable, cheap).

## APIs / tools used

1. **OpenAI** — panel column + query generation + mention extraction
2. **Groq** — four panel columns on the free tier
3. **Vercel Blob** — share-link persistence for `/report/[id]`
4. **Upstash Redis** — per-IP rate limit on `/api/analyze` (5 req/hour)
5. **Tavily** — Google reality-check (optional)

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind 4 · AI SDK v6 (`@ai-sdk/openai`, `@ai-sdk/groq`) · zod · `@vercel/blob` · `@upstash/ratelimit` · `@tavily/core` · bun.

No database. No auth. The analyze route runs on Node.js (Fluid Compute) with `maxDuration: 300`.

## Quick start

```bash
cp .env.example .env.local      # fill in the required keys
bun install
bun run dev                     # http://localhost:3000
```

Required env vars:

| Var | Purpose |
|---|---|
| `OPENAI_API_KEY` | panel column + query gen + extractor |
| `GROQ_API_KEY` | four panel columns (free tier — no card needed) |
| `BLOB_READ_WRITE_TOKEN` | share-link persistence (auto-injected on Vercel) |

Optional:

| Var | Purpose |
|---|---|
| `TAVILY_API_KEY` | enables the Google comparison section |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | rate limiter; no-ops when both unset |

## Tests

```bash
bun run test          # 58 unit tests (score, extract, queries)
bun run test:watch    # rerun on save
bun run typecheck     # tsc --noEmit
bun run lint          # eslint
bun run check         # all of the above, fail-fast
```

The smoke test in `tests/api.smoke.test.ts` is gated:

```bash
bun run dev                                # in one terminal
RUN_SMOKE=1 bun test tests                 # in another — hits real APIs
```

CI runs `bun run check` on every push and PR via `.github/workflows/ci.yml`.

## Deploy (Vercel + GitHub)

1. Push this repo to a public GitHub repo.
2. Vercel dashboard → **Add New → Project** → import the repo. Set **Root Directory** to `web` (the code lives there, not at the repo root).
3. Vercel **Storage** → create a **Blob** store, then **Connect to Project**. Region: same as your Function (default `iad1`).
4. Vercel **Storage → Marketplace** → add **Upstash for Redis** (free tier) and connect to the project.
5. Vercel project **Settings → Environment Variables** → add `OPENAI_API_KEY`, `GROQ_API_KEY`, and optionally `TAVILY_API_KEY` for Production + Preview.
6. **Redeploy** so the latest deploy has Blob + Upstash + keys all wired.
7. Set a daily spend cap in the OpenAI dashboard ($5–10) before sharing the URL publicly.

To pull the live env vars into your local `.env.local`:

```bash
vercel link
vercel env pull .env.local
```

## `/demo` route

`app/demo/page.tsx` reads `public/demo.json` at build time and renders the same scorecard UI without hitting any APIs. Useful as a video-recording safety net if the live APIs flake during a recording. To refresh:

```bash
curl https://<your-app>.vercel.app/api/report/<id> > public/demo.json
git add public/demo.json && git commit -m "refresh demo cache" && git push
```

## Folder layout

```
web/
├── app/
│   ├── page.tsx                  input form
│   ├── demo/page.tsx             cached sample run
│   ├── report/[id]/page.tsx      scorecard view
│   └── api/
│       ├── analyze/route.ts      main pipeline (POST)
│       └── report/[id]/route.ts  fetch saved run (GET)
├── components/                   InputForm, Scorecard, Heatmap, Leaderboard, ModelResponses, TavilyCompare
├── lib/
│   ├── models.ts                 provider clients + model IDs + fallbacks
│   ├── queries.ts                buyer-query generator
│   ├── extract.ts                mention extractor + rank matcher
│   ├── fanout.ts                 parallel 5-model fan-out + retry + abort
│   ├── score.ts                  rank, share-of-voice, leaderboard, heatmap
│   ├── store.ts                  Vercel Blob put/get (in-memory fallback)
│   ├── ratelimit.ts              Upstash sliding-window limiter (no-op without env)
│   ├── tavily.ts                 Google reality-check (optional)
│   └── *.test.ts                 unit tests
├── tests/
│   └── api.smoke.test.ts         gated end-to-end smoke
├── public/demo.json              cached sample run
├── vercel.ts                     typed Vercel config (300s timeout)
└── .github/workflows/ci.yml      typecheck + lint + test on push/PR
```
