import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import type { ModelKey } from "./types";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const OPENAI_PRIMARY = "gpt-5.5";
const OPENAI_FALLBACK = "gpt-5.4-nano";

// Keep logical keys stable because they are persisted in report JSON.
const LLAMA_PRIMARY = "qwen/qwen3.6-27b";
const LLAMA_FALLBACK = "qwen/qwen3.8-27b";

const QWEN_PRIMARY = "qwen/qwen3.8-27b";
const QWEN_FALLBACK = "qwen/qwen3.6-27b";

const GEMMA_PRIMARY = "openai/gpt-oss-120b";
const GEMMA_FALLBACK = "openai/gpt-oss-20b";

const KIMI_PRIMARY = "openai/gpt-oss-20b";
const KIMI_FALLBACK = "openai/gpt-oss-120b";

export function modelFor(key: ModelKey, useFallback = false) {
  switch (key) {
    case "openai":
      return openai(useFallback ? OPENAI_FALLBACK : OPENAI_PRIMARY);
    case "llama":
      return groq(useFallback ? LLAMA_FALLBACK : LLAMA_PRIMARY);
    case "qwen":
      return groq(useFallback ? QWEN_FALLBACK : QWEN_PRIMARY);
    case "gemma":
      return groq(useFallback ? GEMMA_FALLBACK : GEMMA_PRIMARY);
    case "kimi":
      return groq(useFallback ? KIMI_FALLBACK : KIMI_PRIMARY);
  }
}

export function utilityModel() {
  return openai("gpt-5.4-nano");
}

export function extractorModel() {
  return openai("gpt-5.4-nano");
}

export const ALL_MODELS: ModelKey[] = [
  "openai",
  "llama",
  "qwen",
  "gemma",
  "kimi",
];
