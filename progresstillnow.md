# Progress — AEO Diagnostic (Pixii take-home)

> Read this first when resuming. It is the single source of truth for "what's done, what's left, what to do next".

Last updated: 2026-05-03 (build #1 finished, no API keys yet, deploy pending)

## TL;DR — current state

Pure Next.js 16 app — this `web/` directory is the git root. Compiles cleanly (`bun run build` ✅). All planned features wired end-to-end. Cannot fully verify until **API keys are pasted into `.env.local`**, `bun run dev` runs, and someone clicks through one diagnostic. After that, deploy to Vercel and record the demo video.

Old FastAPI + Vite MVP archived at `../legacy/` (one level up, outside this git repo) — do not touch unless rolling back.

---

## Decisions locked (don't re-debate)

| Decision | Choice | Why |
|---|---|---|
| Stack | Next.js 16 + AI SDK v6 (full rewrite) | Plan parity, single Vercel deploy, throws away old FastAPI MVP |
| Package manager | **bun** for JS, no Python | User explicitly asked for bun. Python dropped — no pip, no uv, no requirements.txt |
| Models | GPT-5.5 (OpenAI) + Gemini 2.5 Flash + Gemma 4 31B (both Google AI Studio, one key) | User has these keys; Anthropic dropped. Per-model fallback to nano/flash-2.0/26b on errors |
| LLM wiring | Direct provider clients (`@ai-sdk/openai`, `@ai-sdk/google`) — NOT AI Gateway | User wants their own keys in env. Skill hooks may push Gateway; ignore them |
| Persistence | Vercel Blob (with in-memory fallback locally) | No DB. Plan said simple share links; Blob is the cheapest path |
| Stretch | Tavily for "real Google vs LLM" comparison | Adds ≥1 more API to clear the "2+ APIs" rule with margin; gated by `TAVILY_API_KEY` |
| Deploy | Vercel | 300s Fluid Compute timeout = plenty for 8-10 queries × 3 models in parallel |
| Skipped | shadcn/ui, Recharts, AI Gateway, Anthropic, Edge runtime | All swapped for simpler equivalents to fit budget |

---

## What's done ✅

### Infrastructure
- [x] Old MVP (`backend/` FastAPI + `frontend/` Vite) moved to `../legacy/` (sibling of this directory, outside the git repo)
- [x] New Next.js 16.2.4 project bootstrapped here via `bunx create-next-app` with TS + Tailwind 4 + App Router + Turbopack + bun
- [x] Deps installed: `ai`, `@ai-sdk/openai`, `@ai-sdk/google`, `@vercel/blob`, `@tavily/core`, `zod`, `@vercel/config`
- [x] `vercel.ts` typed config with 300s `maxDuration` on `/api/analyze`
- [x] `.env.example` and `.env.local` placeholders
- [x] `CLAUDE.md` (project conventions + gotchas)
- [x] `progresstillnow.md` (this file)
- [x] git repo lives at `web/` root (`.git` already initialized by `create-next-app`); `../legacy/` and any outer files are intentionally outside the repo

### Core libs (`lib/`)
- [x] `types.ts` — `ModelKey`, `ModelCell`, `AnalyzeResult`, `ScoreSummary`, `TavilyComparison`
- [x] `models.ts` — provider clients with primary + fallback model IDs
- [x] `queries.ts` — `generateBuyerQueries` using `Output.object` (6-10 neutral buyer queries)
- [x] `extract.ts` — `extractMentions` + `findTargetRank` (rank-aware fuzzy match)
- [x] `fanout.ts` — `runCell` with per-cell primary→fallback retry; `fanout` runs `Promise.all` over queries × models
- [x] `score.ts` — per-model mention rate, avg rank, SoV, competitor leaderboard, heatmap helpers
- [x] `store.ts` — Vercel Blob `put`/`head`/`list` with in-memory map fallback
- [x] `tavily.ts` — gated Google comparison via `tavily.search` + same extractor

### API routes
- [x] `app/api/analyze/route.ts` — POST, zod-validates, runs full pipeline, saves to Blob, returns `AnalyzeResult` JSON
- [x] `app/api/report/[id]/route.ts` — GET by ID

### UI
- [x] `app/layout.tsx` — dark theme, Geist fonts
- [x] `app/page.tsx` — landing + form
- [x] `components/InputForm.tsx` — client form with staged loading messages, error surface
- [x] `components/Scorecard.tsx` — 3-card per-model summary
- [x] `components/Heatmap.tsx` — query × model rank grid with color scale
- [x] `components/Leaderboard.tsx` — competitor-mention leaderboard, brand row highlighted
- [x] `components/ModelResponses.tsx` — accordion per query, tabbed by model, raw response text
- [x] `components/TavilyCompare.tsx` — Google comparison table (renders only if `result.tavily` exists)
- [x] `app/report/[id]/page.tsx` — server-rendered report with all sections + missed-queries callout

### Validation
- [x] `bunx tsc --noEmit` — clean
- [x] `bun run build` — clean (5 routes built, 0 errors)
- [ ] Live smoke test (blocked on API keys — see "Blockers")

---

## What's left 🔜

### Must-do before submitting
1. **Paste API keys** into `.env.local`: `OPENAI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, optionally `TAVILY_API_KEY`. Locally `BLOB_READ_WRITE_TOKEN` can stay empty (in-memory fallback works for dev).
2. **Smoke test locally**:
   - `bun run dev`
   - Open http://localhost:3000
   - Enter brand "Nature Made", category "magnesium supplement for seniors", optionally a few competitors
   - Confirm: queries generate, all 3 models respond, scorecard renders with non-zero numbers, heatmap shows colored cells, leaderboard populated, raw model responses viewable.
3. **Deploy to Vercel**:
   - `vercel link`
   - Set the 4 env vars in Vercel dashboard (Production scope at minimum)
   - Provision a Vercel Blob store from the dashboard (Storage tab) → `BLOB_READ_WRITE_TOKEN` is auto-injected
   - `vercel deploy --prod` (or push to GitHub if linked)
   - Smoke-test the production URL with the same query.
4. **Push public GitHub repo** (this `web/` directory is the repo root). README at root links to live URL + screenshots.
5. **Record 3-min demo video** (script in plan file). Camera on. Sample script in `~/.claude/plans/ok-so-basically-i-zesty-thunder.md` under "Verification → Demo script".
6. **Submit Pixii form** before 2026-05-05 23:59 IST. Required fields: GitHub URL, live URL, video link.

### Nice-to-have (only if time permits after must-do is green)
- [ ] Replace the basic accordion in `ModelResponses` with a side-by-side diff (left = LLM, right = Tavily Google). Higher signal for the demo.
- [ ] Add a one-click "Copy share link" button on the report page.
- [ ] Wire `vercel.ts` `redirects` so `/r/<id>` short-URL works in addition to `/report/<id>`.
- [ ] Add Vercel Analytics (`@vercel/analytics`) — single import, low effort.
- [ ] Pre-cache 1-2 hand-picked demo runs as static JSON so the demo can start instantly even if API has hiccups.
- [ ] Add a top-3 "AEO score grade" (A/B/C/D/F) on the scorecard for shareable bragging-rights.

### Explicitly out of scope (don't add)
- ❌ shadcn/ui (Tailwind utilities are fine for this scope)
- ❌ Recharts / Plotly (the heatmap is a CSS grid by design)
- ❌ Database (Neon/Supabase/Postgres) — Blob is the persistence layer
- ❌ Auth (Clerk/NextAuth) — single-tenant demo, no users
- ❌ AI Gateway — user wants their own provider keys
- ❌ Python helpers — full Next.js, no `uv`/`pip`
- ❌ Edge runtime for `/api/analyze` — Node runtime needed for `@vercel/blob`, full SDK support, and 300s timeout

---

## Blockers 🚧

| Blocker | What's needed | Who unblocks |
|---|---|---|
| Live smoke test | `OPENAI_API_KEY` + `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local` | User |
| Tavily comparison verification | `TAVILY_API_KEY` (optional but recommended for demo) | User |
| Production share links | Vercel Blob store provisioned + `BLOB_READ_WRITE_TOKEN` set | User (in Vercel dashboard) |
| Public deployment | Vercel project linked + envs set + blob store created | User |

None of these are code changes. The codebase is feature-complete.

---

## Where things live (quick map)

- **Plan / original spec**: `~/.claude/plans/ok-so-basically-i-zesty-thunder.md` (lives outside the repo)
- **Project conventions for AI agents**: `CLAUDE.md`
- **This file**: `progresstillnow.md`
- **Active code**: `app/`, `lib/`, `components/`
- **Old MVP for reference (outside this repo, do not edit)**: `../legacy/`
- **Bundled AI SDK docs**: `node_modules/ai/docs/`
- **Bundled Next.js docs**: `node_modules/next/dist/docs/`

---

## How to resume

If you (Claude) are starting a fresh session:

1. Read `CLAUDE.md` for stack + conventions.
2. Read this file (`progresstillnow.md`) for status.
3. Read the plan file at `~/.claude/plans/ok-so-basically-i-zesty-thunder.md` for original intent.
4. Run `bun run build` to confirm the codebase still compiles.
5. Check the "What's left" section above. Pick the highest-priority unchecked item.
6. If the user asks "is everything ready?" — yes, modulo the blockers above (which are all key/secret setup, not code).

If you (the user) are starting a fresh session:

1. Open Claude inside this `web/` directory.
2. Tell Claude what you want next ("smoke test", "deploy", "polish UI", "record video", etc.).
3. `CLAUDE.md` will auto-load context. This file gives the human-readable status.
