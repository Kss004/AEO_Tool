import { tavily } from "@tavily/core";
import { extractMentions, fallbackBrandList } from "./extract";
import type { TavilyComparison } from "./types";

export function tavilyConfigured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function compareToGoogle(
  queries: string[],
  brand: string,
  knownBrands: string[],
): Promise<TavilyComparison[] | null> {
  if (!tavilyConfigured()) return null;

  const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  const target = brand.toLowerCase();

  const tasks = queries.slice(0, 6).map(async (query): Promise<TavilyComparison> => {
    try {
      const res = await client.search(query, {
        searchDepth: "basic",
        maxResults: 8,
      });
      const blob = res.results
        .map((r) => `${r.title}\n${r.content ?? ""}`)
        .join("\n---\n");
      let mentions = await extractMentions(blob);
      if (!mentions.length) {
        mentions = fallbackBrandList(blob, knownBrands);
      }
      const ordered = mentions.sort((a, b) => a.rank - b.rank);
      const topGoogleBrands = ordered.slice(0, 10).map((m) => m.brand);
      const matched = ordered.find((m) => {
        const b = m.brand.toLowerCase();
        return b.includes(target) || target.includes(b);
      });
      return {
        query,
        topGoogleBrands,
        brandInTopGoogle: Boolean(matched),
        googleRank: matched?.rank ?? null,
      };
    } catch (err) {
      console.error("[tavily] search failed:", (err as Error).message);
      return {
        query,
        topGoogleBrands: [],
        brandInTopGoogle: false,
        googleRank: null,
      };
    }
  });

  return Promise.all(tasks);
}
