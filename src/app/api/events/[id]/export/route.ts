/**
 * GET /api/events/[id]/export
 * Returns a CSV of all registrations + check-in timestamps.
 * Organizer only.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    });
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const registrations = await prisma.registration.findMany({
      where: { eventId },
      include: {
        user: { select: { name: true, email: true } },
        checkIn: true,
      },
      orderBy: { registeredAt: "asc" },
    });

    const rows = [
      [
        "Name",
        "Email",
        "Check-in Status",
        "Registered At",
        "Checked In At",
        "Station",
      ].join(","),
      ...registrations.map((r) =>
        [
          `"${r.user.name}"`,
          `"${r.user.email}"`,
          r.checkIn ? "Checked In" : "Not Checked In",
          r.registeredAt.toISOString(),
          r.checkIn ? r.checkIn.checkedInAt.toISOString() : "",
          r.checkIn?.stationId ?? "",
        ].join(","),
      ),
    ];

    const csv = rows.join("\n");
    const filename = `${event.title.replace(/\s+/g, "-")}-attendees.csv`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
