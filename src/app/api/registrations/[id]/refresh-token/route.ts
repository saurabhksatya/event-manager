/**
 * POST /api/registrations/[id]/refresh-token
 *
 * Rotates the QR token for a registration (attendee must be online).
 * This is the key QR security mechanism: tokens expire after 5 minutes,
 * so a screenshot sent to a friend becomes useless once the token rotates.
 *
 * Tradeoff: The attendee's phone must be online and load the QR page to
 * get a valid token. An offline attendee with a stale screenshot will be
 * rejected at the door. In practice, venues have WiFi — this is the
 * intended tradeoff for improved security.
 *
 * Already-checked-in registrations cannot get a new token (no point).
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
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { checkIn: true },
    });

    if (!registration) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (registration.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (registration.checkIn) {
      return NextResponse.json(
        { error: "Already checked in — token rotation not needed" },
        { status: 409 }
      );
    }

    const { qrToken, qrTokenExpiresAt } = generateQrToken();

    const updated = await prisma.registration.update({
      where: { id },
      data: { qrToken, qrTokenExpiresAt },
    });

    return NextResponse.json({
      qrToken: updated.qrToken,
      qrTokenExpiresAt: updated.qrTokenExpiresAt,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}
