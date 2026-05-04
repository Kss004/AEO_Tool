import { describe, test, expect } from "bun:test";
import {
  stripThinking,
  findTargetRank,
  fallbackTargetRank,
  fallbackBrandList,
} from "./extract";

describe("stripThinking", () => {
  test("strips <think>...</think>", () => {
    const t = "before <think>reasoning here</think> after";
    expect(stripThinking(t)).toBe("before  after");
  });

  test("strips <thinking> blocks", () => {
    expect(stripThinking("a <thinking>x</thinking> b")).toBe("a  b");
  });

  test("strips <reasoning> blocks", () => {
    expect(stripThinking("a <reasoning>x</reasoning> b")).toBe("a  b");
  });

  test("strips multi-line thinking", () => {
    const t = "head\n<think>\nline1\nline2\n</think>\ntail";
    expect(stripThinking(t)).toBe("head\n\ntail");
  });

  test("preserves text without thinking blocks", () => {
    expect(stripThinking("plain answer")).toBe("plain answer");
  });

  test("trims trailing whitespace", () => {
    expect(stripThinking("answer  \n  ")).toBe("answer");
  });
});

describe("findTargetRank", () => {
  test("returns rank when brand matches exactly", () => {
    const ms = [
      { brand: "Thorne", rank: 2, context: "" },
      { brand: "Pure Encapsulations", rank: 1, context: "" },
    ];
    expect(findTargetRank(ms, "Thorne")).toBe(2);
  });

  test("case-insensitive match", () => {
    const ms = [{ brand: "THORNE", rank: 3, context: "" }];
    expect(findTargetRank(ms, "thorne")).toBe(3);
  });

  test("substring match (target inside brand)", () => {
    const ms = [{ brand: "Thorne Magnesium Bisglycinate", rank: 4, context: "" }];
    expect(findTargetRank(ms, "Thorne")).toBe(4);
  });

  test("substring match (brand inside target)", () => {
    const ms = [{ brand: "Thorne", rank: 5, context: "" }];
    expect(findTargetRank(ms, "Thorne Research")).toBe(5);
  });

  test("returns lowest rank when multiple matches", () => {
    const ms = [
      { brand: "Thorne Magnesium", rank: 5, context: "" },
      { brand: "Thorne", rank: 2, context: "" },
    ];
    expect(findTargetRank(ms, "Thorne")).toBe(2);
  });

  test("returns null when no match", () => {
    const ms = [{ brand: "Other", rank: 1, context: "" }];
    expect(findTargetRank(ms, "Thorne")).toBeNull();
  });

  test("returns null on empty mention list", () => {
    expect(findTargetRank([], "Thorne")).toBeNull();
  });
});

describe("fallbackTargetRank", () => {
  test("matches numbered list '1. Thorne'", () => {
    const text = "1. Thorne Magnesium\n2. Pure Encapsulations\n3. Nature Made";
    expect(fallbackTargetRank(text, "Thorne")).toBe(1);
  });

  test("matches numbered list '2) Pure Encapsulations'", () => {
    const text = "1) Thorne\n2) Pure Encapsulations\n3) Doctor's Best";
    expect(fallbackTargetRank(text, "Pure Encapsulations")).toBe(2);
  });

  test("matches markdown header '### 2. Brand'", () => {
    const text = "### 1. Thorne\nstuff\n### 2. Pure Encapsulations\nmore";
    expect(fallbackTargetRank(text, "Pure Encapsulations")).toBe(2);
  });

  test("returns null when target absent", () => {
    expect(fallbackTargetRank("1. A\n2. B", "Z")).toBeNull();
  });

  test("returns null on too-short target", () => {
    expect(fallbackTargetRank("1. A\n2. B", "ab")).toBeNull();
  });

  test("strips thinking blocks before matching", () => {
    const text = "<think>1. fake brand</think>\n1. Thorne\n2. Other";
    expect(fallbackTargetRank(text, "Thorne")).toBe(1);
  });

  test("falls back to bullet count when target found mid-list without explicit number", () => {
    const text = "1. Alpha\n2. Beta\nMention of Thorne in passing prose.";
    const r = fallbackTargetRank(text, "Thorne");
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThanOrEqual(2);
  });
});

describe("fallbackBrandList", () => {
  test("scans known brands in text", () => {
    const text = "Best picks: Thorne, Pure Encapsulations, and Doctor's Best.";
    const out = fallbackBrandList(text, ["Thorne", "Pure Encapsulations", "Other"]);
    expect(out.map((m) => m.brand)).toEqual(
      expect.arrayContaining(["Thorne", "Pure Encapsulations"]),
    );
    expect(out.find((m) => m.brand === "Other")).toBeUndefined();
  });

  test("dedupes case-insensitive", () => {
    const text = "Thorne is great. THORNE wins.";
    const out = fallbackBrandList(text, ["Thorne"]);
    expect(out.length).toBe(1);
  });

  test("skips short names (<3 chars)", () => {
    const text = "AB is everywhere";
    const out = fallbackBrandList(text, ["AB"]);
    expect(out.length).toBe(0);
  });

  test("results sorted by rank ascending", () => {
    const text = "1. Pure Encapsulations\n2. Thorne\n3. Doctor's Best";
    const out = fallbackBrandList(text, [
      "Thorne",
      "Pure Encapsulations",
      "Doctor's Best",
    ]);
    const ranks = out.map((m) => m.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  test("strips thinking before scan", () => {
    const text = "<think>Thorne is hidden here</think>\nVisible only Pure Encapsulations.";
    const out = fallbackBrandList(text, ["Thorne", "Pure Encapsulations"]);
    expect(out.find((m) => m.brand === "Thorne")).toBeUndefined();
    expect(out.find((m) => m.brand === "Pure Encapsulations")).toBeDefined();
  });
});
