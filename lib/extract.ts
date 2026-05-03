import { generateText, Output } from "ai";
import { z } from "zod";
import { extractorModel } from "./models";
import type { Mention } from "./types";

const MentionsSchema = z.object({
  mentions: z
    .array(
      z.object({
        brand: z.string().describe("Brand or product name as written"),
        rank: z
          .number()
          .int()
          .min(1)
          .describe("Position in the recommendation list (1 = top)"),
        context: z.string().max(280).describe("Short snippet around the mention"),
      }),
    )
    .describe("All distinct brand/product names mentioned, in the order they appear"),
});

export async function extractMentions(responseText: string): Promise<Mention[]> {
  if (!responseText || responseText.trim().length < 20) return [];

  try {
    const { output } = await generateText({
      model: extractorModel(),
      output: Output.object({ schema: MentionsSchema }),
      prompt: `Extract every distinct CONSUMER PRODUCT BRAND that is recommended as a buyable product in the text below. Preserve the order in which they appear (rank 1 = first recommended, rank 2 = second, etc).

INCLUDE: branded product names like "Thorne Magnesium Bisglycinate", "Nature Made Magnesium Glycinate", "Pure Encapsulations Magnesium".

EXCLUDE all of the following:
- Generic ingredient or form names with no brand: "magnesium glycinate", "magnesium L-threonate", "magnesium powder"
- Retailers: "Amazon", "Walmart", "Costco", "CVS", "Walgreens", "iHerb"
- Media/health sites: "Healthline", "WebMD", "Cleveland Clinic", "Mayo Clinic", "Drugs.com", "Sleep Foundation", "Wikipedia"
- Patent/technology names: "TRAACS", "Magtein"
- Categories or descriptors: "best overall", "budget pick"

Capture each distinct brand only once (use the first/most-recommended occurrence).

Text:
"""
${responseText.slice(0, 6000)}
"""`,
    });

    return output.mentions;
  } catch (err) {
    console.error("[extract] structured extraction failed:", (err as Error).message);
    return [];
  }
}

export function findTargetRank(mentions: Mention[], target: string): number | null {
  if (!mentions.length) return null;
  const t = target.toLowerCase().trim();
  const matched = mentions
    .filter((m) => {
      const b = m.brand.toLowerCase();
      return b.includes(t) || t.includes(b);
    })
    .sort((a, b) => a.rank - b.rank)[0];
  return matched ? matched.rank : null;
}

export function fallbackTargetRank(
  responseText: string,
  target: string,
): number | null {
  if (!responseText || !target) return null;
  const t = target.toLowerCase().trim();
  if (t.length < 3) return null;

  const numbered = [
    ...responseText.matchAll(/(?:^|\n)\s*(?:###\s*)?(\d{1,2})[.)]\s*\**\s*([^\n*]+)/g),
  ];
  for (const m of numbered) {
    const rank = parseInt(m[1], 10);
    const line = m[2].toLowerCase();
    if (rank >= 1 && rank <= 30 && line.includes(t)) return rank;
  }

  const headerNumbered = [
    ...responseText.matchAll(
      /(?:^|\n)#{1,4}\s*(\d{1,2})[.)]?\s*\**\s*([^\n#*]+)/g,
    ),
  ];
  for (const m of headerNumbered) {
    const rank = parseInt(m[1], 10);
    const line = m[2].toLowerCase();
    if (rank >= 1 && rank <= 30 && line.includes(t)) return rank;
  }

  if (responseText.toLowerCase().includes(t)) {
    const idx = responseText.toLowerCase().indexOf(t);
    const before = responseText.slice(0, idx);
    const bullets = (before.match(/(?:^|\n)\s*\d{1,2}[.)]/g) ?? []).length;
    if (bullets >= 1) return Math.min(bullets + 1, 20);
    return 99;
  }

  return null;
}

export function fallbackBrandList(
  responseText: string,
  knownBrands: string[],
): Mention[] {
  const out: Mention[] = [];
  const text = responseText;
  const seen = new Set<string>();
  let counter = 1;
  for (const name of knownBrands) {
    const t = name.toLowerCase().trim();
    if (t.length < 3 || seen.has(t)) continue;
    if (text.toLowerCase().includes(t)) {
      const rank = fallbackTargetRank(text, name) ?? counter;
      out.push({ brand: name, rank, context: "" });
      seen.add(t);
      counter++;
    }
  }
  return out.sort((a, b) => a.rank - b.rank);
}
