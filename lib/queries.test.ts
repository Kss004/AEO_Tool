import { describe, test, expect } from "bun:test";
import { QuerySchema } from "./queries";

describe("QuerySchema", () => {
  test("accepts 5 valid queries", () => {
    const r = QuerySchema.safeParse({
      queries: [
        "best magnesium for sleep under fifty dollars",
        "top vegan protein powders for athletes",
        "magnesium glycinate vs citrate which is better",
        "what omega-3 supplement should I buy",
        "creatine monohydrate brands experts recommend",
      ],
    });
    expect(r.success).toBe(true);
  });

  test("accepts 6 valid queries", () => {
    const r = QuerySchema.safeParse({
      queries: Array(6).fill("a fairly long query string asking about products"),
    });
    expect(r.success).toBe(true);
  });

  test("rejects < 5 queries", () => {
    const r = QuerySchema.safeParse({
      queries: ["query one is here", "query two is here"],
    });
    expect(r.success).toBe(false);
  });

  test("rejects > 6 queries", () => {
    const r = QuerySchema.safeParse({
      queries: Array(7).fill("a fairly long query string asking about products"),
    });
    expect(r.success).toBe(false);
  });

  test("rejects query shorter than 8 chars", () => {
    const r = QuerySchema.safeParse({
      queries: ["short", "another short", "long enough query", "long enough", "another one"],
    });
    expect(r.success).toBe(false);
  });

  test("rejects query longer than 140 chars", () => {
    const long = "x".repeat(141);
    const r = QuerySchema.safeParse({
      queries: [long, "valid query", "valid query", "valid query", "valid query"],
    });
    expect(r.success).toBe(false);
  });

  test("rejects missing queries field", () => {
    const r = QuerySchema.safeParse({});
    expect(r.success).toBe(false);
  });

  test("rejects non-string in queries array", () => {
    const r = QuerySchema.safeParse({
      queries: [1, 2, 3, 4, 5],
    });
    expect(r.success).toBe(false);
  });
});
