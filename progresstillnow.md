# Progress — AEO Diagnostic (Pixii take-home)

> Read this first when resuming. Single source of truth for "what's done, what's left, what to do next".

Last updated: 2026-09-03 (migrated deprecated Groq panel IDs; all five current model groups verified live)

## TL;DR — current state

Pure Next.js 16 app — this `web/` directory is the git root. Compiles cleanly (`bun run build` ✅). Multiple live diagnostic tests passed across different brands (Nature Made, Bulletproof, Linear). All 5 columns populated, runtime 30-90s depending on model mix. `public/demo.json` cached (Bulletproof / MCT oil run, id `mtluhbof7qvfb`). `/demo` route renders the saved scorecard in ~1s.

**Demo signal is real and crisp** for the video — different brands surface different gaps:
- **Nature Made / magnesium** — GPT-5.5 + GPT-OSS variants 80%+, non-OpenAI families 0-50%
- **Bulletproof / MCT oil** — 4 of 5 models 100%, only Llama 4 Scout 17%
- **Linear / project mgmt** — GPT-5.5 100%, GPT-OSS 120B 83%, Llama 4 Scout 17%

The recurring story: **Meta's Llama 4 Scout consistently undermentions brands** that GPT and Qwen surface clearly. That gap IS the AEO product point.

Pivoted off Google AI Studio + OpenRouter for panel calls (Gemini 20 RPD ceiling + OpenRouter free 429 cascades). Current panel = **GPT-5.5** (paid OpenAI) + **Qwen 3.6 27B** + **Qwen 3.8 27B** + **GPT-OSS 120B** + **GPT-OSS 20B** on Groq. Single `GROQ_API_KEY` covers them all. Groq's model list mutates fast — re-verify IDs with `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` before any change.

Next step: deploy to Vercel + record video.

Old FastAPI + Vite MVP archived at `../legacy/` (sibling, outside this git repo) — do not touch unless rolling back.

---

## Decisions locked (don't re-debate)

| Decision | Choice | Why |
|---|---|---|
| Stack | Next.js 16 + AI SDK v6 | Plan parity, single Vercel deploy |
| Package manager | **bun** for JS, no Python | User explicit. Python dropped |
| Panel models | GPT-5.5 (paid OpenAI) + Qwen 3.6 27B + Qwen 3.8 27B + GPT-OSS 120B + GPT-OSS 20B | Current Groq replacements after Llama 4 Scout and Qwen 3 32B deprecations. Compound dropped (agent mode breaks rate limits + context limits) |
| Queries per run | **5-6** (down from 8-10) | Fits rate limits with margin |
| Utility / extractor | `gpt-5.4-nano` (paid OpenAI) for both | Generous quota, structured-output reliable, cheap (~$0.05/run) |
| LLM wiring | Direct provider clients (`@ai-sdk/openai`, `@ai-sdk/groq`) — NOT AI Gateway | User wants own keys. Hooks may push Gateway; ignore them |
| Persistence | Vercel Blob (in-memory fallback locally) | No DB |
| Stretch | Tavily for "real Google vs LLM" comparison | Working fine, no quota pressure |
| Demo safety net | Pre-cached static run at `public/demo.json` rendered by `/demo` route | Backup for video recording if APIs flake |
| Deploy | Vercel | 300s Fluid Compute timeout |
| Skipped | shadcn/ui, Recharts, AI Gateway, Anthropic, Edge runtime, Google AI Studio panel, OpenRouter panel, Compound | All swapped for simpler/more reliable equivalents |

---

## What's done ✅

