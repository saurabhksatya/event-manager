import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AttendeeSidebar from "./AttendeeSidebar";

export default async function AttendeeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f6f8fc]">
      <AttendeeSidebar user={session.user} />
      <main className="flex-1 md:ml-60 p-4 sm:p-6 md:p-8 min-h-screen w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
