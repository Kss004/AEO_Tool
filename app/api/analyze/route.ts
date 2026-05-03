import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBuyerQueries } from "@/lib/queries";
import { fanout } from "@/lib/fanout";
import { score } from "@/lib/score";
import { saveResult } from "@/lib/store";
import { compareToGoogle } from "@/lib/tavily";
import type { AnalyzeResult } from "@/lib/types";

export const maxDuration = 300;
export const runtime = "nodejs";

const Body = z.object({
  brand: z.string().min(1).max(80),
  category: z.string().min(2).max(120),
  competitors: z.array(z.string().min(1).max(80)).max(8).default([]),
});

function newId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export async function POST(req: Request) {
  let parsed;
  try {
    const body = await req.json();
    parsed = Body.parse(body);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const { brand, category, competitors } = parsed;

  try {
    const queries = await generateBuyerQueries(brand, category, competitors);

    const knownBrands = [brand, ...competitors];

    const [cells, tavily] = await Promise.all([
      fanout(queries, brand, competitors),
      compareToGoogle(queries, brand, knownBrands),
    ]);

    const summary = score(brand, competitors, queries, cells);

    const result: AnalyzeResult = {
      id: newId(),
      createdAt: new Date().toISOString(),
      request: { brand, category, competitors },
      queries,
      cells,
      score: summary,
      tavily,
    };

    await saveResult(result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze failed", err);
    return NextResponse.json(
      { error: "Pipeline failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
