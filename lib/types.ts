export type ModelKey = "openai" | "gemini" | "gemma" | "llama" | "qwen";

export const MODEL_LABELS: Record<ModelKey, string> = {
  openai: "GPT-5.5",
  gemini: "Gemini 2.5 Flash",
  gemma: "Gemma 4 31B",
  llama: "Llama 3.3 70B",
  qwen: "Qwen3 Next 80B",
};

export type Mention = {
  brand: string;
  rank: number;
  context: string;
};

export type ModelCell = {
  model: ModelKey;
  query: string;
  responseText: string;
  mentions: Mention[];
  targetRank: number | null;
  errorMessage: string | null;
  latencyMs: number;
};

export type AnalyzeRequest = {
  brand: string;
  category: string;
  competitors: string[];
};

export type ScoreSummary = {
  brand: string;
  totalQueries: number;
  totalCells: number;
  byModel: Record<
    ModelKey,
    {
      mentionedCount: number;
      mentionRate: number;
      avgRank: number | null;
      shareOfVoice: number;
    }
  >;
  competitorLeaderboard: { name: string; mentions: number; avgRank: number }[];
  missedQueries: string[];
};

export type TavilyComparison = {
  query: string;
  topGoogleBrands: string[];
  brandInTopGoogle: boolean;
  googleRank: number | null;
};

export type AnalyzeResult = {
  id: string;
  createdAt: string;
  request: AnalyzeRequest;
  queries: string[];
  cells: ModelCell[];
  score: ScoreSummary;
  tavily: TavilyComparison[] | null;
};
