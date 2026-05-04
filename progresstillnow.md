# Progress — AEO Diagnostic (Pixii take-home)

> Read this first when resuming. It is the single source of truth for "what's done, what's left, what to do next".

Last updated: 2026-05-04 (Groq model IDs refreshed after another decommission round; live run validated; demo.json regenerated)

## TL;DR — current state

Pure Next.js 16 app — this `web/` directory is the git root. Compiles cleanly (`bun run build` ✅). Live diagnostic test passed in **32.5 seconds** with **zero `err` cells** across all 5 panel models. `public/demo.json` saved. `/demo` route renders the cached scorecard instantly.

**The demo insight is real and surprising** (perfect for the video): OpenAI (GPT-5.5) mentions "Nature Made" in 83% of buyer queries with avg rank #4.2; Qwen 17%; Llama 3.3 70B / DeepSeek R1 70B / Kimi K2 = **0%** — the open-weight models simply don't recommend mainstream drugstore brands. That gap IS the product's value proposition.

Pivoted off Google AI Studio + OpenRouter for panel calls (Gemini 20 RPD ceiling + OpenRouter free 429 cascades made repeated demos impossible). Current 5-model panel: **GPT-5.5** (paid OpenAI) + **Llama 4 Scout** + **Qwen 3 32B** + **GPT-OSS 120B** + **Groq Compound** (last 4 all on Groq free tier). Single `GROQ_API_KEY` covers them all. Groq's free-tier model list mutates fast — re-verify IDs with `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` before any change.

Next step: deploy to Vercel + record video.

Old FastAPI + Vite MVP archived at `../legacy/` (one level up, outside this git repo) — do not touch unless rolling back.

---

## Decisions locked (don't re-debate)

| Decision | Choice | Why |
|---|---|---|
| Stack | Next.js 16 + AI SDK v6 | Plan parity, single Vercel deploy |
| Package manager | **bun** for JS, no Python | User explicitly asked for bun. Python dropped |
| Panel models | GPT-5.5 (paid OpenAI) + Llama 4 Maverick + Qwen 3 32B + Gemma 2 9B + Kimi K2 (all Groq free) | Replaces previous Gemini/Gemma/Llama/Qwen mix. Killed Google + OpenRouter due to rate limits. Same panel size (5), better reliability |
| Queries per run | **5-6** (down from 8-10) | Fits all rate-limit ceilings with headroom |
| Utility / extractor | `gpt-5.4-nano` (paid OpenAI) for both | Generous quota, structured-output reliable, cheap (~$0.05/run) |
| LLM wiring | Direct provider clients (`@ai-sdk/openai`, `@ai-sdk/groq`) — NOT AI Gateway | User wants own keys. Hooks may push Gateway; ignore them |
| Persistence | Vercel Blob (in-memory fallback locally) | No DB |
| Stretch | Tavily for "real Google vs LLM" comparison | Working fine, no quota pressure |
| Demo safety net | Pre-cached static run at `public/demo.json` rendered by `/demo` route | Backup for video recording if APIs flake |
| Deploy | Vercel | 300s Fluid Compute timeout |
| Skipped | shadcn/ui, Recharts, AI Gateway, Anthropic, Edge runtime, Google AI Studio panel, OpenRouter panel | All swapped for simpler/more reliable equivalents |

---

## What's done ✅

### Infrastructure
- [x] Old MVP (`backend/` FastAPI + `frontend/` Vite) moved to `../legacy/` (sibling, outside the git repo)
- [x] New Next.js 16.2.4 project bootstrapped here via `bunx create-next-app` with TS + Tailwind 4 + App Router + Turbopack + bun
- [x] Deps: `ai`, `@ai-sdk/openai`, `@ai-sdk/groq`, `@vercel/blob`, `@tavily/core`, `zod`, `@vercel/config`
- [x] Removed deps from earlier mistakes: `@ai-sdk/google`, `@openrouter/ai-sdk-provider`
- [x] `vercel.ts` typed config with 300s `maxDuration` on `/api/analyze`
- [x] `.env.example` and `.env.local` placeholders (Google + OpenRouter vars left commented for reference)
- [x] `CLAUDE.md` updated for Groq pivot
- [x] `progresstillnow.md` updated (this file)
- [x] git repo lives at `web/` root (`.git` already initialized by `create-next-app`); `../legacy/` is intentionally outside the repo

