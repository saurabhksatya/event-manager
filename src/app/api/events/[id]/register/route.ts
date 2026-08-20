/**
 * POST /api/events/[id]/register
 *
 * Atomically registers an attendee, enforcing capacity.
 *
 * Strategy:
 *   1. Inside a serializable transaction, fetch the event row and lock it.
 *   2. Check registeredCount < capacity — if not, reject.
 *   3. Create the Registration and increment registeredCount atomically.
 *
 * This is correct even under 500 concurrent requests hitting multiple
 * server processes, because the database serializes the UPDATE.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { generateQrToken } from "@/lib/qr";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Lock the event row to serialize registrations across processes
        const event = await tx.$queryRaw<
          { id: string; registeredCount: number; isActive: boolean; isRegistrationOpen: boolean }[]
        >`SELECT id, "registeredCount", "isActive", "isRegistrationOpen" FROM event WHERE id = ${eventId} FOR UPDATE`;

        if (!event.length) throw new Error("EVENT_NOT_FOUND");
        const ev = event[0];
        if (!ev.isActive) throw new Error("EVENT_INACTIVE");
        if (!ev.isRegistrationOpen) throw new Error("REGISTRATION_CLOSED");

        // Check for existing registration
        const existing = await tx.registration.findUnique({
          where: { eventId_userId: { eventId, userId } },
        });
        if (existing) throw new Error("ALREADY_REGISTERED");

        const { qrToken, qrTokenExpiresAt } = generateQrToken();

        const registration = await tx.registration.create({
          data: {
            eventId,
            userId,
            qrToken,
            qrTokenExpiresAt,
          },
        });

        // Atomically increment registeredCount
        await tx.$executeRaw`
          UPDATE event SET "registeredCount" = "registeredCount" + 1 WHERE id = ${eventId}
        `;

        return registration;
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "EVENT_NOT_FOUND") return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (msg === "EVENT_INACTIVE") return NextResponse.json({ error: "Event is disabled" }, { status: 400 });
    if (msg === "REGISTRATION_CLOSED") return NextResponse.json({ error: "Registration is closed for this event" }, { status: 400 });
    if (msg === "ALREADY_REGISTERED") return NextResponse.json({ error: "Already registered" }, { status: 409 });
    console.error("[register]", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
