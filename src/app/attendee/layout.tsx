import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AttendeeSidebar from "./AttendeeSidebar";

export default async function AttendeeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  return (
    <div className="flex min-h-screen">
      <AttendeeSidebar user={session.user} />
      <main className="flex-1 md:ml-60 p-6 md:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
