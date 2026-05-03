import { generateText, Output } from "ai";
import { z } from "zod";
import { utilityModel } from "./models";

const QuerySchema = z.object({
  queries: z
    .array(z.string().min(8).max(140))
    .min(6)
    .max(10)
    .describe("Realistic shopper queries a buyer would type into ChatGPT/Gemini before buying"),
});

export async function generateBuyerQueries(
  brand: string,
  category: string,
  competitors: string[],
): Promise<string[]> {
  const competitorHint = competitors.length
    ? `Known competitors: ${competitors.join(", ")}.`
    : "";

  const { output } = await generateText({
    model: utilityModel(),
    output: Output.object({ schema: QuerySchema }),
    prompt: `You are designing an AEO (AI Engine Optimization) audit for the brand "${brand}" in the "${category}" category. ${competitorHint}

Generate 8-10 buyer-style queries a real shopper would type into ChatGPT, Gemini, or Claude when researching this category. Mix:
- top-N requests ("best X for Y", "top 5 X under $50")
- comparison queries ("X vs Y for Z need")
- need-based queries ("what should I buy if I have <constraint>")
- recommendation queries ("which X do experts recommend")

Do NOT mention "${brand}" inside the query text. The queries should be neutral discovery questions, not branded ones. Keep each under 140 characters.`,
  });

  return output.queries;
}
