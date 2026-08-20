/**
 * GET /api/registrations/[id] — get my registration with current QR token
 * POST /api/registrations/[id]/refresh-token — rotate QR token (attendee only)
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: {
          select: { id: true, title: true, date: true, location: true },
        },
        user: { select: { id: true, name: true, email: true } },
        checkIn: true,
      },
    });

    if (!registration) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only owner or organizer can view
    const isOwner = registration.userId === session.user.id;
    const isOrganizer = session.user.role === "admin";
    if (!isOwner && !isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(registration);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch registration" }, { status: 500 });
  }
}
