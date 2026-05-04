import { generateText } from "ai";
import { ALL_MODELS, modelFor } from "./models";
import {
  extractMentions,
  fallbackBrandList,
  fallbackTargetRank,
  findTargetRank,
} from "./extract";
import type { ModelCell, ModelKey } from "./types";

const SYSTEM = `You are a helpful AI shopping assistant. Answer the user's product research question with concrete brand/product recommendations. Provide a clear ranked list of 5-10 specific products by name. Avoid disclaimers; act like ChatGPT/Gemini answering a real shopper.`;

const CONCURRENCY: Record<ModelKey, number> = {
  openai: 6,
  llama: 6,
  qwen: 6,
  gemma: 6,
  kimi: 6,
};

function isRateLimit(msg: string): boolean {
  const m = msg.toLowerCase();
  return m.includes("429") || m.includes("rate") || m.includes("quota") || m.includes("resource_exhausted");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOnce(model: ModelKey, query: string, useFallback = false) {
  const start = Date.now();
  const { text } = await generateText({
    model: modelFor(model, useFallback),
    system: SYSTEM,
    prompt: query,
  });
  return { text, latencyMs: Date.now() - start };
}

async function callWithRetry(model: ModelKey, query: string, useFallback = false, attempt = 0): Promise<{ text: string; latencyMs: number }> {
  try {
    return await callOnce(model, query, useFallback);
  } catch (err) {
    const msg = (err as Error).message;
    if (isRateLimit(msg) && attempt < 2) {
      const wait = 1500 * Math.pow(2, attempt);
      console.warn(`[fanout] ${model} 429 — backoff ${wait}ms (attempt ${attempt + 1})`);
      await sleep(wait);
      return callWithRetry(model, query, useFallback, attempt + 1);
    }
    throw err;
  }
}

async function callWithFallback(model: ModelKey, query: string) {
  try {
    return { ...(await callWithRetry(model, query, false)), errorMessage: null as string | null };
  } catch (err) {
    console.warn(`[fanout] ${model} primary failed, trying fallback:`, (err as Error).message);
    try {
      const r = await callWithRetry(model, query, true);
      return { ...r, errorMessage: null as string | null };
    } catch (err2) {
      console.error(`[fanout] ${model} fallback also failed:`, (err2 as Error).message);
      return {
        text: "",
        latencyMs: 0,
        errorMessage: (err2 as Error).message || String(err2),
      };
    }
  }
}

export async function runCell(
  model: ModelKey,
  query: string,
  target: string,
  knownBrands: string[],
): Promise<ModelCell> {
  const { text, latencyMs, errorMessage } = await callWithFallback(model, query);
  if (errorMessage && !text) {
    return {
      model,
      query,
      responseText: "",
      mentions: [],
      targetRank: null,
      errorMessage,
      latencyMs,
    };
  }
  let mentions = await extractMentions(text);
  let targetRank = findTargetRank(mentions, target);

  if (!mentions.length) {
    mentions = fallbackBrandList(text, [target, ...knownBrands]);
  }
  if (targetRank === null) {
    targetRank =
      findTargetRank(mentions, target) ?? fallbackTargetRank(text, target);
  }

  return {
    model,
    query,
    responseText: text,
    mentions,
    targetRank,
    errorMessage,
    latencyMs,
  };
}

async function runWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function fanout(
  queries: string[],
  target: string,
  knownBrands: string[],
): Promise<ModelCell[]> {
  const all: ModelCell[] = [];
  await Promise.all(
    ALL_MODELS.map(async (m) => {
      const cells = await runWithLimit(queries, CONCURRENCY[m], (q) =>
        runCell(m, q, target, knownBrands),
      );
      all.push(...cells);
    }),
  );
  return all;
}
