import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ModelKey } from "./types";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const OPENAI_PRIMARY = "gpt-5.5";
const OPENAI_FALLBACK = "gpt-5.4-nano";

const GEMINI_PRIMARY = "gemini-2.5-flash";
const GEMINI_FALLBACK = "gemini-2.0-flash";

const GEMMA_PRIMARY = "gemma-4-31b-it";
const GEMMA_FALLBACK = "gemma-4-26b-a4b-it";

const LLAMA_PRIMARY = "meta-llama/llama-3.3-70b-instruct:free";
const LLAMA_FALLBACK = "meta-llama/llama-3.2-3b-instruct:free";

const QWEN_PRIMARY = "qwen/qwen3-next-80b-a3b-instruct:free";
const QWEN_FALLBACK = "qwen/qwen3-coder:free";

export function modelFor(key: ModelKey, useFallback = false) {
  switch (key) {
    case "openai":
      return openai(useFallback ? OPENAI_FALLBACK : OPENAI_PRIMARY);
    case "gemini":
      return google(useFallback ? GEMINI_FALLBACK : GEMINI_PRIMARY);
    case "gemma":
      return google(useFallback ? GEMMA_FALLBACK : GEMMA_PRIMARY);
    case "llama":
      return openrouter(useFallback ? LLAMA_FALLBACK : LLAMA_PRIMARY);
    case "qwen":
      return openrouter(useFallback ? QWEN_FALLBACK : QWEN_PRIMARY);
  }
}

export function utilityModel() {
  return google(GEMINI_PRIMARY);
}

export function extractorModel() {
  return openai("gpt-5.4-nano");
}

export const ALL_MODELS: ModelKey[] = [
  "openai",
  "gemini",
  "gemma",
  "llama",
  "qwen",
];
