/**
 * AI Insights library — wraps Vercel AI SDK with Google Gemini.
 * All DB stats are computed by the caller and injected as context.
 * The AI is instructed NEVER to invent numbers — only explain provided data.
 * Falls back to formatted raw stats if the AI call fails or times out.
 */

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import env from "./env";

export interface EventStats {
  eventTitle: string;
  eventDate: string;
  totalRegistered: number;
  checkedIn: number;
  notCheckedIn: number;
  noShowPct: number;
  peakHour: string | null;
  checkInsByHour: { hour: string; count: number }[];
}

function formatFallback(stats: EventStats): string {
  return [
    `📊 Live Stats for "${stats.eventTitle}"`,
    `• Registered: ${stats.totalRegistered}`,
    `• Checked in: ${stats.checkedIn}`,
    `• Not checked in: ${stats.notCheckedIn}`,
    `• No-show rate: ${stats.noShowPct.toFixed(1)}%`,
    stats.peakHour ? `• Peak check-in hour: ${stats.peakHour}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function queryEventInsights(
  question: string,
  stats: EventStats,
): Promise<{ answer: string; isAi: boolean }> {
  const systemPrompt = `You are an event analytics assistant. You ONLY reference the data provided below — never invent, guess, or extrapolate numbers.

LIVE EVENT DATA:
${JSON.stringify(stats, null, 2)}

Rules:
- Answer only using the numbers above.
- Be concise (2-4 sentences max).
- If the question cannot be answered from the data, say so clearly.
- Do not mention that you received data in a prompt.`;

  try {
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });

    const result = await Promise.race([
      generateText({
        model: google("gemini-3.5-flash-lite"),
        system: systemPrompt,
        prompt: question,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), 10000),
      ),
    ]);

    return {
      answer: (result as Awaited<ReturnType<typeof generateText>>).text,
      isAi: true,
    };
  } catch (err) {
    console.error("[AI Insights] Falling back to raw stats:", err);
    return { answer: formatFallback(stats), isAi: false };
  }
}