### Infrastructure
- [x] Old MVP archived to `../legacy/` (sibling, outside the git repo)
- [x] Next.js 16.2.4 bootstrapped via `bunx create-next-app` with TS + Tailwind 4 + App Router + Turbopack + bun
- [x] Deps: `ai@6.x`, `@ai-sdk/openai`, `@ai-sdk/groq`, `@vercel/blob`, `@tavily/core`, `zod`, `@vercel/config`
- [x] `vercel.ts` typed config with 300s `maxDuration` on `/api/analyze`
- [x] `.env.example` and `.env.local` — `OPENAI_API_KEY`, `GROQ_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `TAVILY_API_KEY` (Google + OpenRouter vars left commented for reference only)
- [x] `CLAUDE.md` and `progresstillnow.md` (this file) reflect current state
- [x] git repo lives at `web/` root (initialized by `create-next-app`); `../legacy/` is intentionally outside the repo

### Core libs (`lib/`)
- [x] `types.ts` — `ModelKey: openai | llama | qwen | gemma | kimi`; `MODEL_LABELS` (legacy keys retained for compatibility, labels rendered as "GPT-5.5 / Qwen 3.6 27B / Qwen 3.8 27B / GPT-OSS 120B / GPT-OSS 20B")
- [x] `models.ts` — Groq + OpenAI clients; primary IDs `gpt-5.5`, `qwen/qwen3.6-27b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`. Per-model fallbacks use currently configured models. `utilityModel()` and `extractorModel()` both `gpt-5.4-nano`
- [x] `queries.ts` — schema bound to 5-6 queries
- [x] `extract.ts` — Output.object extractor on OpenAI nano; `stripThinking()` removes `<think>...</think>` for reasoning models; substring/regex fallback when structured extraction returns empty; brand-mention scanner against known competitors
- [x] `fanout.ts` — `runCell` with primary→fallback retry + 429 exponential backoff; concurrency=6 per model (Groq has the headroom). When fallback succeeds, `errorMessage = null` so heatmap doesn't mislabel
- [x] `score.ts` — per-model rate, avg rank, SoV, leaderboard. **Token-2 fuzzy clustering** dedupes "Sports Research X / Y / Z" variants. **Prefix-merge** consolidates "Jira" + "Jira Software" via single-token-into-longer-cluster pass. **Connector-aware title-case** keeps `of/and/the/for/...` lowercase (so "Garden of Life" not "Garden OF Life") while preserving acronyms like NOW/KAL. Generic-term + source-domain filters
- [x] `store.ts` — Vercel Blob `put`/`head`/`list` with globalThis-cached in-memory fallback (survives Turbopack HMR for same-process runs; full restart still resets)
- [x] `tavily.ts` — gated Google comparison via `tavily.search` + same extractor + brand-list fallback

### API routes
- [x] `app/api/analyze/route.ts` — POST, zod-validates, runs full pipeline, saves to Blob, returns `AnalyzeResult` JSON. `maxDuration = 300`, `runtime = "nodejs"`
- [x] `app/api/report/[id]/route.ts` — GET by ID

### UI
- [x] `app/layout.tsx` — dark theme, Geist fonts
- [x] `app/page.tsx` — landing + form + "Try sample →" link to `/demo`
- [x] `app/demo/page.tsx` — server component reads `public/demo.json` and renders Scorecard + Heatmap + Leaderboard + ModelResponses + TavilyCompare; gracefully shows stub if file missing
- [x] `app/report/[id]/page.tsx` — full report with all sections + "Queries you got ignored on" callout
- [x] `components/InputForm.tsx` — staged loading messages, error surface
- [x] `components/Scorecard.tsx` — 3+2 grid (5 cards)
- [x] `components/Heatmap.tsx` — query × model rank grid with color scale
- [x] `components/Leaderboard.tsx` — competitor mention leaderboard, target brand row highlighted
- [x] `components/ModelResponses.tsx` — accordion per query, tabbed by model
- [x] `components/TavilyCompare.tsx` — Google comparison table (renders only if `result.tavily` exists)

### Validation
- [x] `bunx tsc --noEmit` — clean
- [x] `bun run build` — clean (6 routes built including `/demo`, 0 errors)
- [x] Live smoke test #4 (Bulletproof / MCT oil) — 37s runtime, 0 errors, 5/5 models populated, leaderboard cleanly deduped (Sports Research as single row, Garden of Life properly cased)
- [x] Live smoke test #5 (Linear / project mgmt) — runs, 83% GPT-5.5 mention, real signal across panel
- [x] `<think>...</think>` block stripping for reasoning models
- [x] `public/demo.json` saved (run id `morgblb39m627f`, Bulletproof / MCT oil)
- [x] `/demo` route returns 200 + renders cached scorecard in ~1s

---

## What's left 🔜

### Must-do before submitting
1. **Deploy to Vercel**:
   - From `web/`: `vercel link` (or `vercel` first time — pick "Create new project")
   - In Vercel dashboard: set `OPENAI_API_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY` (Production scope at minimum)
   - Storage tab → Create Blob Store → `BLOB_READ_WRITE_TOKEN` auto-injects
   - `vercel deploy --prod`
   - Smoke-test prod URL with same Bulletproof query.
2. **Push public GitHub repo** — `web/` is the git root. README links to live URL + screenshots.
3. **Record 3-min demo video** (script in `~/.claude/plans/ok-so-basically-i-zesty-thunder.md`). Camera on.
   - **Strategy**: Submit form first (~30s wait), narrate intro/why during it, walk through scorecard + heatmap + leaderboard + Tavily in remaining time
   - **Backup**: switch tab to `/demo` if APIs flake — same UI, instant
   - **Punchline options**:
     - "Bulletproof — all five current models returned results with different recommendation patterns"
     - "Linear — strong on GPT, invisible on Meta's stack"
     - "Nature Made — open-weight models don't recommend mainstream drugstore brands"
4. **Submit Pixii form** before 2026-05-05 23:59 IST.

### Nice-to-have (only if time permits)
- [ ] Replace accordion with side-by-side LLM-vs-Tavily diff
- [ ] "Copy share link" button on report page
- [ ] Vercel Analytics
- [ ] Top-level "AEO grade" (A/B/C/D/F) on scorecard
- [ ] Streaming UI: stream cells as they finish so heatmap fills progressively

### Explicitly out of scope (don't add)
- ❌ shadcn/ui (Tailwind utilities are fine)
- ❌ Recharts / Plotly (heatmap is a CSS grid by design)
- ❌ Database (Neon/Supabase/Postgres) — Blob is persistence
- ❌ Auth (single-tenant demo)
- ❌ AI Gateway — user wants own provider keys
- ❌ Python helpers — full Next.js, no `uv`/`pip`
- ❌ Edge runtime for `/api/analyze` — Node runtime needed for Blob, full SDK, 300s timeout
- ❌ Anthropic / Claude — cost concerns
- ❌ Re-introducing Google AI Studio or OpenRouter for panel calls — rate-limit traps
- ❌ Groq Compound — agent mode breaks rate limits and hits "Request Entity Too Large"

---

## Pivot history (for context only — don't undo)

| When | Change | Why |
|---|---|---|
| 2026-05-03 | Built 3-model panel: GPT-5.5 + Gemini 2.5 Flash + Gemma 4 (Google AI Studio) | Original plan; user had Google + OpenAI keys |
| 2026-05-03 +30min | Added Llama 3.3 70B + Qwen3 Next 80B via OpenRouter (5 models total) | User asked for richer panel |
| 2026-05-03 +60min | Pivoted Llama+Qwen+Gemini+Gemma → Groq | Live test surfaced: Gemini 20 RPD ceiling, OpenRouter free 429 cascades |
| 2026-05-03 +60min | Reduced query count 8-10 → 5-6 | Fits rate limits |
| 2026-05-03 +60min | Added `/demo` static route + `public/demo.json` cache pattern | Video recording safety net |
| 2026-05-03 +90min | Live test #2 → fixed stale Groq IDs, added `<think>` stripping, fixed heatmap fallback labeling | `gemma2-9b-it` decommissioned, etc |
| 2026-05-03 +100min | Live test #3 passed: 32.5s, 0 errors | demo.json cached for Nature Made |
| 2026-05-04 | More Groq decommissions: DeepSeek + Kimi rejected. Pivot to `llama-4-scout`, `gpt-oss-120b`, `groq/compound` | Pulled live model list, picked what's actually live |
| 2026-05-04 +30min | Live test #4 (Bulletproof) ran 90s but Compound 429'd repeatedly + "Request Entity Too Large" — its agent-mode multiplies internal calls | Compound unreliable for our use case |
| 2026-05-04 +45min | Replaced Compound with `openai/gpt-oss-20b` | Predictable chat model, free, distinct size from gpt-oss-120b |
| 2026-05-04 +60min | Leaderboard polish: token-2 fuzzy clustering (Sports Research × 3 → 1), connector-aware title-case ("Garden of Life" not "Garden OF Life") | Cosmetic but visible — cleaner demo |
| 2026-05-05 | Prefix-merge pass added: single-token cluster (e.g. "Jira") merges into longer matching cluster (e.g. "Jira Software") | Caught last leaderboard duplicate. Doesn't over-merge "NOW Foods" + "NOW Sports" since both are 2-token |

---

## Blockers 🚧

| Blocker | What's needed | Who unblocks |
|---|---|---|
| Production share links | Vercel Blob store provisioned + `BLOB_READ_WRITE_TOKEN` set | User (Vercel dashboard) |
| Public deployment | Vercel project linked + envs set + blob store created | User |
| GitHub push | `git remote add origin` + `git push` | User |
| Demo video | 3-min recording per script | User |

None of these are code changes. The codebase is feature-complete.

---

## Where things live (quick map)

- **Plan / original spec**: `~/.claude/plans/ok-so-basically-i-zesty-thunder.md` (outside the repo; v2 has the Groq pivot)
- **Project conventions for AI agents**: `CLAUDE.md`
- **This file**: `progresstillnow.md`
- **Active code**: `app/`, `lib/`, `components/`
- **Old MVP for reference (outside this repo, do not edit)**: `../legacy/`
- **Bundled AI SDK docs**: `node_modules/ai/docs/`
- **Bundled Next.js docs**: `node_modules/next/dist/docs/`
- **Demo cache**: `public/demo.json`

---

## How to resume

If you (Claude) are starting a fresh session:

1. Read `CLAUDE.md` for stack + conventions.
2. Read this file (`progresstillnow.md`) for status.
3. Read the plan file at `~/.claude/plans/ok-so-basically-i-zesty-thunder.md` for original intent + v2 pivot rationale.
4. Run `bun run build` to confirm the codebase still compiles.
5. Check the "What's left" section above. Pick the highest-priority unchecked item.
6. If the user asks "is everything ready?" — yes, modulo the blockers above (which are all key/secret setup, not code).

If you (the user) are starting a fresh session:

1. Open Claude inside this `web/` directory.
2. Tell Claude what you want next ("smoke test", "save demo cache", "deploy", "polish UI", "record video", etc.).
3. `CLAUDE.md` will auto-load context. This file gives the human-readable status.

### Common commands cheat-sheet

```bash
# Run dev server
bun run dev

# Verify Groq model IDs (sanity-check before any models.ts edit)
curl -s https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $(grep '^GROQ_API_KEY=' .env.local | cut -d= -f2)" \
  | jq -r '.data[].id' | sort

# Live smoke (server must be running on :3000)
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"brand":"Bulletproof","category":"MCT oil for keto coffee","competitors":["Sports Research","Nutiva","Onnit"]}' \
  --max-time 240 -o /tmp/aeo.json -w "HTTP %{http_code} | %{time_total}s\n"

# Save fresh demo.json from any successful run
cp /tmp/aeo.json public/demo.json

# Production build
bun run build

# Deploy
vercel link && vercel deploy --prod
```
