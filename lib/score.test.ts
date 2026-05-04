import { describe, test, expect } from "bun:test";
import { score, heatmapValue, heatmapColor, findCell } from "./score";
import type { ModelCell, ModelKey } from "./types";

function cell(
  model: ModelKey,
  query: string,
  brands: { brand: string; rank: number }[],
  targetRank: number | null = null,
): ModelCell {
  return {
    model,
    query,
    responseText: "",
    mentions: brands.map((b) => ({ brand: b.brand, rank: b.rank, context: "" })),
    targetRank,
    errorMessage: null,
    latencyMs: 100,
  };
}

const QUERIES = ["best magnesium for sleep", "top magnesium glycinate brands"];

describe("score: per-model metrics", () => {
  test("mentionRate = mentioned / total non-error cells", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Thorne", rank: 1 }], 1),
      cell("openai", QUERIES[1], [{ brand: "Pure Encapsulations", rank: 1 }], null),
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(s.byModel.openai.mentionRate).toBe(0.5);
    expect(s.byModel.openai.mentionedCount).toBe(1);
  });

  test("avgRank averages only ranked cells", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Thorne", rank: 2 }], 2),
      cell("openai", QUERIES[1], [{ brand: "Thorne", rank: 4 }], 4),
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(s.byModel.openai.avgRank).toBe(3);
  });

  test("avgRank null when nothing mentioned", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Other", rank: 1 }], null),
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(s.byModel.openai.avgRank).toBeNull();
  });

  test("error cells excluded from denominator", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Thorne", rank: 1 }], 1),
      { ...cell("openai", QUERIES[1], []), errorMessage: "rate limit" },
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(s.byModel.openai.mentionRate).toBe(1);
  });

  test("shareOfVoice = target mentions / all mentions", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [
        { brand: "Thorne", rank: 1 },
        { brand: "Pure Encapsulations", rank: 2 },
        { brand: "Nature Made", rank: 3 },
      ], 1),
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(s.byModel.openai.shareOfVoice).toBeCloseTo(1 / 3);
  });
});

describe("score: leaderboard dedupe + title-case", () => {
  test("same brand across cells dedupes by canonical key", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "thorne", rank: 1 }]),
      cell("llama", QUERIES[0], [{ brand: "Thorne", rank: 2 }]),
      cell("qwen", QUERIES[0], [{ brand: "THORNE", rank: 1 }]),
    ];
    const s = score("Magnesium Pro", ["thorne"], QUERIES, cells);
    const thorne = s.competitorLeaderboard.find((b) =>
      b.name.toLowerCase().includes("thorne"),
    );
    expect(thorne).toBeDefined();
    expect(thorne!.mentions).toBe(3);
  });

  test("token-2 prefix merge collapses 'NOW' + 'NOW Foods' + 'NOW Sports'", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "NOW", rank: 1 }]),
      cell("llama", QUERIES[0], [{ brand: "NOW Foods", rank: 1 }]),
      cell("qwen", QUERIES[0], [{ brand: "NOW Sports", rank: 1 }]),
    ];
    const s = score("Target", ["NOW"], QUERIES, cells);
    const nowGroup = s.competitorLeaderboard.filter((b) =>
      b.name.toUpperCase().includes("NOW"),
    );
    const totalMentions = nowGroup.reduce((a, b) => a + b.mentions, 0);
    expect(totalMentions).toBeGreaterThanOrEqual(3);
    expect(nowGroup.length).toBeLessThanOrEqual(2);
  });

  test("title-case keeps connectors lowercase except first word", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "garden of life", rank: 1 }]),
      cell("llama", QUERIES[0], [{ brand: "garden of life", rank: 1 }]),
    ];
    const s = score("Target", ["garden of life"], QUERIES, cells);
    const gol = s.competitorLeaderboard.find((b) =>
      b.name.toLowerCase().includes("garden"),
    );
    expect(gol).toBeDefined();
    expect(gol!.name).toBe("Garden of Life");
  });

  test("title-case preserves all-caps acronyms", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "MTN OPS", rank: 1 }]),
      cell("llama", QUERIES[0], [{ brand: "MTN OPS", rank: 1 }]),
    ];
    const s = score("Target", ["MTN OPS"], QUERIES, cells);
    const mtn = s.competitorLeaderboard.find((b) => b.name.includes("MTN"));
    expect(mtn?.name).toBe("MTN OPS");
  });

  test("generic 'magnesium glycinate' filtered out", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [
        { brand: "magnesium glycinate", rank: 1 },
        { brand: "Thorne", rank: 2 },
      ]),
      cell("llama", QUERIES[0], [
        { brand: "magnesium glycinate", rank: 1 },
        { brand: "Thorne", rank: 2 },
      ]),
    ];
    const s = score("Target", ["Thorne"], QUERIES, cells);
    const generic = s.competitorLeaderboard.find((b) =>
      b.name.toLowerCase().includes("magnesium glycinate"),
    );
    expect(generic).toBeUndefined();
  });

  test("retailer 'Amazon' filtered out", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [
        { brand: "Amazon", rank: 1 },
        { brand: "Thorne", rank: 2 },
      ]),
      cell("llama", QUERIES[0], [
        { brand: "Amazon", rank: 1 },
        { brand: "Thorne", rank: 2 },
      ]),
    ];
    const s = score("Target", ["Thorne"], QUERIES, cells);
    const amazon = s.competitorLeaderboard.find(
      (b) => b.name.toLowerCase() === "amazon",
    );
    expect(amazon).toBeUndefined();
  });

  test("target brand excluded from leaderboard", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Thorne", rank: 1 }]),
      cell("llama", QUERIES[0], [{ brand: "Thorne", rank: 1 }]),
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(
      s.competitorLeaderboard.find((b) => b.name.toLowerCase() === "thorne"),
    ).toBeUndefined();
  });

  test("singletons require 2+ mentions when explicit competitors present", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [
        { brand: "RandomBrand", rank: 1 },
        { brand: "Thorne", rank: 2 },
        { brand: "Thorne", rank: 2 },
      ]),
    ];
    const s = score("Target", ["Thorne"], QUERIES, cells);
    expect(
      s.competitorLeaderboard.find((b) => b.name === "RandomBrand"),
    ).toBeUndefined();
  });

  test("leaderboard sorted by mentions desc, then avgRank asc", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Alpha", rank: 5 }]),
      cell("llama", QUERIES[0], [{ brand: "Alpha", rank: 5 }]),
      cell("qwen", QUERIES[0], [{ brand: "Alpha", rank: 5 }]),
      cell("openai", QUERIES[1], [{ brand: "Beta", rank: 1 }]),
      cell("llama", QUERIES[1], [{ brand: "Beta", rank: 1 }]),
    ];
    const s = score("Target", ["Alpha", "Beta"], QUERIES, cells);
    expect(s.competitorLeaderboard[0].name).toBe("Alpha");
    expect(s.competitorLeaderboard[0].mentions).toBe(3);
  });
});

