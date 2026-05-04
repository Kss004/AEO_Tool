import type { ModelCell, ModelKey, ScoreSummary } from "./types";
import { ALL_MODELS } from "./models";

function isMatch(brand: string, target: string) {
  const b = brand.toLowerCase();
  const t = target.toLowerCase();
  return b.includes(t) || t.includes(b);
}

const GENERIC_TERMS = new Set([
  "magnesium",
  "magnesium glycinate",
  "magnesium bisglycinate",
  "magnesium citrate",
  "magnesium oxide",
  "magnesium l-threonate",
  "magnesium chelate",
  "magnesium malate",
  "magnesium taurate",
  "magnesium powder",
]);

const SOURCE_DOMAINS = [
  "drugs.com",
  "webmd",
  "healthline",
  "wikipedia",
  "sleep foundation",
  "cleveland clinic",
  "mayo clinic",
  "examine",
  "consumer reports",
  "amazon",
  "walgreens",
  "cvs",
  "walmart",
  "costco",
  "vitamin shoppe",
  "iherb",
];

function cleanBrandName(raw: string): string {
  return raw
    .replace(/^[\s*#>\-•·]+/, "")
    .replace(/[\s*#>\-•·]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalKey(name: string): string {
  return cleanBrandName(name)
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericTerm(name: string): boolean {
  const k = canonicalKey(name);
  if (k.length < 3) return true;
  if (GENERIC_TERMS.has(k)) return true;
  if (SOURCE_DOMAINS.some((d) => k.includes(d))) return true;
  if (/^magnesium [a-z\- ]+$/i.test(k) && k.split(" ").length <= 3) return true;
  return false;
}

const CONNECTORS = new Set([
  "of",
  "and",
  "the",
  "for",
  "a",
  "an",
  "to",
  "in",
  "on",
  "with",
  "by",
  "from",
]);

function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) => {
      if (!w) return w;
      if (/^[A-Z]{2,}$/.test(w)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && CONNECTORS.has(lower)) return lower;
      if (w.length <= 2 && /^[a-z]+$/.test(w)) return w.toUpperCase();
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function clusterKey(canon: string): string {
  const tokens = canon.split(" ").filter((t) => t.length > 0);
  if (tokens.length === 0) return canon;
  if (tokens.length === 1) return tokens[0];
  return tokens.slice(0, 2).join(" ");
}

function mergeFuzzyKeys<
  V extends { mentions: number; ranks: number[]; displayName: string },
>(map: Map<string, V>): Map<string, V> {
  const clusters = new Map<string, { keys: string[]; vals: V[] }>();
  for (const [key, val] of map.entries()) {
    const ck = clusterKey(key);
    const slot = clusters.get(ck) ?? { keys: [], vals: [] };
    slot.keys.push(key);
    slot.vals.push(val);
    clusters.set(ck, slot);
  }

  const sortedKeys = [...clusters.keys()].sort((a, b) => a.length - b.length);
  for (const shortKey of sortedKeys) {
    if (!clusters.has(shortKey)) continue;
    if (shortKey.includes(" ")) continue;
    for (const longKey of sortedKeys) {
      if (longKey === shortKey) continue;
      if (!clusters.has(longKey)) continue;
      if (longKey.startsWith(shortKey + " ")) {
        const shortSlot = clusters.get(shortKey)!;
        const longSlot = clusters.get(longKey)!;
        longSlot.keys.push(...shortSlot.keys);
        longSlot.vals.push(...shortSlot.vals);
        clusters.delete(shortKey);
        break;
      }
    }
  }

  const out = new Map<string, V>();
  for (const [ck, slot] of clusters.entries()) {
    if (slot.vals.length === 1) {
      out.set(slot.keys[0], { ...slot.vals[0], ranks: [...slot.vals[0].ranks] });
      continue;
    }
    let totalMentions = 0;
    const allRanks: number[] = [];
    let displayName = slot.vals[0].displayName;
    let displayLen = displayName.length;
    for (const v of slot.vals) {
      totalMentions += v.mentions;
      allRanks.push(...v.ranks);
      if (v.displayName.length < displayLen) {
        displayName = v.displayName;
        displayLen = v.displayName.length;
      }
    }
    const merged: V = {
      ...slot.vals[0],
      mentions: totalMentions,
      ranks: allRanks,
      displayName,
    };
    out.set(ck, merged);
  }
  return out;
}

export function score(
  brand: string,
  competitors: string[],
  queries: string[],
  cells: ModelCell[],
): ScoreSummary {
  const byModel = {} as ScoreSummary["byModel"];

  for (const m of ALL_MODELS) {
    const cellsForModel = cells.filter((c) => c.model === m && !c.errorMessage);
    const mentioned = cellsForModel.filter((c) => c.targetRank !== null);
    const mentionRate = cellsForModel.length
      ? mentioned.length / cellsForModel.length
      : 0;

    const ranks = mentioned
      .map((c) => c.targetRank)
      .filter((r): r is number => r !== null);
    const avgRank = ranks.length
      ? ranks.reduce((a, b) => a + b, 0) / ranks.length
      : null;

    let totalMentionsAcrossBrands = 0;
    let targetMentionsCount = 0;
    for (const c of cellsForModel) {
      totalMentionsAcrossBrands += c.mentions.length;
      targetMentionsCount += c.mentions.filter((mn) => isMatch(mn.brand, brand)).length;
    }
    const shareOfVoice = totalMentionsAcrossBrands
      ? targetMentionsCount / totalMentionsAcrossBrands
      : 0;

    byModel[m] = {
      mentionedCount: mentioned.length,
      mentionRate,
      avgRank,
      shareOfVoice,
    };
  }

  const competitorTallies = new Map<
    string,
    { mentions: number; ranks: number[]; displayName: string }
  >();

  for (const c of cells) {
    for (const mn of c.mentions) {
      const cleaned = cleanBrandName(mn.brand);
      if (!cleaned || isGenericTerm(cleaned)) continue;
      const key = canonicalKey(cleaned);
      const existing = competitorTallies.get(key);
      if (existing) {
        existing.mentions += 1;
        existing.ranks.push(mn.rank);
        if (cleaned.length < existing.displayName.length) {
          existing.displayName = cleaned;
        }
      } else {
        competitorTallies.set(key, {
          mentions: 1,
          ranks: [mn.rank],
          displayName: cleaned,
        });
      }
    }
  }

  const merged = mergeFuzzyKeys(competitorTallies);

  const explicitCompetitors = competitors.map((c) => canonicalKey(c));
  const leaderboardEntries: ScoreSummary["competitorLeaderboard"] = [];
  for (const [key, val] of merged.entries()) {
    if (isMatch(key, canonicalKey(brand))) continue;
    const isExplicit = explicitCompetitors.some(
      (c) => key.includes(c) || c.includes(key),
    );
    if (explicitCompetitors.length && !isExplicit && val.mentions < 2) continue;
    const avg = val.ranks.reduce((a, b) => a + b, 0) / val.ranks.length;
    leaderboardEntries.push({
      name: titleCase(val.displayName),
      mentions: val.mentions,
      avgRank: Math.round(avg * 10) / 10,
    });
  }
  leaderboardEntries.sort((a, b) => b.mentions - a.mentions || a.avgRank - b.avgRank);

  const missedQueries = queries.filter((q) =>
    cells
      .filter((c) => c.query === q && !c.errorMessage)
      .every((c) => c.targetRank === null),
  );

  return {
    brand,
    totalQueries: queries.length,
    totalCells: cells.length,
    byModel,
    competitorLeaderboard: leaderboardEntries.slice(0, 12),
    missedQueries,
  };
}

export function heatmapValue(cell: ModelCell | undefined): number {
  if (!cell || cell.errorMessage) return -1;
  if (cell.targetRank === null) return 0;
  if (cell.targetRank === 1) return 5;
  if (cell.targetRank <= 3) return 4;
  if (cell.targetRank <= 5) return 3;
  if (cell.targetRank <= 10) return 2;
  return 1;
}

export function heatmapColor(v: number): string {
  if (v < 0) return "bg-zinc-800 text-zinc-500";
  if (v === 0) return "bg-zinc-900 text-zinc-600";
  if (v === 1) return "bg-amber-900/60 text-amber-200";
  if (v === 2) return "bg-amber-700/70 text-amber-100";
  if (v === 3) return "bg-emerald-800/70 text-emerald-100";
  if (v === 4) return "bg-emerald-700/80 text-emerald-50";
  return "bg-emerald-500 text-white";
}

export function findCell(
  cells: ModelCell[],
  query: string,
  model: ModelKey,
): ModelCell | undefined {
  return cells.find((c) => c.query === query && c.model === model);
}
