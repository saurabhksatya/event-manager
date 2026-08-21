import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = session.user.role === "admin";
  try {
    if (admin) {
      const events = await prisma.event.findMany({
        orderBy: { date: "asc" },
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          _count: { select: { registrations: true } },
        },
      });
      return NextResponse.json(events);
    }
    const events = await prisma.event.findMany({
      where: { isActive: true },
      orderBy: { date: "asc" },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        _count: { select: { registrations: true } },
      },
    });
    return NextResponse.json(events);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden — organizers only" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { title, description, date, location } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: "title and date are required" },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description ?? null,
        date: new Date(date),
        location: location ?? null,
        organizerId: session.user.id,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
