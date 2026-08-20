/**
 * GET /api/events/[id]/stream
 *
 * Server-Sent Events (SSE) stream for the live dashboard.
 * Polls the database every 3 seconds and pushes real-time analytics & check-in updates.
 * Client auto-reconnects on disconnect (SSE spec handles this).
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const poll = async () => {
        if (closed) return;
        try {
          const [event, allCheckIns] = await Promise.all([
            prisma.event.findUnique({
              where: { id: eventId },
              select: {
                id: true,
                title: true,
                registeredCount: true,
                isActive: true,
                isRegistrationOpen: true,
              },
            }),
            prisma.checkIn.findMany({
              where: { registration: { eventId } },
              orderBy: { checkedInAt: "desc" },
              include: {
                registration: {
                  include: {
                    user: { select: { id: true, name: true, email: true, image: true } },
                  },
                },
              },
            }),
          ]);

          if (!event) {
            send({ type: "error", error: "Event not found" });
            return;
          }

          const checkedInCount = allCheckIns.length;
          const registeredCount = event.registeredCount;
          const noShowCount = Math.max(0, registeredCount - checkedInCount);
          const checkInRate = registeredCount > 0 ? Math.round((checkedInCount / registeredCount) * 100) : 0;
          const noShowRate = registeredCount > 0 ? Math.round((noShowCount / registeredCount) * 100) : 0;

          // Compute hourly check-in distribution
          const byHour: Record<string, number> = {};
          for (const ci of allCheckIns) {
            const h = new Intl.DateTimeFormat("en-US", {
              hour: "2-digit",
              hour12: true,
            }).format(ci.checkedInAt);
            byHour[h] = (byHour[h] ?? 0) + 1;
          }

          const checkInsByHour = Object.entries(byHour).map(([hour, count]) => ({
            hour,
            count,
          }));
          const peakHour = checkInsByHour.sort((a, b) => b.count - a.count)[0]?.hour ?? null;

          send({
            type: "update",
            event,
            checkedInCount,
            recentCheckIns: allCheckIns.slice(0, 50),
            analytics: {
              registeredCount,
              checkedInCount,
              noShowCount,
              checkInRate,
              noShowRate,
              peakHour,
              checkInsByHour,
            },
          });
        } catch (err) {
          console.error("[SSE poll]", err);
        }

        if (!closed) setTimeout(poll, 3000);
      };

      // Send initial data immediately
      await poll();
    },
    cancel() {
      // stream closed by client
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
