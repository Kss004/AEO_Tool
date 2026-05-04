import { put, list, get } from "@vercel/blob";
import type { AnalyzeResult } from "./types";

const PREFIX = "aeo/";

const globalForStore = globalThis as unknown as {
  __aeoMemoryStore?: Map<string, AnalyzeResult>;
};

const memoryStore =
  globalForStore.__aeoMemoryStore ?? new Map<string, AnalyzeResult>();
globalForStore.__aeoMemoryStore = memoryStore;

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveResult(result: AnalyzeResult): Promise<string> {
  memoryStore.set(result.id, result);

  if (!blobConfigured()) {
    return `mem://${result.id}`;
  }

  const path = `${PREFIX}${result.id}.json`;
  const { url } = await put(path, JSON.stringify(result), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  return url;
}

export async function loadResult(id: string): Promise<AnalyzeResult | null> {
  const fromMem = memoryStore.get(id);
  if (fromMem) return fromMem;

  if (!blobConfigured()) return null;

  const path = `${PREFIX}${id}.json`;
  try {
    const blob = await get(path, { access: "private" });
    if (!blob) return null;
    const text = await new Response(blob.stream).text();
    const parsed = JSON.parse(text) as AnalyzeResult;
    memoryStore.set(id, parsed);
    return parsed;
  } catch (err) {
    console.error(`[store] loadResult(${id}) failed:`, (err as Error).message);
    return null;
  }
}

export async function listRecent(limit = 10): Promise<AnalyzeResult[]> {
  if (!blobConfigured()) {
    return [...memoryStore.values()].slice(-limit).reverse();
  }
  const { blobs } = await list({ prefix: PREFIX, limit });
  const results = await Promise.all(
    blobs.map(async (b) => {
      try {
        const r = await fetch(b.url, { cache: "no-store" });
        if (!r.ok) return null;
        return (await r.json()) as AnalyzeResult;
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is AnalyzeResult => r !== null);
}
