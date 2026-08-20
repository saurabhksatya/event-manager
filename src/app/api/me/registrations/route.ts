/**
 * GET /api/me/registrations
 * Returns all registrations for the currently logged-in user.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: session.user.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            registeredCount: true,
          },
        },
        checkIn: true,
      },
      orderBy: { registeredAt: "desc" },
    });
    return NextResponse.json(registrations);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 },
    );
  }
}
