import { describe, test, expect } from "bun:test";
import { z } from "zod";

const RUN = process.env.RUN_SMOKE === "1";
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const ModelKey = z.enum(["openai", "llama", "qwen", "gemma", "kimi"]);

const Mention = z.object({
  brand: z.string(),
  rank: z.number(),
  context: z.string(),
});

const Cell = z.object({
  model: ModelKey,
  query: z.string(),
  responseText: z.string(),
  mentions: z.array(Mention),
  targetRank: z.number().nullable(),
  errorMessage: z.string().nullable(),
  latencyMs: z.number(),
});

const ScoreSummary = z.object({
  brand: z.string(),
  totalQueries: z.number(),
  totalCells: z.number(),
  byModel: z.record(
    ModelKey,
    z.object({
      mentionedCount: z.number(),
      mentionRate: z.number(),
      avgRank: z.number().nullable(),
      shareOfVoice: z.number(),
    }),
  ),
  competitorLeaderboard: z.array(
    z.object({
      name: z.string(),
      mentions: z.number(),
      avgRank: z.number(),
    }),
  ),
  missedQueries: z.array(z.string()),
});

const AnalyzeResult = z.object({
  id: z.string().min(4),
  createdAt: z.string(),
  request: z.object({
    brand: z.string(),
    category: z.string(),
    competitors: z.array(z.string()),
  }),
  queries: z.array(z.string()).min(5).max(6),
  cells: z.array(Cell),
  score: ScoreSummary,
  tavily: z.array(z.unknown()).nullable(),
});

describe.skipIf(!RUN)("smoke /api/analyze", () => {
  test("returns 200 + valid shape + 5 model cells per query", async () => {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "Thorne",
        category: "magnesium supplement",
        competitors: ["Pure Encapsulations", "Doctor's Best"],
      }),
    });
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = AnalyzeResult.safeParse(json);
    if (!parsed.success) {
      console.error(parsed.error.issues);
    }
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const result = parsed.data;
    const models = new Set(result.cells.map((c) => c.model));
    expect(models.size).toBe(5);
    expect(result.cells.length).toBe(result.queries.length * 5);
    for (const cell of result.cells) {
      expect(cell.errorMessage).toBeNull();
      expect(cell.responseText.trim().length).toBeGreaterThan(0);
    }

    const reportRes = await fetch(`${BASE}/api/report/${result.id}`);
    expect(reportRes.status).toBe(200);
  }, 180_000);
});

describe.skipIf(!RUN)("smoke validation", () => {
  test("rejects oversized brand", async () => {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "x".repeat(200),
        category: "test",
        competitors: [],
      }),
    });
    expect(res.status).toBe(400);
  });

  test("rejects too many competitors", async () => {
    const res = await fetch(`${BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: "Thorne",
        category: "supplements",
        competitors: Array(20).fill("Brand"),
      }),
    });
    expect(res.status).toBe(400);
  });
});