### Core libs (`lib/`)
- [x] `types.ts` — 5-model `ModelKey`: `openai | llama | qwen | gemma | kimi`; `MODEL_LABELS` updated
- [x] `models.ts` — Groq client + OpenAI client; Llama 4 Maverick / Qwen 3 32B / Gemma 2 9B / Kimi K2 primary IDs with smaller-Groq fallbacks; `utilityModel()` and `extractorModel()` both on `gpt-5.4-nano`
- [x] `queries.ts` — schema bound to 5-6 queries (down from 6-10)
- [x] `extract.ts` — Output.object extractor on OpenAI nano, regex/substring fallback, brand-mention scanner
- [x] `fanout.ts` — `runCell` with primary→fallback retry + 429 exponential backoff; concurrency=6 per model (Groq has the headroom)
- [x] `score.ts` — per-model rate, avg rank, SoV, leaderboard with case-insensitive dedupe + fuzzy merge + generic-term filter + source-domain filter, heatmap helpers
- [x] `store.ts` — Vercel Blob `put`/`head`/`list` with globalThis-cached in-memory fallback (survives Turbopack HMR)
- [x] `tavily.ts` — gated Google comparison via `tavily.search` + same extractor + brand-list fallback

### API routes
- [x] `app/api/analyze/route.ts` — POST, zod-validates, runs full pipeline, saves to Blob, returns `AnalyzeResult` JSON
- [x] `app/api/report/[id]/route.ts` — GET by ID

### UI
- [x] `app/layout.tsx` — dark theme, Geist fonts
- [x] `app/page.tsx` — landing + form + "Try sample →" link to `/demo`
- [x] `app/demo/page.tsx` — server-component sample-run viewer; loads `public/demo.json` or shows "no cached demo yet" stub
- [x] `app/report/[id]/page.tsx` — full report
- [x] `components/InputForm.tsx` — staged loading messages, error surface
- [x] `components/Scorecard.tsx`, `Heatmap.tsx`, `Leaderboard.tsx`, `ModelResponses.tsx`, `TavilyCompare.tsx`

### Validation
- [x] `bunx tsc --noEmit` — clean (was clean throughout)
- [x] `bun run build` — clean (6 routes built including `/demo`, 0 errors)
- [x] Live smoke test on Groq panel — 32.5s, 0 errors, all 5 columns return non-empty text, mention extraction working
- [x] `<think>...</think>` block stripping for reasoning models (Qwen, DeepSeek)
- [x] `public/demo.json` saved (run id `moq0wreys9bxqf`, 6 queries × 5 models = 30 cells)
- [x] `/demo` route returns 200 and renders the cached scorecard

---

## What's left 🔜

### Must-do before submitting
1. **Deploy to Vercel**:
   - `vercel link` (or `vercel` first time — pick "Create new project")
   - Set `OPENAI_API_KEY`, `GROQ_API_KEY`, `TAVILY_API_KEY` in dashboard (Production scope)
   - Provision Vercel Blob store from Storage tab → `BLOB_READ_WRITE_TOKEN` auto-injects
   - `vercel deploy --prod`
   - Smoke-test the prod URL with the same query.
2. **Push public GitHub repo** (this `web/` directory is the repo root). README links to live URL + screenshots.
3. **Record 3-min demo video** (script in `~/.claude/plans/ok-so-basically-i-zesty-thunder.md`). Camera on.
   - **Open with the AEO insight**: paste "Nature Made" / "magnesium supplement for seniors" → show GPT ranks me #4 but Llama/DeepSeek/Kimi don't mention me at all. That's the product.
   - **Backup plan**: if APIs flake mid-recording, switch tab to `/demo` — same UI, instant render.
4. **Submit Pixii form** before 2026-05-05 23:59 IST.

### Nice-to-have (only if time permits)
- [ ] Replace accordion with side-by-side LLM-vs-Tavily diff (better demo signal)
- [ ] "Copy share link" button on report page
- [ ] Vercel Analytics (`@vercel/analytics` — single import)
- [ ] Top-level "AEO grade" (A/B/C/D/F) on scorecard for shareable bragging-rights
- [ ] Streaming UI: stream cells as they finish so user sees progressive heatmap fill

