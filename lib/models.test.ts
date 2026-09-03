import { describe, expect, test } from "bun:test";
import { ALL_MODELS, modelFor } from "./models";
import { MODEL_LABELS } from "./types";

describe("panel model configuration", () => {
  test("uses five distinct current primary models and labels", () => {
    expect(ALL_MODELS.map((key) => modelFor(key).modelId)).toEqual([
      "gpt-5.5",
      "qwen/qwen3.6-27b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ]);
    expect(new Set(ALL_MODELS.map((key) => modelFor(key).modelId)).size).toBe(5);
    expect(ALL_MODELS.map((key) => MODEL_LABELS[key])).toEqual([
      "GPT-5.5",
      "Qwen 3.6 27B",
      "Qwen 3.8 27B",
      "GPT-OSS 120B",
      "GPT-OSS 20B",
    ]);
  });

  test("uses available models for every fallback", () => {
    expect(ALL_MODELS.map((key) => modelFor(key, true).modelId)).toEqual([
      "gpt-5.4-nano",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.6-27b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
    ]);
  });
});
