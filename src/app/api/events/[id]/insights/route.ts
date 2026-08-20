/**
 * POST /api/events/[id]/insights
 *
 * Computes real DB stats for the event, then sends them + the user's question
 * to Gemini. The AI only explains/summarizes data we already computed.
 * Falls back to raw stats if AI is unavailable.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { queryEventInsights, type EventStats } from "@/lib/ai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { question } = await req.json();
  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  try {
    // Compute real stats from DB
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true, date: true, registeredCount: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const checkIns = await prisma.checkIn.findMany({
      where: { registration: { eventId } },
      select: { checkedInAt: true },
    });

    const checkedIn = checkIns.length;
    const totalRegistered = event.registeredCount;
    const notCheckedIn = totalRegistered - checkedIn;
    const noShowPct = totalRegistered > 0 ? (notCheckedIn / totalRegistered) * 100 : 0;

    // Build check-ins by hour for peak analysis
    const byHour: Record<string, number> = {};
    for (const ci of checkIns) {
      const h = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        hour12: true,
      }).format(ci.checkedInAt);
      byHour[h] = (byHour[h] ?? 0) + 1;
    }
    const checkInsByHour = Object.entries(byHour)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count);

    const peakHour = checkInsByHour[0]?.hour ?? null;

    const stats: EventStats = {
      eventTitle: event.title,
      eventDate: event.date.toISOString(),
      totalRegistered,
      checkedIn,
      notCheckedIn,
      noShowPct,
      peakHour,
      checkInsByHour,
    };

    const { answer, isAi } = await queryEventInsights(question, stats);

    return NextResponse.json({ answer, isAi, stats });
  } catch (err) {
    console.error("[insights]", err);
    return NextResponse.json({ error: "Insights unavailable" }, { status: 500 });
  }
}
