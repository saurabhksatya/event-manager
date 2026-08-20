import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OrganizerSidebar from "./OrganizerSidebar";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  if (session.user.role !== "admin") redirect("/attendee/events");

  return (
    <div className="flex min-h-screen">
      <OrganizerSidebar user={session.user} />
      <main className="flex-1 md:ml-60 p-6 md:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
