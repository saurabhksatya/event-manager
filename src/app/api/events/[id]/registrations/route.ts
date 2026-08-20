/**
 * GET /api/events/[id]/registrations
 * Returns all registrations for the event — organizer only.
 * Attendee can use GET /api/registrations/[id] for their own.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

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

  try {
    const registrations = await prisma.registration.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        checkIn: true,
      },
      orderBy: { registeredAt: "asc" },
    });
    return NextResponse.json(registrations);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 500 });
  }
}
