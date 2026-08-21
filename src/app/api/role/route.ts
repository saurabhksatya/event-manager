import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/dist/server/request/headers";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  if (session.user.role === "admin") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "user" },
    });
  } else {
    await prisma.registration.deleteMany({
      where: { userId: session.user.id },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "admin" },
    });
  }

  return new Response(
    JSON.stringify({ message: "Role changed successfully" }),
    {
      status: 200,
    },
  );
}