describe("score: missedQueries", () => {
  test("query with no targetRank in any model marked missed", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Thorne", rank: 1 }], 1),
      cell("llama", QUERIES[0], [{ brand: "Thorne", rank: 1 }], 1),
      cell("openai", QUERIES[1], [], null),
      cell("llama", QUERIES[1], [], null),
    ];
    const s = score("Thorne", [], QUERIES, cells);
    expect(s.missedQueries).toEqual([QUERIES[1]]);
  });

  test("query with one rank + others error is NOT missed", () => {
    const cells: ModelCell[] = [
      cell("openai", QUERIES[0], [{ brand: "Thorne", rank: 1 }], 1),
      { ...cell("llama", QUERIES[0], []), errorMessage: "rate limit" },
    ];
    const s = score("Thorne", [], [QUERIES[0]], cells);
    expect(s.missedQueries).not.toContain(QUERIES[0]);
  });
});

describe("score: empty input", () => {
  test("zero cells returns clean zero summary", () => {
    const s = score("Thorne", [], [], []);
    expect(s.totalCells).toBe(0);
    expect(s.competitorLeaderboard).toEqual([]);
    expect(s.byModel.openai.mentionRate).toBe(0);
    expect(s.byModel.openai.avgRank).toBeNull();
  });
});

describe("heatmapValue / heatmapColor", () => {
  test("error cell = -1", () => {
    const c: ModelCell = { ...cell("openai", "q", []), errorMessage: "x" };
    expect(heatmapValue(c)).toBe(-1);
  });
  test("undefined cell = -1", () => {
    expect(heatmapValue(undefined)).toBe(-1);
  });
  test("rank null = 0", () => {
    expect(heatmapValue(cell("openai", "q", []))).toBe(0);
  });
  test("rank 1 = 5", () => {
    expect(heatmapValue(cell("openai", "q", [], 1))).toBe(5);
  });
  test("rank 3 = 4", () => {
    expect(heatmapValue(cell("openai", "q", [], 3))).toBe(4);
  });
  test("rank 11 = 1", () => {
    expect(heatmapValue(cell("openai", "q", [], 11))).toBe(1);
  });
  test("color non-empty string", () => {
    expect(heatmapColor(5).length).toBeGreaterThan(0);
    expect(heatmapColor(-1).length).toBeGreaterThan(0);
  });
});

describe("findCell", () => {
  test("matches by query+model", () => {
    const cells: ModelCell[] = [
      cell("openai", "a", []),
      cell("llama", "a", []),
      cell("openai", "b", []),
    ];
    expect(findCell(cells, "a", "llama")?.model).toBe("llama");
    expect(findCell(cells, "z", "openai")).toBeUndefined();
  });
});
