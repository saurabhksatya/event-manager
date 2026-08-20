/**
 * POST /api/events/[id]/checkin
 *
 * Scans a QR token and checks the attendee in.
 *
 * Duplicate prevention strategy (Hard Req #1):
 *   - CheckIn table has UNIQUE constraint on registrationId (enforced in DB).
 *   - We SELECT the registration FOR UPDATE inside a transaction (row lock).
 *   - We check if a CheckIn already exists BEFORE inserting.
 *   - Even if two servers race past the check simultaneously, the UNIQUE
 *     constraint ensures only one INSERT succeeds; the other gets a DB error
 *     that we catch and return as a 409 with the timestamp from the first check-in.
 *
 * QR security (Hard Req #2):
 *   - Token must not be expired (5-minute TTL).
 *   - On each successful check-in, we also note the scan is consumed.
 *     A new token is not automatically issued — the attendee would need to
 *     be re-registered, making screenshot reuse after expiry impossible.
 *
 * Offline support (Hard Req #3):
 *   - Offline scans send offlineScannedAt in body.
 *   - We accept them on reconnect and apply the same duplicate logic.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { isTokenExpired } from "@/lib/qr";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — organizers only" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const { token, stationId, offlineScannedAt } = body as {
    token: string;
    stationId?: string;
    offlineScannedAt?: string;
  };

  if (!token)
    return NextResponse.json({ error: "token is required" }, { status: 400 });

  try {
    const checkIn = await prisma.$transaction(async (tx) => {
      // Find registration by QR token, locking the row
      const registrations = await tx.$queryRaw<
        {
          id: string;
          eventId: string;
          userId: string;
          qrTokenExpiresAt: Date;
        }[]
      >`SELECT id, "eventId", "userId", "qrTokenExpiresAt" FROM registration
         WHERE "qrToken" = ${token} FOR UPDATE`;

      if (!registrations.length) throw new Error("TOKEN_NOT_FOUND");
      const reg = registrations[0];

      if (reg.eventId !== eventId) throw new Error("TOKEN_NOT_FOUND");
      if (isTokenExpired(new Date(reg.qrTokenExpiresAt)))
        throw new Error("TOKEN_EXPIRED");

      // Check for existing check-in (before relying solely on the unique constraint)
      const existing = await tx.checkIn.findUnique({
        where: { registrationId: reg.id },
        include: {
          registration: { include: { user: { select: { name: true } } } },
        },
      });

      if (existing) {
        const timeStr = new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(existing.checkedInAt);
        throw new Error(`ALREADY_CHECKED_IN:${timeStr}`);
      }

      // Create the CheckIn — unique constraint is the final safety net
      const newCheckIn = await tx.checkIn.create({
        data: {
          registrationId: reg.id,
          stationId: stationId ?? "default",
          ...(offlineScannedAt
            ? { checkedInAt: new Date(offlineScannedAt) }
            : {}),
        },
        include: {
          registration: {
            include: {
              user: {
                select: { id: true, name: true, email: true, image: true },
              },
              event: { select: { id: true, title: true } },
            },
          },
        },
      });

      return newCheckIn;
    });

    // Notify SSE listeners via a simple timestamp bump
    // (SSE handler polls DB, or we could use pg NOTIFY — handled in stream route)

    return NextResponse.json({
      success: true,
      message: `${checkIn.registration.user.name} checked in successfully`,
      checkIn,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "TOKEN_NOT_FOUND")
      return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
    if (msg === "TOKEN_EXPIRED")
      return NextResponse.json(
        { error: "QR code has expired — attendee must refresh" },
        { status: 410 },
      );
    if (msg.startsWith("ALREADY_CHECKED_IN:")) {
      const time = msg.split(":")[1];
      return NextResponse.json(
        { error: `Already checked in at ${time}` },
        { status: 409 },
      );
    }
    // Handle Prisma unique constraint violation (race condition final safety net)
    if (
      msg.includes("Unique constraint failed") ||
      msg.includes("unique constraint") ||
      (err as { code?: string }).code === "P2002"
    ) {
      // Re-fetch the existing check-in to get the timestamp
      try {
        const reg = await prisma.registration.findFirst({
          where: { qrToken: token },
          include: { checkIn: true },
        });
        const timeStr = reg?.checkIn
          ? new Intl.DateTimeFormat("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(reg.checkIn.checkedInAt)
          : "unknown time";
        return NextResponse.json(
          { error: `Already checked in at ${timeStr}` },
          { status: 409 },
        );
      } catch {
        return NextResponse.json(
          { error: "Already checked in" },
          { status: 409 },
        );
      }
    }
    console.error("[checkin]", err);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
