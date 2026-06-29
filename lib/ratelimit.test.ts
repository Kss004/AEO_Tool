import { describe, expect, test } from "bun:test";
import { rateLimit } from "./ratelimit";

describe("rateLimit", () => {
  test("allows requests when the configured limiter is unreachable", async () => {
    const oldUrl = process.env.UPSTASH_REDIS_REST_URL;
    const oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const oldFetch = globalThis.fetch;

    process.env.UPSTASH_REDIS_REST_URL = "https://example.invalid";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    globalThis.fetch = (() =>
      Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch;

    try {
      const result = await rateLimit("127.0.0.1");
      expect(result.ok).toBe(true);
    } finally {
      if (oldUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = oldUrl;
      if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
      globalThis.fetch = oldFetch;
    }
  });
});