### Explicitly out of scope (don't add)
- ❌ shadcn/ui (Tailwind utilities are fine for this scope)
- ❌ Recharts / Plotly (heatmap is a CSS grid by design)
- ❌ Database (Neon/Supabase/Postgres) — Blob is the persistence layer
- ❌ Auth (Clerk/NextAuth) — single-tenant demo
- ❌ AI Gateway — user wants own provider keys
- ❌ Python helpers — full Next.js, no `uv`/`pip`
- ❌ Edge runtime for `/api/analyze` — Node runtime needed for `@vercel/blob`, full SDK support, 300s timeout
- ❌ Anthropic / Claude — cost concerns; user wants free-tier-friendly stack
- ❌ Re-introducing Google AI Studio or OpenRouter for panel calls — they're rate-limit traps for repeated demos

---

## Pivot history (for context only — don't undo)

| When | Change | Why |
|---|---|---|
| 2026-05-03 (initial) | Built 3-model panel: GPT-5.5 + Gemini 2.5 Flash + Gemma 4 (Google AI Studio) | Original plan; user had Google + OpenAI keys |
| 2026-05-03 +30min | Added Llama 3.3 70B + Qwen3 Next 80B via OpenRouter (5 models total) | User asked for richer panel via OpenRouter free models |
| 2026-05-03 +60min | Pivoted Llama+Qwen+Gemini+Gemma → Groq (4 models on Groq, GPT-5.5 stays on OpenAI) | Live test surfaced: Gemini 20 RPD ceiling, OpenRouter free 429 cascades; demos couldn't repeat |
| 2026-05-03 +60min | Reduced query count 8-10 → 5-6 | Fits rate limits with margin |
| 2026-05-03 +60min | Added `/demo` static route + `public/demo.json` cache pattern | Video-recording safety net |
| 2026-05-03 +90min | Live test #2 found 3 issues: stale Groq model IDs (`gemma2-9b-it` decommissioned, `llama-4-maverick-...` and `kimi-k2-instruct` rejected), `<think>` blocks confusing extractor on Qwen, heatmap mislabeling fallback-used cells as `err` | Fixed: Llama → `llama-3.3-70b-versatile`, Gemma → `deepseek-r1-distill-llama-70b` (renamed UI label to "DeepSeek R1 70B"), Kimi → `moonshotai/kimi-k2-instruct` (correct prefix); added `stripThinking()` to remove reasoning blocks before extraction; `callWithFallback` no longer sets `errorMessage` when fallback succeeds |
| 2026-05-03 +100min | Live test #3 passed: 32.5s runtime, 0 errors, full 5×6 panel populated, real AEO signal visible | `public/demo.json` cached |
| 2026-05-04 | More Groq decommissions: `deepseek-r1-distill-llama-70b` and `moonshotai/kimi-k2-instruct` both rejected on user's account. Re-pulled live model list — settled on `meta-llama/llama-4-scout-17b-16e-instruct`, `openai/gpt-oss-120b`, `groq/compound` for new panel slots. Labels updated to match. demo.json regenerated. Live test #4 ran 97s, 0 errors, 0 missed queries — bottleneck is gpt-5.5 panel calls at 31s/call avg | OpenAI premium column slowest by an order of magnitude vs Groq columns; livestream demo strategy = trigger run during 15s intro to overlap latency, or use `/demo` route as backup |

---

## Blockers 🚧

| Blocker | What's needed | Who unblocks |
|---|---|---|
| Production share links | Vercel Blob store provisioned + `BLOB_READ_WRITE_TOKEN` set | User (in Vercel dashboard) |
| Public deployment | Vercel project linked + envs set + blob store created | User |
| GitHub push | `git remote add origin` + `git push` | User |
| Demo video | 3-min recording per script | User |

None of these are code changes. The codebase is feature-complete.

---

## Where things live (quick map)

- **Plan / original spec**: `~/.claude/plans/ok-so-basically-i-zesty-thunder.md` (lives outside the repo; v2 has the Groq pivot)
- **Project conventions for AI agents**: `CLAUDE.md`
- **This file**: `progresstillnow.md`
- **Active code**: `app/`, `lib/`, `components/`
- **Old MVP for reference (outside this repo, do not edit)**: `../legacy/`
- **Bundled AI SDK docs**: `node_modules/ai/docs/`
- **Bundled Next.js docs**: `node_modules/next/dist/docs/`
- **Demo cache target**: `public/demo.json` (created after first live run)

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
